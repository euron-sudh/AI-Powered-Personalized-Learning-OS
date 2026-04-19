import asyncio
import uuid
import json
from datetime import datetime, timezone
from app.learning_os.storage import LearningOSStorage
from app.services.syllabus_data import get_syllabus

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()

async def setup_chemistry():
    learner_id = "demo-learner"
    storage = LearningOSStorage()
    storage.initialize()
    
    # 1. Purge existing data for this learner to focus on "Only Chemistry"
    storage.execute("DELETE FROM roadmap_items WHERE learner_id = ?", (learner_id,))
    storage.execute("DELETE FROM mastery_records WHERE learner_id = ?", (learner_id,))
    storage.execute("DELETE FROM learners WHERE id = ?", (learner_id,))
    
    # 2. Re-create learner in Adaptive OS
    storage.execute(
        """
        INSERT INTO learners (
            id, name, goal, pace_preference, difficulty_tolerance, preferred_styles,
            xp, level, streak_days, last_activity_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 1, 0, NULL, ?, ?)
        """,
        (
            learner_id, 
            "Chemistry Student", 
            "Mastering Grade 12 Chemistry", 
            "steady", 
            0.65, 
            json.dumps(["worked examples", "quizzes"]), 
            utc_now(), 
            utc_now()
        ),
    )
    
    # 3. Setup Legacy Database (SQLAlchemy)
    from app.core.database import async_session
    from app.models.student import Student
    from app.models.subject import Subject
    from app.models.chapter import Chapter
    from sqlalchemy import select, delete as sql_delete

    # We need a real UUID for the student if we want to use the legacy tables
    # For demo purposes, we'll try to find a student or create one
    async with async_session() as db:
        # Try to find 'demo-learner' in main DB (it's a string, but main DB uses UUID)
        # So we'll use a fixed UUID for demo-learner in main DB
        demo_uuid = uuid.UUID("00000000-0000-0000-0000-000000000001")
        
        # Cleanup
        await db.execute(sql_delete(Subject).where(Subject.student_id == demo_uuid))
        await db.execute(sql_delete(Student).where(Student.id == demo_uuid))
        
        student = Student(
            id=demo_uuid,
            name="Chemistry Student",
            grade="12",
            board="CBSE",
            onboarding_completed=True
        )
        db.add(student)
        await db.flush()
        
        subject = Subject(
            student_id=demo_uuid,
            name="Chemistry",
            status="in_progress",
            difficulty_level="intermediate"
        )
        db.add(subject)
        await db.flush()

        # 4. Add Chemistry topics to BOTH Adaptive OS and Legacy Roadmap
        interest = "Chemistry"
        syllabus_chapters = get_syllabus("CBSE", interest, "12")
        
        if syllabus_chapters:
            for i, ch in enumerate(syllabus_chapters):
                # Legacy Chapter
                leg_chap = Chapter(
                    subject_id=subject.id,
                    order_index=ch["order_index"],
                    title=ch["title"],
                    description=ch["description"],
                    status="available" if i == 0 else "locked"
                )
                db.add(leg_chap)
                await db.flush()
                
                # Adaptive OS Topic (linked by ID)
                topic_id = str(leg_chap.id) # Use the legacy UUID as the topic ID for perfect sync!
                
                storage.execute(
                    """
                    INSERT OR REPLACE INTO topics (
                        id, title, domain, description, difficulty, estimated_minutes, tags,
                        prerequisites, lesson_summary, concepts, quiz_bank, retrieval_notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        topic_id,
                        ch["title"],
                        interest,
                        ch["description"],
                        "intermediate",
                        30,
                        json.dumps(["chemistry", "cbse"]),
                        json.dumps([]),
                        f"Core concepts of {ch['title']}",
                        json.dumps([]),
                        json.dumps([]),
                        json.dumps([]),
                    )
                )
                
                # Add to roadmap
                storage.execute(
                    """
                    INSERT INTO roadmap_items (
                        learner_id, topic_id, status, priority, sequence_position, recommended_action,
                        next_review_at, confidence, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        learner_id,
                        topic_id,
                        "available" if i == 0 else "locked",
                        round(1 / (i + 1) + 0.35, 4),
                        i + 1,
                        "Start with introduction",
                        utc_now(),
                        0.5,
                        utc_now(),
                    )
                )
        
        await db.commit()
            
    print(f"Successfully set up Unified Chemistry for {learner_id} (Adaptive) and {demo_uuid} (Legacy)")

if __name__ == "__main__":
    asyncio.run(setup_chemistry())
