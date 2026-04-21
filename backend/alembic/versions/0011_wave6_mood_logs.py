"""Wave 6: mood_logs table.

Revision ID: 0011
Revises: 0010
Create Date: 2026-04-20 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'mood_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mood', sa.String(32), nullable=False),
        sa.Column('energy', sa.Integer(), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_mood_logs_student_created', 'mood_logs', ['student_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_mood_logs_student_created', table_name='mood_logs')
    op.drop_table('mood_logs')
