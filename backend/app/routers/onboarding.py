import uuid
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Response
from sqlalchemy import case, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.supabase_client import get_supabase_client
from app.dependencies import get_current_user
from app.models.chapter import Chapter
from app.models.concept import Concept
from app.models.mastery import UserConceptMastery, UserChapterProgress, UserSubjectStats, UserGlobalStats
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
            print(f"[DEBUG] Updating existing student record: {student_id}")
            existing.name = data.name
            existing.grade = data.grade
            existing.board = data.board
            existing.background = data.background
            existing.interests = data.interests
            existing.onboarding_completed = True
        else:
            print(f"[DEBUG] Creating new student record: {student_id}")
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
            
        # Flush student record first to ensure FKs can be satisfied
        await db.flush()

        # Initialize adaptive fields if missing
        if not existing:
            student.xp = 0
            student.level = 1
            student.streak_days = 0
            student.pace_preference = "steady"
            student.difficulty_tolerance = 0.62
            student.preferred_styles = []
        else:
            if existing.xp is None: existing.xp = 0
            if existing.level is None: existing.level = 1
            if existing.streak_days is None: existing.streak_days = 0
        
        await db.flush()

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
                status="in_progress",
                difficulty_level="beginner",
            )
            db.add(subject)
            await db.flush()

            # Initialize Subject Stats
            subject_stats = UserSubjectStats(
                user_id=student_id,
                subject_id=subject.id
            )
            db.add(subject_stats)

            # Seed chapters (Official Syllabus first, then AI Fallback)
            syllabus_chapters = get_syllabus(data.board, interest, data.grade) if data.board and data.grade else None
            
            if not syllabus_chapters:
                print(f"[DEBUG] Official syllabus not found for {interest}. Triggering AI generation...")
                try:
                    from app.services.curriculum_generator import generate_curriculum as generate_ai_curriculum
                    ai_res = await generate_ai_curriculum(
                        subject_name=interest,
                        grade=data.grade or "8",
                        board=data.board,
                        background=data.background,
                        difficulty_level="beginner"
                    )
                    syllabus_chapters = ai_res.get("chapters", [])
                    print(f"[DEBUG] AI generated {len(syllabus_chapters)} chapters for {interest}")
                except Exception as e:
                    print(f"[ERROR] AI generation failed for {interest}: {e}")
                    syllabus_chapters = []

            chapter_count = 0
            if not syllabus_chapters:
                # Create placeholder chapter if generation failed
                print(f"[DEBUG] Creating placeholder chapter for {interest} (generation failed)")
                placeholder_ch = Chapter(
                    subject_id=subject.id,
                    order_index=1,
                    title=f"Introduction to {interest}",
                    description=f"Explore {interest} - curriculum will be generated soon",
                    status="available",
                )
                db.add(placeholder_ch)
                await db.flush()

                ch_progress = UserChapterProgress(
                    user_id=student_id,
                    chapter_id=placeholder_ch.id
                )
                db.add(ch_progress)
                chapter_count = 1

            if syllabus_chapters:
                print(f"[DEBUG] Adding {len(syllabus_chapters)} chapters and concepts to {interest}")
                for ch in syllabus_chapters:
                    chapter = Chapter(
                        subject_id=subject.id,
                        order_index=ch["order_index"],
                        title=ch["title"],
                        description=ch.get("description", ""),
                        status="available",
                    )
                    db.add(chapter)
                    await db.flush()

                    # Initialize Chapter Progress
                    ch_progress = UserChapterProgress(
                        user_id=student_id,
                        chapter_id=chapter.id
                    )
                    db.add(ch_progress)

                    # Add Concepts if provided (AI generated)
                    if "concepts" in ch:
                        for idx, c_data in enumerate(ch["concepts"]):
                            concept = Concept(
                                chapter_id=chapter.id,
                                title=c_data["title"],
                                order_index=c_data.get("order_index", idx + 1),
                                difficulty_level=c_data.get("difficulty_level", "medium")
                            )
                            db.add(concept)
                            await db.flush()

                            # Initialize Concept Mastery
                            mastery = UserConceptMastery(
                                user_id=student_id,
                                concept_id=concept.id
                            )
                            db.add(mastery)

                    chapter_count += 1

            # Legacy Progress record (kept for backward compatibility with some UI elements)
            progress = StudentProgress(
                student_id=student_id,
                subject_id=subject.id,
                chapters_completed=0,
                total_chapters=chapter_count,
            )
            db.add(progress)
            subjects_created.append(interest)

        # --- LEARNING OS BOOTSTRAP ---
        # Flush to ensure chapters/subjects are in the DB for the raw SQL queries in the service
        await db.flush()

        # Initialize the adaptive learning engine for this student
        # NOTE: learning_os (SQLite engine) removed - bootstrap handled via Supabase schema
        # from app.learning_os.service import AdaptiveLearningService
        # from app.learning_os.storage import AdaptiveStorage
        # goal = f"Master {', '.join(data.interests)} at Grade {data.grade}"
        # service = AdaptiveLearningService(AdaptiveStorage(db))
        # await service.bootstrap_learner(...)

        print(f"[DEBUG] Committing database changes")
        await db.commit()
        print(f"[DEBUG] Onboarding and Orchestration completed successfully")

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

    from app.services.gamification import xp_into_level
    into, needed = xp_into_level(student.xp or 0)
    return {
        "student_id": str(student.id),
        "name": student.name,
        "grade": student.grade,
        "board": student.board,
        "background": student.background,
        "interests": student.interests,
        "onboarding_completed": student.onboarding_completed,
        "marksheet_path": student.marksheet_path,
        "xp": student.xp,
        "level": student.level,
        "streak_days": student.streak_days,
        "longest_streak": student.longest_streak or 0,
        "xp_into_level": into,
        "xp_to_next_level": needed,
        "streak_freezes_remaining": max(0, 1 - (student.streak_freezes_used or 0)),
    }


