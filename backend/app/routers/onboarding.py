import uuid
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.supabase_client import get_supabase_client
from app.dependencies import get_current_user
from app.models.chapter import Chapter
from app.models.progress import StudentProgress
from app.models.student import Student
from app.models.subject import Subject
from app.schemas.onboarding import OnboardingRequest, OnboardingResponse
from app.services.syllabus_data import get_syllabus

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=OnboardingResponse)
async def save_onboarding(
    data: OnboardingRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Save student profile from onboarding wizard and seed curriculum from syllabus data."""
    try:
        student_id = uuid.UUID(user["sub"])

        print(f"[DEBUG] Starting onboarding for user {user['sub']}")
        print(f"[DEBUG] Request data: name={data.name}, grade={data.grade}, interests={data.interests}")

        # Upsert student record
        existing = await db.get(Student, student_id)
        if existing:
            print(f"[DEBUG] Updating existing student record")
            existing.name = data.name
            existing.grade = data.grade
            existing.board = data.board
            existing.background = data.background
            existing.interests = data.interests
            existing.onboarding_completed = True
        else:
            print(f"[DEBUG] Creating new student record")
            student = Student(
                id=student_id,
                name=data.name,
                grade=data.grade,
                board=data.board,
                background=data.background,
                interests=data.interests,
                onboarding_completed=True,
            )
            db.add(student)

        # Create a subject entry + seed chapters for each area of interest
        subjects_created = []
        for interest in data.interests:
            # Check if subject already exists
            result = await db.execute(
                select(Subject).where(
                    Subject.student_id == student_id,
                    Subject.name == interest,
                )
            )
            existing_subject = result.scalar_one_or_none()
            if existing_subject:
                subjects_created.append(interest)
                continue

            print(f"[DEBUG] Creating subject: {interest}")
            subject = Subject(
                student_id=student_id,
                name=interest,
                status="not_started",
                difficulty_level="beginner",
            )
            db.add(subject)
            await db.flush()

            # Seed chapters from official syllabus if available
            syllabus_chapters = get_syllabus(data.board, interest, data.grade) if data.board and data.grade else None
            chapter_count = 0
            if syllabus_chapters:
                print(f"[DEBUG] Adding {len(syllabus_chapters)} chapters to {interest}")
                for ch in syllabus_chapters:
                    chapter = Chapter(
                        subject_id=subject.id,
                        order_index=ch["order_index"],
                        title=ch["title"],
                        description=ch["description"],
                        status="available",
                    )
                    db.add(chapter)
                    chapter_count += 1
                subject.status = "in_progress"

            # Create a corresponding progress record
            progress = StudentProgress(
                student_id=student_id,
                subject_id=subject.id,
                chapters_completed=0,
                total_chapters=chapter_count,
            )
            db.add(progress)
            subjects_created.append(interest)

        print(f"[DEBUG] Committing database changes")
        await db.commit()
        print(f"[DEBUG] Onboarding completed successfully")

        return OnboardingResponse(
            student_id=str(student_id),
            onboarding_completed=True,
            subjects_created=subjects_created,
        )
    except Exception as e:
        await db.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"[ERROR] Onboarding error: {type(e).__name__}: {e}")
        print(f"[ERROR] Traceback:\n{error_trace}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/marksheet")
async def upload_marksheet(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Upload marksheet to Supabase Storage."""
    student_id = user["sub"]

    allowed_types = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only images (JPEG, PNG, WebP) and PDFs are allowed.")

    max_size = 10 * 1024 * 1024  # 10 MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File size must be under 10 MB.")

    supabase = get_supabase_client()
    file_path = f"{student_id}/marksheet/{file.filename}"

    try:
        supabase.storage.from_("marksheets").upload(
            file_path,
            content,
            {"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    # Update student record with marksheet path
    student_uuid = uuid.UUID(student_id)
    student = await db.get(Student, student_uuid)
    if student:
        student.marksheet_path = file_path
        await db.commit()

    return {"path": file_path, "filename": file.filename}


@router.get("/profile")
async def get_student_profile(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get the current student's profile."""
    student_id = uuid.UUID(user["sub"])
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    return {
        "student_id": str(student.id),
        "name": student.name,
        "grade": student.grade,
        "board": student.board,
        "background": student.background,
        "interests": student.interests,
        "onboarding_completed": student.onboarding_completed,
        "marksheet_path": student.marksheet_path,
    }
