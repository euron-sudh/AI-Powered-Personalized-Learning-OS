import asyncio
from app.core.database import async_session
from app.models.student import Student
from sqlalchemy import select

async def f():
    async with async_session() as db:
        r = await db.execute(select(Student))
        for s in r.scalars().all():
            print(f"ID: {s.id}, Name: {s.name}, Created: {s.created_at}")

if __name__ == "__main__":
    asyncio.run(f())
