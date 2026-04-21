"""Wave 2 spaced repetition: flashcards table with SM-2 fields.

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-20 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'flashcards',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('front', sa.Text(), nullable=False),
        sa.Column('back', sa.Text(), nullable=False),
        sa.Column('hint', sa.Text(), nullable=True),
        sa.Column('ease_factor', sa.Float(), nullable=False, server_default='2.5'),
        sa.Column('interval_days', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('repetitions', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('due_date', sa.Date(), nullable=False, server_default=sa.func.current_date()),
        sa.Column('last_reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_reviews', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_lapses', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_flashcards_student_due', 'flashcards', ['student_id', 'due_date'])
    op.create_index('ix_flashcards_chapter', 'flashcards', ['chapter_id'])
    op.create_index('ix_flashcards_student_chapter', 'flashcards', ['student_id', 'chapter_id'])


def downgrade() -> None:
    op.drop_index('ix_flashcards_student_chapter', table_name='flashcards')
    op.drop_index('ix_flashcards_chapter', table_name='flashcards')
    op.drop_index('ix_flashcards_student_due', table_name='flashcards')
    op.drop_table('flashcards')
