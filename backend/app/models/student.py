import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func, Integer, Float
from sqlalchemy.dialects.postgresql import ARRAY, UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    grade: Mapped[str] = mapped_column(String(10))
    background: Mapped[str | None] = mapped_column(Text, nullable=True)
    interests: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    board: Mapped[str | None] = mapped_column(String(50), nullable=True)
    marksheet_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Gamification & Adaptive fields
    xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_active_os: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    pace_preference: Mapped[str] = mapped_column(String(50), default="steady")
    difficulty_tolerance: Mapped[float] = mapped_column(Float, default=0.62)
    preferred_styles: Mapped[list | dict] = mapped_column(JSONB, default=list)
    learning_goal: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    subjects = relationship("Subject", back_populates="student")
