import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DailyChallengeClaim(Base):
    __tablename__ = "daily_challenge_claims"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), primary_key=True
    )
    challenge_date: Mapped[date] = mapped_column(Date, primary_key=True)
    challenge_code: Mapped[str] = mapped_column(String(50), primary_key=True)
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0)
    claimed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
