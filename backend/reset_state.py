import os
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

# Load env from backend directory
load_dotenv("backend/.env")

async def reset():
    db_url = os.getenv('SUPABASE_DB_URL')
    if not db_url:
        print("Error: SUPABASE_DB_URL not found in .env")
        return
    
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        tables = [
            "users", "subjects", "chapters", "concepts", 
            "sessions", "session_steps", "user_concept_mastery", 
            "user_subject_stats", "user_stats", "achievements"
        ]
        for table in tables:
            try:
                await conn.execute(text(f"TRUNCATE {table} RESTART IDENTITY CASCADE"))
                print(f"Truncated {table}")
            except Exception as e:
                print(f"Could not truncate {table}: {e}")
    await engine.dispose()
    print("Database Reset Successful")

if __name__ == "__main__":
    asyncio.run(reset())
