"""Add adaptive learning engine tables to Supabase.

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to students table for gamification + preferences
    op.add_column('students', sa.Column('xp', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('students', sa.Column('level', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('students', sa.Column('streak_days', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('students', sa.Column('last_active_os', sa.DateTime(timezone=True), nullable=True))
    op.add_column('students', sa.Column('pace_preference', sa.String(50), nullable=False, server_default='steady'))
    op.add_column('students', sa.Column('difficulty_tolerance', sa.Float(), nullable=False, server_default='0.62'))
    op.add_column('students', sa.Column('preferred_styles', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'))
    op.add_column('students', sa.Column('learning_goal', sa.Text(), nullable=True))

    # chapter_roadmap — per-student per-chapter learning path
    op.create_table(
        'chapter_roadmap',
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='queued'),
        sa.Column('priority', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('sequence_position', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('recommended_action', sa.Text(), nullable=False, server_default=''),
        sa.Column('next_review_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('student_id', 'chapter_id'),
    )
    op.create_index('ix_chapter_roadmap_student_id', 'chapter_roadmap', ['student_id'])
    op.create_index('ix_chapter_roadmap_chapter_id', 'chapter_roadmap', ['chapter_id'])

    # chapter_mastery — per-student per-chapter mastery tracking
    op.create_table(
        'chapter_mastery',
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('score', sa.Float(), nullable=False, server_default='35.0'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('average_latency_sec', sa.Float(), nullable=False, server_default='0'),
        sa.Column('trend', sa.String(50), nullable=False, server_default='steady'),
        sa.Column('weak_signals', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('strong_signals', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('last_score', sa.Float(), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('student_id', 'chapter_id'),
    )
    op.create_index('ix_chapter_mastery_student_id', 'chapter_mastery', ['student_id'])
    op.create_index('ix_chapter_mastery_chapter_id', 'chapter_mastery', ['chapter_id'])

    # adaptive_quizzes — quiz definitions per student per chapter
    op.create_table(
        'adaptive_quizzes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('questions', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_adaptive_quizzes_student_id', 'adaptive_quizzes', ['student_id'])
    op.create_index('ix_adaptive_quizzes_chapter_id', 'adaptive_quizzes', ['chapter_id'])

    # adaptive_quiz_attempts — quiz submission results
    op.create_table(
        'adaptive_quiz_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('quiz_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('answers', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('evaluation', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('score', sa.Float(), nullable=False, server_default='0'),
        sa.Column('duration_sec', sa.Float(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['quiz_id'], ['adaptive_quizzes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_adaptive_quiz_attempts_student_id', 'adaptive_quiz_attempts', ['student_id'])
    op.create_index('ix_adaptive_quiz_attempts_quiz_id', 'adaptive_quiz_attempts', ['quiz_id'])

    # lesson_feedback — per-session feedback (confidence, focus, friction)
    op.create_table(
        'lesson_feedback',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chapter_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('focus_minutes', sa.Float(), nullable=False, server_default='0'),
        sa.Column('friction', sa.String(50), nullable=False, server_default='medium'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_lesson_feedback_student_id', 'lesson_feedback', ['student_id'])
    op.create_index('ix_lesson_feedback_chapter_id', 'lesson_feedback', ['chapter_id'])

    # memory_events — event log for context + adaptation decisions
    op.create_table(
        'memory_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False, server_default=''),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_memory_events_student_id', 'memory_events', ['student_id'])
    op.create_index('ix_memory_events_category', 'memory_events', ['category'])

    # library_documents — ingested notes/documents
    op.create_table(
        'library_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('source_type', sa.String(50), nullable=False, server_default='notes'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_library_documents_student_id', 'library_documents', ['student_id'])

    # library_chunks — document chunks with embeddings for RAG
    op.create_table(
        'library_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('keywords', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('embedding', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['document_id'], ['library_documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_library_chunks_document_id', 'library_chunks', ['document_id'])
    op.create_index('ix_library_chunks_student_id', 'library_chunks', ['student_id'])

    # adaptive_achievements — gamification badges
    op.create_table(
        'adaptive_achievements',
        sa.Column('code', sa.String(100), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('unlocked_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('code', 'student_id'),
    )
    op.create_index('ix_adaptive_achievements_student_id', 'adaptive_achievements', ['student_id'])


def downgrade() -> None:
    # Drop tables in reverse order (handle FKs)
    op.drop_table('adaptive_achievements')
    op.drop_table('library_chunks')
    op.drop_table('library_documents')
    op.drop_table('memory_events')
    op.drop_table('lesson_feedback')
    op.drop_table('adaptive_quiz_attempts')
    op.drop_table('adaptive_quizzes')
    op.drop_table('chapter_mastery')
    op.drop_table('chapter_roadmap')

    # Drop new columns from students
    op.drop_column('students', 'learning_goal')
    op.drop_column('students', 'preferred_styles')
    op.drop_column('students', 'difficulty_tolerance')
    op.drop_column('students', 'pace_preference')
    op.drop_column('students', 'last_active_os')
    op.drop_column('students', 'streak_days')
    op.drop_column('students', 'level')
    op.drop_column('students', 'xp')
