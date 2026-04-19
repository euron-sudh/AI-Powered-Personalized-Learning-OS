import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models.session import Session
from app.models.concept import Concept
from app.models.chapter import Chapter
from app.services.session_service import SessionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionStartRequest:
    def __init__(self, subject_id: str, chapter_id: str):
        self.subject_id = uuid.UUID(subject_id)
        self.chapter_id = uuid.UUID(chapter_id)


class SessionStepRequest:
    def __init__(self, concept_id: str, user_answer: str, time_taken_seconds: float):
        self.concept_id = uuid.UUID(concept_id)
        self.user_answer = user_answer
        self.time_taken_seconds = time_taken_seconds


@router.post("/start")
async def start_session(
    subject_id: str,
    chapter_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Start a new session and return the first concept + MCQ."""
    try:
        user_id = uuid.UUID(user["sub"])
        subject_id_uuid = uuid.UUID(subject_id)
        chapter_id_uuid = uuid.UUID(chapter_id)

        service = SessionService(db)
        session = await service.start_session(user_id, subject_id_uuid, chapter_id_uuid)

        # Get first concept (by order_index ASC)
        from sqlalchemy import select
        stmt = select(Concept).where(
            Concept.chapter_id == chapter_id_uuid
        ).order_by(Concept.order_index.asc()).limit(1)
        result = await db.execute(stmt)
        concept = result.scalar_one_or_none()

        if not concept:
            raise HTTPException(status_code=404, detail="No concepts found in chapter")

        # Get chapter title for context
        chapter = await db.get(Chapter, chapter_id_uuid)
        chapter_title = chapter.title if chapter else "Unknown"

        return {
            "session_id": str(session.id),
            "chapter_title": chapter_title,
            "step": 1,
            "concept": {
                "id": str(concept.id),
                "title": concept.title,
                "explanation": concept.explanation or "No explanation available",
                "order_index": concept.order_index,
            },
            "question": {
                "prompt": concept.question or "What have you learned?",
                "options": concept.options or ["Option A", "Option B", "Option C", "Option D"],
                "type": "multiple_choice",
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {str(e)}")
    except Exception as e:
        logger.error(f"Error starting session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/step")
async def record_step(
    session_id: str,
    concept_id: str,
    user_answer: str,
    time_taken_seconds: float,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Record a step answer and return feedback + next concept or session end."""
    try:
        session_id_uuid = uuid.UUID(session_id)
        concept_id_uuid = uuid.UUID(concept_id)
        user_id = uuid.UUID(user["sub"])

        # Get the session and concept
        session = await db.get(Session, session_id_uuid)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        concept = await db.get(Concept, concept_id_uuid)
        if not concept:
            raise HTTPException(status_code=404, detail="Concept not found")

        service = SessionService(db)

        # Check if answer is correct
        is_correct = user_answer.strip().lower() == concept.correct_answer.strip().lower() if concept.correct_answer else False

        # Record the step
        await service.record_step(
            session_id=session_id_uuid,
            concept_id=concept_id_uuid,
            question=concept.question or "Question",
            correct_answer=concept.correct_answer or "",
            user_answer=user_answer,
            is_correct=is_correct,
            difficulty=concept.difficulty_level,
            time_taken=int(time_taken_seconds),
            options=concept.options,
        )

        # Get next concept
        from sqlalchemy import select
        next_stmt = select(Concept).where(
            Concept.chapter_id == concept.chapter_id,
            Concept.order_index > concept.order_index,
        ).order_by(Concept.order_index.asc()).limit(1)
        result = await db.execute(next_stmt)
        next_concept = result.scalar_one_or_none()

        # Commit before returning
        await db.commit()

        feedback = {
            "is_correct": is_correct,
            "correct_answer": concept.correct_answer or "",
            "explanation": concept.explanation or "No explanation available",
            "xp_earned": 10 if is_correct else 5,
        }

        if next_concept:
            feedback["next"] = {
                "concept": {
                    "id": str(next_concept.id),
                    "title": next_concept.title,
                    "explanation": next_concept.explanation or "",
                    "order_index": next_concept.order_index,
                },
                "question": {
                    "prompt": next_concept.question or "What have you learned?",
                    "options": next_concept.options or ["Option A", "Option B", "Option C", "Option D"],
                    "type": "multiple_choice",
                },
            }
        else:
            feedback["next"] = None  # Session complete

        return feedback
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {str(e)}")
    except Exception as e:
        await db.rollback()
        logger.error(f"Error recording step: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/end")
async def end_session(
    session_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """End a session and return summary with XP, streak, and next recommendation."""
    try:
        from sqlalchemy import select

        session_id_uuid = uuid.UUID(session_id)
        user_id = uuid.UUID(user["sub"])

        session = await db.get(Session, session_id_uuid)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Count steps to calculate XP (10 per correct, 5 per incorrect)
        steps_stmt = select(SessionStep).where(SessionStep.session_id == session_id_uuid)
        steps_result = await db.execute(steps_stmt)
        steps = steps_result.scalars().all()

        total_xp = sum(10 if step.is_correct else 5 for step in steps)
        step_count = len(steps)

        service = SessionService(db)

        # End session
        await service.end_session(session_id_uuid, total_xp)

        # Fetch updated stats
        from app.models.mastery import UserGlobalStats
        stats_stmt = select(UserGlobalStats).where(UserGlobalStats.user_id == user_id)
        stats_result = await db.execute(stats_stmt)
        stats = stats_result.scalar_one_or_none()

        # Get next recommendation
        # NOTE: learning_os (SQLite engine) removed - adaptive scheduling no longer available
        # from app.learning_os.service import AdaptiveLearningService
        # from app.learning_os.storage import AdaptiveStorage
        # adaptive_service = AdaptiveLearningService(AdaptiveStorage(db))
        # workspace = await adaptive_service.get_workspace(str(user_id))

        next_rec = None
        # if workspace and workspace.get("today_plan"):
        #     first = workspace["today_plan"][0]
        #     next_rec = {...}

        await db.commit()

        return {
            "total_steps": step_count,
            "xp_earned": total_xp,
            "total_xp": stats.total_xp if stats else 0,
            "new_level": stats.current_level if stats else 1,
            "streak_days": stats.streak_days if stats else 0,
            "coach_next": next_rec,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID: {str(e)}")
    except Exception as e:
        await db.rollback()
        logger.error(f"Error ending session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
