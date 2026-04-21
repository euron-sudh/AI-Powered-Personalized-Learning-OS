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
from app.models.mastery import UserSubjectStats, UserGlobalStats, UserConceptMastery, UserChapterProgress
from app.models.concept import Concept
from app.schemas.progress import ProgressResponse, SubjectProgress

router = APIRouter()


@router.get("/weakness-radar", response_model=dict)
async def get_weakness_radar(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Aggregated weakness data for the radar chart on /analytics."""
    from app.services.adaptive import aggregate_weaknesses

    student_id = uuid.UUID(user["sub"])
    return await aggregate_weaknesses(db, student_id)


@router.get("/today-focus", response_model=dict)
async def get_today_focus(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get AI-prioritized learning focus based on mastery levels."""
    student_uuid = uuid.UUID(user["sub"])

    # 1. Fetch subject stats sorted by lowest mastery
    result = await db.execute(
        select(UserSubjectStats, Subject)
        .join(Subject, UserSubjectStats.subject_id == Subject.id)
        .where(UserSubjectStats.user_id == student_uuid)
        .order_by(UserSubjectStats.avg_mastery.asc())
    )
    rows = result.all()

    topics = []
    for stats, subject in rows:
        score = stats.avg_mastery * 100
        
        # Determine priority based on mastery
        priority = 3
        if score < 40:
            priority = 0
        elif score < 60:
            priority = 1
        elif score < 80:
            priority = 2

        topics.append({
            "id": str(subject.id),
            "title": subject.name,
            "status": "critical" if score < 40 else "improving",
            "score": round(score),
            "duration": 20 if score < 60 else 15,
            "priority": priority,
        })

    primary = topics[0] if topics else None
    secondary = topics[1:3] if len(topics) > 1 else []

    return {
        "primary": primary,
        "secondary": secondary,
    }


@router.get("/{student_id}", response_model=ProgressResponse)
async def get_progress(
    student_id: uuid.UUID,
    response: Response,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get student progress and analytics from aggregated stats tables."""
    try:
        if uuid.UUID(str(user["sub"])) != student_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # 1. Get Subject Stats
        result = await db.execute(
            select(Subject, UserSubjectStats, StudentProgress)
            .outerjoin(UserSubjectStats, Subject.id == UserSubjectStats.subject_id)
            .outerjoin(StudentProgress, Subject.id == StudentProgress.subject_id)
            .where(Subject.student_id == student_id)
        )
        rows = result.all()

        subjects_list = []
        for subject, stats, legacy in rows:
            if not subject:
                continue
            
            # Map new stats to response
            subjects_list.append(
                SubjectProgress(
                    subject_id=str(subject.id),
                    subject_name=subject.name,
                    chapters_completed=legacy.chapters_completed if legacy else 0,
                    total_chapters=legacy.total_chapters if legacy else 0,
                    average_score=(stats.avg_mastery * 100) if stats else (legacy.average_score if legacy else None),
                    progress_percent=stats.progress_percent if stats else 0.0,
                    strengths=legacy.strengths if legacy and legacy.strengths else [],
                    weaknesses=legacy.weaknesses if legacy and legacy.weaknesses else [],
                )
            )

        # 2. Get Global Stats
        global_result = await db.execute(
            select(UserGlobalStats).where(UserGlobalStats.user_id == student_id)
        )
        global_stats = global_result.scalar_one_or_none()

        response.headers["Cache-Control"] = "private, max-age=30"
        return ProgressResponse(
            student_id=str(student_id), 
            subjects=subjects_list,
            total_xp=global_stats.total_xp if global_stats else 0,
            current_level=global_stats.current_level if global_stats else 1,
            streak_days=global_stats.streak_days if global_stats else 0
        )
    except Exception as e:
        import traceback
        print(f"[ERROR] get_progress failed: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
