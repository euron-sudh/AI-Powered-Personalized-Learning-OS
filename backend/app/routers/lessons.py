import asyncio
import json
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session, get_db_session
from app.core.rate_limiter import limiter
from app.dependencies import get_current_user
from app.models.chapter import Chapter
from app.models.chat_message import ChatMessage
from app.models.student import Student
from app.models.subject import Subject
from app.models.sentiment_log import SentimentLog
from app.schemas.lesson import ChatRequest
from app.services.curriculum_generator import generate_chapter_content, generate_activities
from app.models.activity import Activity

router = APIRouter()

# Track chapters currently being generated to prevent duplicate parallel requests
_generating: set[str] = set()


async def _generate_content_bg(chapter_id: uuid.UUID, student_id: uuid.UUID) -> None:
    """Background task: generate chapter content and persist it."""
    key = str(chapter_id)
    try:
        async with async_session() as db:
            chapter = await db.get(Chapter, chapter_id)
            if not chapter:
                return
            existing = chapter.content_json or {}
            if existing.get("key_concepts") and existing.get("summary"):
                return  # Already fully generated

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

            chapter.content_json = content_data
            chapter.status = "in_progress"
            await db.commit()

            # Kick off activity generation (non-critical)
            asyncio.create_task(_generate_activity_bg(
                chapter_id,
                {**content_data, "title": chapter.title},
                subject.name if subject else "General",
                student.grade if student else "8",
                student.board if student else None,
            ))
    except Exception as exc:
        import traceback
        print(f"[content-gen ERROR] chapter={chapter_id}: {exc}")
        traceback.print_exc()
    finally:
        _generating.discard(key)


async def _generate_activity_bg(
    chapter_id: uuid.UUID,
    content_data: dict,
    subject_name: str,
    grade: str,
    board: str | None,
) -> None:
    """Background task: generate and persist an activity after content is returned."""
    async with async_session() as db:
        result = await db.execute(
            select(Activity).where(Activity.chapter_id == chapter_id)
        )
        if result.scalars().first():
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
            pass


@router.get("/{chapter_id}/content")
async def get_lesson_content(
    chapter_id: str,
    background_tasks: BackgroundTasks,
    response: Response,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get or generate chapter content (text, diagrams, formulas)."""
    try:
        chapter_uuid = uuid.UUID(chapter_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Chapter '{chapter_id}' not found")

    chapter = await db.get(Chapter, chapter_uuid)
    if not chapter:
        raise HTTPException(status_code=404, detail=f"Chapter '{chapter_id}' not found")

    content = chapter.content_json or {}
    if content.get("key_concepts") and content.get("summary"):
        response.headers["Cache-Control"] = "private, max-age=3600"
        return {
            "status": "ready",
            "chapter_id": chapter_id,
            "title": chapter.title,
            "description": chapter.description,
            **content,
        }

    # Kick off generation if content is missing
    key = str(chapter_uuid)
    if key not in _generating:
        _generating.add(key)
        student_id = uuid.UUID(user["sub"])
        background_tasks.add_task(_generate_content_bg, chapter_uuid, student_id)

    return JSONResponse(
        status_code=202,
        content={
            "status": "generating",
            "chapter_id": chapter_id,
            "title": chapter.title,
            "description": chapter.description or "",
            "key_concepts": content.get("key_concepts", []),
            "summary": content.get("summary", ""),
        },
    )


@router.post("/{chapter_id}/chat")
@limiter.limit("30/minute")
async def teaching_chat(
    request: Request,
    chapter_id: str,
    data: ChatRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Streaming teaching chat via SSE."""
    from app.services.teaching_engine import stream_teaching_response

    student_id = uuid.UUID(user["sub"])
    try:
        chapter_uuid = uuid.UUID(chapter_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Do all DB work up-front in a short-lived session that closes before streaming starts
    emotion_to_use = data.emotion
    confidence_to_use = data.confidence

    async with async_session() as db:
        chapter = await db.get(Chapter, chapter_uuid)
        if not chapter:
            raise HTTPException(status_code=404, detail="Chapter not found")

        student = await db.get(Student, student_id)
        subject = await db.get(Subject, chapter.subject_id)

        # Snapshot values needed for streaming (avoid holding session open)
        chapter_content = dict(chapter.content_json) if chapter.content_json else {}
        # Always ensure title/description are present even if full content hasn't been generated yet
        chapter_content.setdefault("title", chapter.title)
        chapter_content.setdefault("description", chapter.description or "")
        student_grade = student.grade if student else "8"
        student_background = student.background if student else None
        student_board = student.board if student else None
        subject_name = subject.name if subject else None

        # Auto-inject emotion if not provided by client — query recent sentiment log
        if emotion_to_use is None:
            cutoff_time = datetime.utcnow() - timedelta(seconds=60)
            result = await db.execute(
                select(SentimentLog)
                .where(
                    SentimentLog.student_id == student_id,
                    SentimentLog.chapter_id == chapter_uuid,
                    SentimentLog.timestamp >= cutoff_time,
                )
                .order_by(SentimentLog.timestamp.desc())
                .limit(1)
            )
            recent_log = result.scalar_one_or_none()
            if recent_log and recent_log.confidence >= 0.6:
                emotion_to_use = recent_log.emotion
                confidence_to_use = recent_log.confidence

        # Persist the student's message
        db.add(ChatMessage(
            chapter_id=chapter_uuid,
            student_id=student_id,
            role="student",
            content=data.message,
        ))
        await db.commit()

    # DB session is now closed — stream can begin without holding a connection
    full_response_parts: list[str] = []

    async def _persist_tutor_msg(content: str) -> None:
        """Persist tutor message after streaming completes (Legacy only)."""
        if not chapter_uuid:
            return
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
                chapter_content=chapter_content,
                student_message=data.message,
                conversation_history=data.conversation_history,
                student_grade=student_grade,
                student_background=student_background,
                board=student_board,
                subject_name=subject_name,
                emotion=emotion_to_use,
                confidence=confidence_to_use,
            ):
                full_response_parts.append(chunk)
                yield f"data: {json.dumps({'text': chunk})}\n\n"

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
