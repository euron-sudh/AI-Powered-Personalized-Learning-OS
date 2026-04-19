import asyncio
import uuid
from app.core.database import async_session
from app.services.tutor_session_engine import TutorSessionEngine

async def test_create_session():
    student_id = "866961fe-13a2-4824-b3f9-8d684f2be86d" # From the logs
    chapter_id = "9161dc89-449b-4685-a97e-3368b99e3e7e"
    
    async with async_session() as db:
        engine = TutorSessionEngine(db)
        try:
            session_id = await engine.create_session(student_id, chapter_id, db)
            print("Success! session_id:", session_id)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_create_session())
