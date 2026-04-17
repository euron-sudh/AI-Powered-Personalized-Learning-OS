import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models.progress import StudentProgress
from app.models.subject import Subject
from app.models.sentiment_log import SentimentLog
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


@router.get("/today-focus", response_model=dict)
async def get_today_focus(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get AI-prioritized learning focus for today (primary + secondary topics)."""
    student_uuid = uuid.UUID(user["sub"])

    result = await db.execute(
        select(StudentProgress, Subject)
        .join(Subject, StudentProgress.subject_id == Subject.id)
        .where(StudentProgress.student_id == student_uuid)
    )
    rows = result.all()

    topics = []
    for progress, subject in rows:
        score = progress.average_score or 0
        weaknesses = progress.weaknesses or []
        is_weak = len(weaknesses) > 0 or score < 50

        sentiment_result = await db.execute(
            select(SentimentLog.emotion)
            .where(SentimentLog.student_id == student_uuid)
            .order_by(desc(SentimentLog.timestamp))
            .limit(5)
        )
        recent_sentiments = [row[0] for row in sentiment_result.fetchall()]
        frustration_detected = any(
            s in ["frustrated", "confused"] for s in recent_sentiments
        )

        priority = 3
        if is_weak:
            priority = 0
        elif score < 50:
            priority = 1
        elif score < 70:
            priority = 2

        if frustration_detected:
            priority = max(priority - 1, 0)

        if progress.last_active_at:
            days_inactive = (datetime.utcnow() - progress.last_active_at).days
            if days_inactive > 3:
                priority = max(priority - 1, 0)

        if frustration_detected:
            duration = 10
        elif score < 50:
            duration = 20
        else:
            duration = 15

        topics.append({
            "id": str(subject.id),
            "title": subject.name,
            "status": "weak" if is_weak else "improving",
            "score": round(score),
            "duration": duration,
            "priority": priority,
        })

    topics.sort(key=lambda x: x["priority"])

    primary = topics[0] if topics else None
    secondary = topics[1:3] if len(topics) > 1 else []

    return {
        "primary": primary,
        "secondary": secondary,
    }
