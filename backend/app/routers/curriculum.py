import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
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
from app.services.curriculum_generator import generate_curriculum

router = APIRouter()


@router.post("/generate", response_model=CurriculumResponse)
@limiter.limit("10/minute")
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
    else:
        # Delete existing chapters if regenerating
        from sqlalchemy import delete as sql_delete
        await db.execute(sql_delete(Chapter).where(Chapter.subject_id == subject.id))

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


@router.get("/{subject_id}", response_model=CurriculumResponse)
async def get_curriculum(
    subject_id: str,
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
