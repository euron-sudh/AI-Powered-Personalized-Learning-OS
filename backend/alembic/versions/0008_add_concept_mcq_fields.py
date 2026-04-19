"""Add MCQ fields to concepts table for step-by-step session flow.

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-18 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add explanation, question, options, and correct_answer to concepts."""
    op.add_column('concepts', sa.Column('explanation', sa.Text(), nullable=True))
    op.add_column('concepts', sa.Column('question', sa.String(1000), nullable=True))
    op.add_column('concepts', sa.Column('options', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('concepts', sa.Column('correct_answer', sa.String(500), nullable=True))


def downgrade() -> None:
    """Remove MCQ fields from concepts."""
    op.drop_column('concepts', 'correct_answer')
    op.drop_column('concepts', 'options')
    op.drop_column('concepts', 'question')
    op.drop_column('concepts', 'explanation')
