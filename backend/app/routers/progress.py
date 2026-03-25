import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models.progress import StudentProgress
from app.models.subject import Subject
from app.schemas.progress import ProgressResponse, SubjectProgress

router = APIRouter()


@router.get("/{student_id}", response_model=ProgressResponse)
async def get_progress(
    student_id: str,
    response: Response,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get student progress and analytics."""
    # Students can only access their own progress
    if user["sub"] != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    student_uuid = uuid.UUID(student_id)

    result = await db.execute(
        select(StudentProgress, Subject)
        .join(Subject, StudentProgress.subject_id == Subject.id)
        .where(StudentProgress.student_id == student_uuid)
    )
    rows = result.all()

    subjects = []
    for progress, subject in rows:
        subjects.append(
            SubjectProgress(
                subject_id=str(subject.id),
                subject_name=subject.name,
                chapters_completed=progress.chapters_completed,
                total_chapters=progress.total_chapters,
                average_score=progress.average_score,
                strengths=progress.strengths or [],
                weaknesses=progress.weaknesses or [],
            )
        )

    response.headers["Cache-Control"] = "private, max-age=30"
    return ProgressResponse(student_id=student_id, subjects=subjects)
