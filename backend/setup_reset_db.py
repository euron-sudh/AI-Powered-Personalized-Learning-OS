import os
import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Load env
load_dotenv("backend/.env")

from app.core.database import Base
from app.models import *

async def setup_and_reset():
    db_url = os.getenv('SUPABASE_DB_URL')
    if not db_url:
        print("Error: SUPABASE_DB_URL not found in .env")
        return
    
    engine = create_async_engine(db_url)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("All tables ensured in DB.")
    
    # Reset state
    tables = [
        "students", "subjects", "chapters", "concepts", 
        "activities", "activity_submissions", "chat_messages", 
        "sentiment_logs", "student_progress", "syllabus_boards", 
        "syllabus_subjects", "syllabus_chapters", "sessions", 
        "session_steps", "session_transcripts", "user_concept_mastery", 
        "user_chapter_progress", "user_subject_stats", "user_stats", 
        "achievements", "user_achievements",
        "chapter_roadmap", "chapter_mastery", "adaptive_quizzes", 
        "adaptive_quiz_attempts", "lesson_feedback", "memory_events", 
        "library_documents", "library_chunks", "adaptive_achievements"
    ]
    
    for table in tables:
        async with engine.begin() as conn:
            try:
                await conn.execute(text(f"TRUNCATE {table} RESTART IDENTITY CASCADE"))
                print(f"Truncated {table}")
            except Exception as e:
                print(f"Skipped {table}: {str(e).splitlines()[0]}")
                
    await engine.dispose()
    print("Database Reset Successful")

if __name__ == "__main__":
    asyncio.run(setup_and_reset())
