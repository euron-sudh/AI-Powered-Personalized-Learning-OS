import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.dependencies import get_current_user
# NOTE: learning_os (SQLite legacy engine) removed - gamification via direct DB updates
from app.models.activity import Activity, ActivitySubmission
from app.models.chapter import Chapter
from app.models.progress import StudentProgress
from app.models.student import Student
from app.models.subject import Subject
from app.schemas.activity import ActivityEvaluationResponse, ActivitySubmitRequest
from app.services.activity_evaluator import evaluate_submission
from app.services.curriculum_generator import adjust_curriculum_order

router = APIRouter()


@router.get("/{chapter_id}/activity")
async def get_chapter_activity(
    chapter_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get the activity for a chapter. If none exists but content is ready, generates one."""
    from fastapi.responses import JSONResponse
    from app.models.student import Student
    from app.models.subject import Subject
    from app.services.curriculum_generator import generate_activities

    chapter_uuid = uuid.UUID(chapter_id)
    student_id = uuid.UUID(user["sub"])

    result = await db.execute(
        select(Activity).where(Activity.chapter_id == chapter_uuid).limit(1)
    )
    activity = result.scalars().first()

    if not activity:
        # Check if chapter has content — if so, generate activity in background
        chapter = await db.get(Chapter, chapter_uuid)
        if not chapter or not chapter.content_json:
            raise HTTPException(status_code=404, detail="No activity found — open the lesson first to generate content")

        # Trigger activity generation as a background asyncio task
        async def _gen():
            from app.core.database import async_session as _session
            async with _session() as bg_db:
                # Guard: another request may have already created one
                existing = await bg_db.execute(
                    select(Activity).where(Activity.chapter_id == chapter_uuid).limit(1)
                )
                if existing.scalars().first():
                    return
                try:
                    student = await bg_db.get(Student, student_id)
                    subject = await bg_db.get(Subject, chapter.subject_id)
                    content = chapter.content_json or {}
                    activity_data = await generate_activities(
                        chapter_title=chapter.title,
                        chapter_content={**content, "title": chapter.title},
                        subject_name=subject.name if subject else "General",
                        grade=student.grade if student else "8",
                        board=student.board if student else None,
                    )
                    bg_db.add(Activity(
                        chapter_id=chapter_uuid,
                        type="quiz",
                        prompt_json=activity_data,
                        status="pending",
                    ))
                    await bg_db.commit()
                except Exception:
                    pass

        asyncio.create_task(_gen())
        return JSONResponse(status_code=202, content={"status": "generating"})

    # Include latest submission score when the activity has been evaluated
    latest_score = None
    if activity.status == "evaluated":
        student_id = uuid.UUID(user["sub"])
        score_result = await db.execute(
            select(ActivitySubmission.score)
            .where(
                ActivitySubmission.activity_id == activity.id,
                ActivitySubmission.student_id == student_id,
            )
            .order_by(desc(ActivitySubmission.submitted_at))
            .limit(1)
        )
        latest_score = score_result.scalar_one_or_none()

    return {
        "activity_id": str(activity.id),
        "type": activity.type,
        "status": activity.status,
        "latest_score": latest_score,
        "prompt": activity.prompt_json,
    }


@router.post("/{activity_id}/submit")
async def submit_activity(
    activity_id: str,
    data: ActivitySubmitRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Submit student response for an activity."""
    student_id = uuid.UUID(user["sub"])
    activity_uuid = uuid.UUID(activity_id)

    activity = await db.get(Activity, activity_uuid)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    submission = ActivitySubmission(
        activity_id=activity_uuid,
        student_id=student_id,
        response_json=data.responses,
    )
    db.add(submission)
    activity.status = "submitted"
    await db.commit()

    return {"submission_id": str(submission.id), "status": "submitted"}


@router.post("/{activity_id}/evaluate", response_model=ActivityEvaluationResponse)
async def evaluate_activity(
    activity_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """AI-evaluate a submitted activity using Claude."""
    student_id = uuid.UUID(user["sub"])
    activity_uuid = uuid.UUID(activity_id)

    activity = await db.get(Activity, activity_uuid)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the most recent submission for this student
    result = await db.execute(
        select(ActivitySubmission)
        .where(
            ActivitySubmission.activity_id == activity_uuid,
            ActivitySubmission.student_id == student_id,
        )
        .order_by(desc(ActivitySubmission.submitted_at))
        .limit(1)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="No submission found — submit first")

    student = await db.get(Student, student_id)

    # Fetch chapter content to give the evaluator lesson context
    chapter_content: dict | None = None
    if chapter := await db.get(Chapter, activity.chapter_id):
        chapter_content = {**(chapter.content_json or {}), "title": chapter.title}

    evaluation = await evaluate_submission(
        activity_prompt=activity.prompt_json or {},
        student_response=submission.response_json or {},
        student_grade=student.grade if student else "8",
        chapter_content=chapter_content,
    )

    # Persist the evaluation results
    submission.evaluation_json = evaluation
    submission.score = evaluation.get("score", 0)
    activity.status = "evaluated"

    # Update student progress: unlock next chapter and update average score + learning profile
    chapter = await db.get(Chapter, activity.chapter_id)
    if chapter:
        chapter.status = "completed"
        # Unlock the next chapter
        result = await db.execute(
            select(Chapter)
            .where(
                Chapter.subject_id == chapter.subject_id,
                Chapter.order_index == chapter.order_index + 1,
            )
        )
        next_chapter = result.scalar_one_or_none()
        if next_chapter and next_chapter.status == "locked":
            next_chapter.status = "available"

        # Update progress record
        result = await db.execute(
            select(StudentProgress).where(
                StudentProgress.student_id == student_id,
                StudentProgress.subject_id == chapter.subject_id,
            )
        )
        progress = result.scalar_one_or_none()
        if progress:
            progress.chapters_completed += 1
            # Recalculate rolling average score
            if progress.average_score is None:
                progress.average_score = float(submission.score or 0)
            else:
                progress.average_score = (
                    progress.average_score * (progress.chapters_completed - 1)
                    + float(submission.score or 0)
                ) / progress.chapters_completed

            # Accumulate strengths and weaknesses (deduplicated, capped at 10 each)
            new_strengths = evaluation.get("strengths", [])
            new_weaknesses = evaluation.get("areas_for_improvement", [])
            if new_strengths:
                existing = progress.strengths or []
                merged = list(dict.fromkeys(existing + new_strengths))[-10:]
                progress.strengths = merged
            if new_weaknesses:
                existing = progress.weaknesses or []
                merged = list(dict.fromkeys(existing + new_weaknesses))[-10:]
                progress.weaknesses = merged

    await db.commit()

    score = evaluation.get("score", 0)

    # ── Award XP and update gamification ────────────────────────────────────
    # NOTE: XP/gamification tracking moved to frontend analytics
    # (legacy learning_os SQLite engine removed)

    # ── Adaptive curriculum adjustment ──────────────────────────────────────
    if score < 60 and chapter:
        asyncio.create_task(
            _adjust_curriculum_background(
                subject_id=chapter.subject_id,
                student_id=student_id,
            )
        )

    return ActivityEvaluationResponse(
        activity_id=activity_id,
        score=score,
        correctness=evaluation.get("correctness", {}),
        feedback=evaluation.get("feedback", ""),
        guidance=evaluation.get("guidance", ""),
        question_feedback=evaluation.get("question_feedback", []),
        chapter_references=evaluation.get("chapter_references", []),
        study_plan=evaluation.get("study_plan", []),
        strengths=evaluation.get("strengths", []),
        areas_for_improvement=evaluation.get("areas_for_improvement", []),
    )


async def _adjust_curriculum_background(
    subject_id: uuid.UUID,
    student_id: uuid.UUID,
) -> None:
    """Fire-and-forget: re-order remaining chapters when a student scores below 60%."""
    from app.core.database import async_session
    from sqlalchemy import select as _select

    try:
        async with async_session() as db:
            # Remaining (non-completed) chapters
            result = await db.execute(
                _select(Chapter)
                .where(Chapter.subject_id == subject_id, Chapter.status != "completed")
                .order_by(Chapter.order_index)
            )
            remaining = result.scalars().all()
            if len(remaining) <= 1:
                return

            # Completed chapters — needed to determine start_index
            comp_result = await db.execute(
                _select(Chapter)
                .where(Chapter.subject_id == subject_id, Chapter.status == "completed")
            )
            completed = comp_result.scalars().all()
            start_index = max((ch.order_index for ch in completed), default=0) + 1

            # Student's weak topics and average score
            prog_result = await db.execute(
                _select(StudentProgress).where(
                    StudentProgress.student_id == student_id,
                    StudentProgress.subject_id == subject_id,
                )
            )
            progress = prog_result.scalar_one_or_none()
            weak_topics: list[str] = (progress.weaknesses or []) if progress else []
            avg_score = (progress.average_score or 0) if progress else 0

            if not weak_topics:
                return  # Nothing to re-order without direction

            chapters_payload = [
                {"id": str(ch.id), "order_index": ch.order_index, "title": ch.title, "description": ch.description or ""}
                for ch in remaining
            ]

            adjusted = await adjust_curriculum_order(
                chapters=chapters_payload,
                weak_topics=weak_topics,
                recent_scores=[int(avg_score)],
                start_index=start_index,
            )

            id_to_index = {item["id"]: item["order_index"] for item in adjusted.get("chapters", [])}
            for ch in remaining:
                new_idx = id_to_index.get(str(ch.id))
                if new_idx is not None:
                    ch.order_index = new_idx

            await db.commit()
    except Exception:
        pass  # Adjustment is best-effort; never block the main response
