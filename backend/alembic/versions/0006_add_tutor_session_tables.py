"""add learning_sessions and tutor_events tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-15
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create learning_sessions table
    op.create_table(
        "learning_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chapter_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("topic", sa.Text(), nullable=False),
        sa.Column("stage", sa.String(50), nullable=False, server_default="TEACH"),
        sa.Column("emotion", sa.String(50), nullable=False, server_default="neutral"),
        sa.Column("mastery", sa.Float(), nullable=False, server_default="0.3"),
        sa.Column("confusion_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("engagement_score", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("last_action", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["chapter_id"], ["chapters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "chapter_id", name="uq_learning_sessions_student_chapter"),
    )

    # Create tutor_events table
    op.create_table(
        "tutor_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.func.gen_random_uuid(), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["learning_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create index on session_id for faster queries
    op.create_index("ix_tutor_events_session_id", "tutor_events", ["session_id"])
    op.create_index("ix_tutor_events_created_at", "tutor_events", ["created_at"])

    # Enable Realtime on tutor_events (Supabase-specific)
    op.execute("ALTER PUBLICATION supabase_realtime ADD TABLE tutor_events")


def downgrade() -> None:
    # Drop indexes
    op.drop_index("ix_tutor_events_created_at", table_name="tutor_events")
    op.drop_index("ix_tutor_events_session_id", table_name="tutor_events")

    # Drop tables
    op.drop_table("tutor_events")
    op.drop_table("learning_sessions")
