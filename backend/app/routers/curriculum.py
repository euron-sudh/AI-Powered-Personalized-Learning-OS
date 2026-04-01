import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.rate_limiter import limiter
from app.dependencies import get_current_user
from app.models.chapter import Chapter
from app.models.progress import StudentProgress
from app.models.student import Student
from app.models.subject import Subject
from app.schemas.curriculum import ChapterSummary, CurriculumGenerateRequest, CurriculumResponse
from app.services.curriculum_generator import adjust_curriculum_order, generate_curriculum

router = APIRouter()


@router.post("/generate", response_model=CurriculumResponse)
@limiter.limit("100/minute")
async def generate_curriculum_route(
    request: Request,
    data: CurriculumGenerateRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Generate a full curriculum for a subject using Claude API."""
    student_id = uuid.UUID(user["sub"])

    # Get student info to personalize the curriculum
    student = await db.get(Student, student_id)
    grade = data.grade or (student.grade if student else "8")
    background = data.background or (student.background if student else None)
    board = data.board or (student.board if student else None)

    # Build curriculum using real syllabus chapters (board-specific)
    curriculum_data = await generate_curriculum(
        subject_name=data.subject_name,
        grade=grade,
        board=board,
        background=background,
        difficulty_level=data.difficulty_level,
    )

    # Find or create the subject record
    result = await db.execute(
        select(Subject).where(
            Subject.student_id == student_id,
            Subject.name == data.subject_name,
        )
    )
    subject = result.scalar_one_or_none()

    if not subject:
        subject = Subject(
            student_id=student_id,
            name=data.subject_name,
            status="not_started",
            difficulty_level=data.difficulty_level,
        )
        db.add(subject)
        await db.flush()

    # Delete all existing chapters before (re)generating to prevent duplicates
    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(Chapter).where(Chapter.subject_id == subject.id))
    await db.flush()

    # Create chapter records
    chapters_out = []
    for idx, ch_data in enumerate(curriculum_data.get("chapters", [])):
        chapter = Chapter(
            subject_id=subject.id,
            order_index=ch_data["order_index"],
            title=ch_data["title"],
            description=ch_data["description"],
            status="available",
        )
        db.add(chapter)
        await db.flush()
        chapters_out.append(
            ChapterSummary(
                id=str(chapter.id),
                order_index=chapter.order_index,
                title=chapter.title,
                description=chapter.description or "",
                status=chapter.status,
            )
        )

    # Update or create the progress record
    result = await db.execute(
        select(StudentProgress).where(
            StudentProgress.student_id == student_id,
            StudentProgress.subject_id == subject.id,
        )
    )
    progress = result.scalar_one_or_none()
    if progress:
        progress.total_chapters = len(chapters_out)
    else:
        progress = StudentProgress(
            student_id=student_id,
            subject_id=subject.id,
            total_chapters=len(chapters_out),
            chapters_completed=0,
        )
        db.add(progress)

    subject.status = "in_progress"
    await db.commit()

    return CurriculumResponse(
        subject_id=str(subject.id),
        subject_name=subject.name,
        chapters=chapters_out,
    )


@router.post("/{subject_id}/adjust")
async def adjust_curriculum_route(
    subject_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Re-order remaining chapters based on the student's weak topics and recent scores.

    Only unlocked/available chapters are re-ordered; completed chapters keep their index.
    Called automatically after a low-score evaluation, or manually by the student.
    """
    student_id = uuid.UUID(user["sub"])
    subject_uuid = uuid.UUID(subject_id)

    # Ownership check
    subject = await db.get(Subject, subject_uuid)
    if not subject or subject.student_id != student_id:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Fetch all chapters ordered by index
    result = await db.execute(
        select(Chapter)
        .where(Chapter.subject_id == subject_uuid)
        .order_by(Chapter.order_index)
    )
    all_chapters = result.scalars().all()

    # Split into completed (fixed) and remaining (to re-order)
    completed = [ch for ch in all_chapters if ch.status == "completed"]
    remaining = [ch for ch in all_chapters if ch.status != "completed"]

    if len(remaining) <= 1:
        return {"message": "Nothing to re-order.", "adjusted": False}

    # Fetch student progress for weak topics and scores
    prog_result = await db.execute(
        select(StudentProgress).where(
            StudentProgress.student_id == student_id,
            StudentProgress.subject_id == subject_uuid,
        )
    )
    progress = prog_result.scalar_one_or_none()
    weak_topics: list[str] = progress.weaknesses or [] if progress else []
    avg_score = progress.average_score or 0 if progress else 0
    recent_scores = [int(avg_score)] if avg_score else []

    start_index = (max((ch.order_index for ch in completed), default=0) + 1)

    chapters_payload = [
        {"id": str(ch.id), "order_index": ch.order_index, "title": ch.title, "description": ch.description or ""}
        for ch in remaining
    ]

    adjusted = await adjust_curriculum_order(
        chapters=chapters_payload,
        weak_topics=weak_topics,
        recent_scores=recent_scores,
        start_index=start_index,
    )

    # Apply new order_index values returned by Claude
    id_to_index = {item["id"]: item["order_index"] for item in adjusted.get("chapters", [])}
    for ch in remaining:
        new_idx = id_to_index.get(str(ch.id))
        if new_idx is not None:
            ch.order_index = new_idx

    await db.commit()

    return {
        "message": "Curriculum re-ordered based on your performance.",
        "adjusted": True,
        "reasoning": adjusted.get("reasoning", ""),
    }


@router.get("/{subject_id}", response_model=CurriculumResponse)
async def get_curriculum(
    subject_id: str,
    response: Response,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get existing curriculum (chapters list) for a subject."""
    student_id = uuid.UUID(user["sub"])
    subject_uuid = uuid.UUID(subject_id)

    subject = await db.get(Subject, subject_uuid)
    if not subject or subject.student_id != student_id:
        raise HTTPException(status_code=404, detail="Subject not found")

    result = await db.execute(
        select(Chapter)
        .where(Chapter.subject_id == subject_uuid)
        .order_by(Chapter.order_index)
    )
    chapters = result.scalars().all()

    response.headers["Cache-Control"] = "private, max-age=120"
    return CurriculumResponse(
        subject_id=str(subject.id),
        subject_name=subject.name,
        chapters=[
            ChapterSummary(
                id=str(ch.id),
                order_index=ch.order_index,
                title=ch.title,
                description=ch.description or "",
                status=ch.status,
            )
            for ch in chapters
        ],
    )
