from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(
    settings.supabase_db_url,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=15,
    max_overflow=20,
    pool_timeout=30,
    connect_args={"timeout": 10, "command_timeout": 30},
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db_session():
    async with async_session() as session:
        yield session
