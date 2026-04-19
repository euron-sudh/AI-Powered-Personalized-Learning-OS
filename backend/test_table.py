import asyncio
from app.core.database import async_session
from sqlalchemy import text

async def check():
    async with async_session() as db:
        try:
            await db.execute(text("SELECT 1 FROM learning_sessions LIMIT 1"))
            print("Table exists!")
        except Exception as e:
            print("Table error:", type(e), e)

asyncio.run(check())
