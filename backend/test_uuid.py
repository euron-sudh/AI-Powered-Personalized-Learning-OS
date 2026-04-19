import asyncio
from app.core.database import get_db
from sqlalchemy import text

async def find_uuid():
    target = '9161dc89-449b-4685-a97e-3368b99e3e7e'
    async for db in get_db():
        print("Checking chapters...")
        res = await db.execute(text(f"SELECT * FROM chapters WHERE id = '{target}'"))
        print("Chapters:", res.fetchall())
        
        print("Checking subjects...")
        res = await db.execute(text(f"SELECT * FROM subjects WHERE id = '{target}'"))
        print("Subjects:", res.fetchall())
        break

if __name__ == "__main__":
    asyncio.run(find_uuid())
