import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Concept(Base):
    __tablename__ = "concepts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chapter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chapters.id"))
    title: Mapped[str] = mapped_column(String(500))
    order_index: Mapped[int] = mapped_column(Integer)
    difficulty_level: Mapped[str] = mapped_column(String(50), default="medium")  # easy, medium, hard
    explanation: Mapped[str | None] = mapped_column(String, nullable=True)
    question: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    options: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # ["Option A", "Option B", "Option C", "Option D"]
    correct_answer: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chapter = relationship("Chapter", back_populates="concepts")
    mastery_records = relationship("UserConceptMastery", back_populates="concept")
    session_steps = relationship("SessionStep", back_populates="concept")
