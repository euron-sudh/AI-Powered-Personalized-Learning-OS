"""add tutor sessions table

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tutor_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chapter_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("current_step_index", sa.Integer(), server_default="0", nullable=False),
        sa.Column("retry_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("state_json", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "status",
            sa.Enum("active", "completed", name="tutor_session_status"),
            server_default="active",
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["chapter_id"], ["chapters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "chapter_id", name="uq_tutor_sessions_student_chapter"),
    )
    op.create_index("ix_tutor_sessions_student_id", "tutor_sessions", ["student_id"])
    op.create_index("ix_tutor_sessions_chapter_id", "tutor_sessions", ["chapter_id"])


def downgrade() -> None:
    op.drop_index("ix_tutor_sessions_chapter_id", table_name="tutor_sessions")
    op.drop_index("ix_tutor_sessions_student_id", table_name="tutor_sessions")
    op.drop_table("tutor_sessions")
    op.execute("DROP TYPE IF EXISTS tutor_session_status")
