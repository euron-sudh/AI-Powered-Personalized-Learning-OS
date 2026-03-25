import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.rate_limiter import limiter
from app.dependencies import get_current_user
from app.models.chapter import Chapter
from app.models.chat_message import ChatMessage
from app.models.student import Student
from app.models.subject import Subject
from app.schemas.lesson import ChatRequest
from app.services.curriculum_generator import generate_chapter_content, generate_activities
from app.models.activity import Activity

router = APIRouter()


@router.get("/{chapter_id}/content")
async def get_lesson_content(
    chapter_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get or generate chapter content (text, diagrams, formulas)."""
    student_id = uuid.UUID(user["sub"])
    chapter_uuid = uuid.UUID(chapter_id)

    chapter = await db.get(Chapter, chapter_uuid)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Return cached content if already generated
    if chapter.content_json:
        return {
            "chapter_id": chapter_id,
            "title": chapter.title,
            "description": chapter.description,
            **chapter.content_json,
        }

    # Generate content with Claude
    student = await db.get(Student, student_id)
    subject = await db.get(Subject, chapter.subject_id)

    content_data = await generate_chapter_content(
        chapter_title=chapter.title,
        chapter_description=chapter.description or "",
        subject_name=subject.name if subject else "General",
        grade=student.grade if student else "8",
        student_background=student.background if student else None,
        board=student.board if student else None,
    )

    # Cache generated content and update chapter status
    chapter.content_json = content_data
    chapter.status = "in_progress"

    # Auto-generate an activity for this chapter if none exist
    result = await db.execute(
        select(Activity).where(Activity.chapter_id == chapter_uuid)
    )
    existing_activity = result.scalar_one_or_none()

    if not existing_activity and subject:
        try:
            activity_data = await generate_activities(
                chapter_title=chapter.title,
                chapter_content=content_data,
                subject_name=subject.name,
                grade=student.grade if student else "8",
                board=student.board if student else None,
            )
            activity = Activity(
                chapter_id=chapter_uuid,
                type="quiz",
                prompt_json=activity_data,
                status="pending",
            )
            db.add(activity)
        except Exception:
            pass  # Activity generation is non-blocking

    await db.commit()

    return {
        "chapter_id": chapter_id,
        "title": chapter.title,
        "description": chapter.description,
        **content_data,
    }


@router.post("/{chapter_id}/chat")
@limiter.limit("30/minute")
async def teaching_chat(
    request: Request,
    chapter_id: str,
    data: ChatRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Streaming teaching chat via SSE."""
    from app.services.teaching_engine import stream_teaching_response

    student_id = uuid.UUID(user["sub"])
    chapter_uuid = uuid.UUID(chapter_id)

    chapter = await db.get(Chapter, chapter_uuid)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    student = await db.get(Student, student_id)
    subject = await db.get(Subject, chapter.subject_id)

    # Persist the student's message
    student_msg = ChatMessage(
        chapter_id=chapter_uuid,
        student_id=student_id,
        role="student",
        content=data.message,
    )
    db.add(student_msg)
    await db.commit()

    full_response_parts: list[str] = []

    async def event_stream():
        try:
            async for chunk in stream_teaching_response(
                chapter_content=chapter.content_json or {},
                student_message=data.message,
                conversation_history=data.conversation_history,
                student_grade=student.grade if student else "8",
                student_background=student.background if student else None,
                board=student.board if student else None,
                subject_name=subject.name if subject else None,
            ):
                full_response_parts.append(chunk)
                yield f"data: {json.dumps({'text': chunk})}\n\n"

            # Persist the tutor's full response
            tutor_msg = ChatMessage(
                chapter_id=chapter_uuid,
                student_id=student_id,
                role="tutor",
                content="".join(full_response_parts),
            )
            db.add(tutor_msg)
            await db.commit()
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/{chapter_id}/history")
async def get_chat_history(
    chapter_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get chat history for a chapter."""
    student_id = uuid.UUID(user["sub"])
    chapter_uuid = uuid.UUID(chapter_id)

    result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.chapter_id == chapter_uuid,
            ChatMessage.student_id == student_id,
        )
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()

    return [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
        }
        for msg in messages
    ]
