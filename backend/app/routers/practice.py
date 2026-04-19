from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models import Subject, Chapter, Concept

router = APIRouter()

@router.get("/practice/questions")
async def get_practice_questions(
    subject_id: str,
    count: int = 5,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Get practice quiz questions for a subject.
    Fetches concepts with questions and returns them as MCQ format.
    """
    learner_id = user.get("sub")
    if not learner_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # Parse subject_id as UUID if it is one, otherwise treat as string name
        try:
            subject_uuid = UUID(subject_id)
            subject_query = select(Subject).where(Subject.id == subject_uuid)
        except ValueError:
            subject_query = select(Subject).where(Subject.name == subject_id)

        subject_result = await db.execute(subject_query)
        subject = subject_result.scalar_one_or_none()

        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")

        # Get all chapters for this subject
        chapters_query = select(Chapter).where(Chapter.subject_id == subject.id)
        chapters_result = await db.execute(chapters_query)
        chapters = chapters_result.scalars().all()

        if not chapters:
            raise HTTPException(status_code=404, detail="No chapters found for this subject")

        # Get concepts with questions from these chapters
        chapter_ids = [ch.id for ch in chapters]
        concepts_query = (
            select(Concept)
            .where(Concept.chapter_id.in_(chapter_ids))
            .where(Concept.question.isnot(None))
            .where(Concept.correct_answer.isnot(None))
            .limit(count)
        )
        concepts_result = await db.execute(concepts_query)
        concepts = concepts_result.scalars().all()

        if not concepts:
            raise HTTPException(status_code=404, detail="No practice questions available")

        # Format as questions
        questions = [
            {
                "id": str(concept.id),
                "prompt": concept.question,
                "options": concept.options or [],
                "correct_answer": concept.correct_answer,
                "explanation": concept.explanation or "Check the concept explanation for more details.",
            }
            for concept in concepts
        ]

        return {"questions": questions}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] Failed to fetch practice questions: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to fetch practice questions")
