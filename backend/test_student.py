import asyncio
import uuid
from app.core.database import async_session
from app.models.student import Student

async def check():
    async with async_session() as db:
        s = await db.get(Student, uuid.UUID("866961fe-13a2-4824-b3f9-8d684f2be86d"))
        print("Student exists:", s is not None)

asyncio.run(check())
