import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models.chapter import Chapter
from app.models.subject import Subject

router = APIRouter()

@router.get("/next")
async def get_next_learning_node(
    subject_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Return the next logical chapter for the student (first incomplete chapter)."""
    student_id = uuid.UUID(user["sub"])

    try:
        # Get first incomplete subject (or all if subject_id provided)
        if subject_id:
            subj_uuid = uuid.UUID(subject_id)
            result = await db.execute(
                select(Subject).where(
                    Subject.id == subj_uuid,
                    Subject.student_id == student_id,
                ).limit(1)
            )
            subjects = [result.scalar_one_or_none()]
            if not subjects[0]:
                raise HTTPException(status_code=404, detail="Subject not found")
        else:
            result = await db.execute(
                select(Subject).where(Subject.student_id == student_id)
            )
            subjects = result.scalars().all()

        if not subjects:
            raise HTTPException(status_code=404, detail="No subjects found. Please complete onboarding.")

        # Find first incomplete chapter across subjects
        for subject in subjects:
            chapters_result = await db.execute(
                select(Chapter).where(
                    Chapter.subject_id == subject.id,
                    Chapter.status.in_(["available", "in_progress"])
                ).order_by(Chapter.order_index)
            )
            chapters = chapters_result.scalars().all()

            if chapters:
                chapter = chapters[0]
                return {
                    "subjectId": str(subject.id),
                    "chapterId": str(chapter.id),
                    "topic": chapter.title,
                    "isNewUser": False
                }

        # All chapters done — return first chapter of first subject
        return {
            "subjectId": str(subjects[0].id),
            "chapterId": str(subjects[0]),  # Placeholder
            "topic": "All chapters completed!",
            "isNewUser": False
        }
    except Exception as e:
        import traceback
        print(f"[ERROR] Failed to fetch next node: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to calculate next learning step")