@router.post("/heartbeat")
async def heartbeat(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Mark the student as active today; update streak with grace-day support."""
    from app.services.gamification import update_streak_and_activity
    student = await db.get(Student, uuid.UUID(user["sub"]))
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    summary = await update_streak_and_activity(student)
    await db.commit()
    return {
        "streak_days": student.streak_days,
        "longest_streak": student.longest_streak or 0,
        "grace_used": summary.get("grace_used", False),
        "broke": summary.get("broke", False),
    }


@router.get("/subjects")
async def get_student_subjects(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get all subjects for the current student with chapter totals and completion."""
    student_id = uuid.UUID(user["sub"])

    total_col = func.count(Chapter.id)
    completed_col = func.coalesce(
        func.sum(case((Chapter.status == "completed", 1), else_=0)), 0
    )

    stmt = (
        select(Subject, total_col, completed_col)
        .outerjoin(Chapter, Chapter.subject_id == Subject.id)
        .where(Subject.student_id == student_id)
        .group_by(Subject.id)
        .order_by(Subject.name)
    )
    result = await db.execute(stmt)

    response = []
    for subject, total, completed in result.all():
        total = int(total or 0)
        completed = int(completed or 0)
        progress_percent = round((completed / total) * 100) if total else 0
        response.append({
            "id": str(subject.id),
            "name": subject.name,
            "status": subject.status,
            "difficulty_level": subject.difficulty_level,
            "chapter_count": total,
            "total_chapters": total,
            "chapters_completed": completed,
            "progress_percent": progress_percent,
        })

    return {"subjects": response}


@router.delete("")
async def delete_profile(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete student profile and all associated data."""
    try:
        student_id = uuid.UUID(user["sub"])

        # Delete StudentProgress records
        await db.execute(delete(StudentProgress).where(StudentProgress.student_id == student_id))

        # Delete Subject records (should cascade to chapters if FK cascade is set)
        await db.execute(delete(Subject).where(Subject.student_id == student_id))

        # Delete Student record
        await db.execute(delete(Student).where(Student.id == student_id))

        await db.commit()
        return Response(status_code=204)
    except Exception as e:
        logger.error(f"Error deleting profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete profile")
