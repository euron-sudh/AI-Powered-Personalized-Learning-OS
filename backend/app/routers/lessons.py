import asyncio
import json
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session, get_db_session
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


async def _generate_activity_bg(
    chapter_id: uuid.UUID,
    content_data: dict,
    subject_name: str,
    grade: str,
    board: str | None,
) -> None:
    """Background task: generate and persist an activity after content is returned."""
    async with async_session() as db:
        # Check again in case a concurrent request already created one
        result = await db.execute(
            select(Activity).where(Activity.chapter_id == chapter_id)
        )
        if result.scalar_one_or_none():
            return
        try:
            activity_data = await generate_activities(
                chapter_title=content_data.get("title", ""),
                chapter_content=content_data,
                subject_name=subject_name,
                grade=grade,
                board=board,
            )
            activity = Activity(
                chapter_id=chapter_id,
                type="quiz",
                prompt_json=activity_data,
                status="pending",
            )
            db.add(activity)
            await db.commit()
        except Exception:
            pass  # Non-critical


@router.get("/{chapter_id}/content")
async def get_lesson_content(
    chapter_id: str,
    background_tasks: BackgroundTasks,
    response: Response,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get or generate chapter content (text, diagrams, formulas)."""
    student_id = uuid.UUID(user["sub"])
    chapter_uuid = uuid.UUID(chapter_id)

    chapter = await db.get(Chapter, chapter_uuid)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Return cached content immediately — no AI call needed
    if chapter.content_json:
        response.headers["Cache-Control"] = "private, max-age=3600"
        return {
            "chapter_id": chapter_id,
            "title": chapter.title,
            "description": chapter.description,
            **chapter.content_json,
        }

    # Fetch student and subject in parallel — saves one DB round-trip
    student, subject = await asyncio.gather(
        db.get(Student, student_id),
        db.get(Subject, chapter.subject_id),
    )

    content_data = await generate_chapter_content(
        chapter_title=chapter.title,
        chapter_description=chapter.description or "",
        subject_name=subject.name if subject else "General",
        grade=student.grade if student else "8",
        student_background=student.background if student else None,
        board=student.board if student else None,
    )

    # Persist generated content and update status
    chapter.content_json = content_data
    chapter.status = "in_progress"
    await db.commit()

    # Generate activity in the background — does NOT block the response
    background_tasks.add_task(
        _generate_activity_bg,
        chapter_uuid,
        {**content_data, "title": chapter.title},
        subject.name if subject else "General",
        student.grade if student else "8",
        student.board if student else None,
    )

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

    # Fetch chapter and student in parallel
    chapter, student = await asyncio.gather(
        db.get(Chapter, chapter_uuid),
        db.get(Student, student_id),
    )
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

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

    async def _persist_tutor_msg(content: str) -> None:
        """Persist tutor message after streaming completes — does not block the SSE response."""
        async with async_session() as bg_db:
            bg_db.add(ChatMessage(
                chapter_id=chapter_uuid,
                student_id=student_id,
                role="tutor",
                content=content,
            ))
            await bg_db.commit()

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

            # Persist tutor message as a background task — does not delay [DONE]
            background_tasks.add_task(_persist_tutor_msg, "".join(full_response_parts))
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
    response: Response,
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
    response.headers["Cache-Control"] = "private, max-age=60"

    return [
        {
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
        }
        for msg in messages
    ]
