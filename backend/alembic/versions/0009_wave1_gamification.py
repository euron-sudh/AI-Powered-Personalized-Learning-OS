"""Wave 1 gamification: streak grace days, longest streak, daily challenge claims.

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('students', sa.Column('last_active_date', sa.Date(), nullable=True))
    op.add_column('students', sa.Column('longest_streak', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('students', sa.Column('streak_freezes_used', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('students', sa.Column('streak_freeze_week_start', sa.Date(), nullable=True))

    op.create_table(
        'daily_challenge_claims',
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('challenge_date', sa.Date(), nullable=False),
        sa.Column('challenge_code', sa.String(50), nullable=False),
        sa.Column('xp_awarded', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('claimed_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('student_id', 'challenge_date', 'challenge_code'),
    )
    op.create_index('ix_daily_challenge_claims_student_date', 'daily_challenge_claims', ['student_id', 'challenge_date'])


def downgrade() -> None:
    op.drop_index('ix_daily_challenge_claims_student_date', table_name='daily_challenge_claims')
    op.drop_table('daily_challenge_claims')
    op.drop_column('students', 'streak_freeze_week_start')
    op.drop_column('students', 'streak_freezes_used')
    op.drop_column('students', 'longest_streak')
    op.drop_column('students', 'last_active_date')
