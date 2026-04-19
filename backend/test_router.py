import asyncio
from app.routers.tutor_session import start_session, StartSessionRequest
from app.core.database import async_session

async def check():
    req = StartSessionRequest(chapter_id="9161dc89-449b-4685-a97e-3368b99e3e7e", topic="")
    user = {"sub": "866961fe-13a2-4824-b3f9-8d684f2be86d"}
    async with async_session() as db:
        try:
            res = await start_session(req, user, db)
            print("Success:", res)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print("CAUGHT EXCEPTION TYPE:", type(e))

asyncio.run(check())
