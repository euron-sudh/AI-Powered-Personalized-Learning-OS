import uuid
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mastery import UserConceptMastery, UserChapterProgress, UserSubjectStats, UserGlobalStats
from app.models.session import Session, SessionStep
from app.models.concept import Concept
from app.models.chapter import Chapter


class SessionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def start_session(self, user_id: uuid.UUID, subject_id: uuid.UUID, chapter_id: uuid.UUID) -> Session:
        """Initialize a new learning session."""
        session = Session(
            user_id=user_id,
            subject_id=subject_id,
            chapter_id=chapter_id,
            started_at=datetime.utcnow()
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_next_concept(self, user_id: uuid.UUID, chapter_id: uuid.UUID) -> Optional[Concept]:
        """Fetch the weakest concept for the user in the given chapter."""
        # 1. Get all concepts for this chapter
        # 2. Join with mastery records
        # 3. Sort by mastery score (ascending) and order_index
        stmt = (
            select(Concept)
            .join(UserConceptMastery, Concept.id == UserConceptMastery.concept_id)
            .where(Concept.chapter_id == chapter_id)
            .where(UserConceptMastery.user_id == user_id)
            .order_by(UserConceptMastery.mastery_score.asc(), Concept.order_index.asc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def record_step(
        self, 
        session_id: uuid.UUID, 
        concept_id: uuid.UUID,
        question: str,
        correct_answer: str,
        user_answer: str,
        is_correct: bool,
        difficulty: str,
        time_taken: int,
        options: Optional[dict] = None
    ) -> SessionStep:
        """Log an atomic interaction and update mastery."""
        step = SessionStep(
            session_id=session_id,
            concept_id=concept_id,
            question=question,
            options=options,
            correct_answer=correct_answer,
            user_answer=user_answer,
            is_correct=is_correct,
            difficulty=difficulty,
            time_taken_seconds=time_taken
        )
        self.db.add(step)
        
        # Get the session to find the user
        session_stmt = select(Session).where(Session.id == session_id)
        session_res = await self.db.execute(session_stmt)
        session = session_res.scalar_one()
        
        # Update Mastery
        await self._update_mastery(session.user_id, concept_id, is_correct)
        
        # Update Aggregated Stats
        await self._update_aggregates(session.user_id, session.chapter_id, session.subject_id)
        
        await self.db.flush()
        return step

    async def _update_mastery(self, user_id: uuid.UUID, concept_id: uuid.UUID, is_correct: bool):
        """🧠 Update User Concept Mastery using the moving average formula."""
        stmt = select(UserConceptMastery).where(
            UserConceptMastery.user_id == user_id,
            UserConceptMastery.concept_id == concept_id
        )
        result = await self.db.execute(stmt)
        mastery = result.scalar_one_or_none()
        
        if not mastery:
            # Should have been seeded during onboarding, but fallback just in case
            mastery = UserConceptMastery(user_id=user_id, concept_id=concept_id)
            self.db.add(mastery)

        # new_mastery = ((old_mastery * attempts) + (1 if correct else 0)) / (attempts + 1)
        old_mastery = mastery.mastery_score
        attempts = mastery.attempts
        
        success_val = 1.0 if is_correct else 0.0
        new_mastery = ((old_mastery * attempts) + success_val) / (attempts + 1)
        
        mastery.mastery_score = new_mastery
        mastery.attempts += 1
        if is_correct:
            mastery.correct_attempts += 1
        mastery.last_attempted_at = datetime.utcnow()

    async def _update_aggregates(self, user_id: uuid.UUID, chapter_id: uuid.UUID, subject_id: uuid.UUID):
        """Update chapter and subject level aggregates."""
        # 1. Update Chapter Progress
        concepts_stmt = select(Concept.id).where(Concept.chapter_id == chapter_id)
        concept_ids = (await self.db.execute(concepts_stmt)).scalars().all()
        
        if concept_ids:
            mastery_stmt = select(func.avg(UserConceptMastery.mastery_score)).where(
                UserConceptMastery.user_id == user_id,
                UserConceptMastery.concept_id.in_(concept_ids)
            )
            avg_mastery = (await self.db.execute(mastery_stmt)).scalar() or 0.0
            
            # Progress calculation (simplified: % of concepts with mastery > 0.7)
            proficient_stmt = select(func.count(UserConceptMastery.id)).where(
                UserConceptMastery.user_id == user_id,
                UserConceptMastery.concept_id.in_(concept_ids),
                UserConceptMastery.mastery_score >= 0.7
            )
            proficient_count = (await self.db.execute(proficient_stmt)).scalar() or 0
            progress_percent = (proficient_count / len(concept_ids)) * 100
            
            # Upsert Chapter Progress
            update_stmt = update(UserChapterProgress).where(
                UserChapterProgress.user_id == user_id,
                UserChapterProgress.chapter_id == chapter_id
            ).values(
                mastery_avg=avg_mastery,
                progress_percent=progress_percent,
                is_completed=progress_percent >= 100,
                last_accessed_at=datetime.utcnow()
            )
            await self.db.execute(update_stmt)

        # 2. Update Subject Stats
        chapters_stmt = select(Chapter.id).where(Chapter.subject_id == subject_id)
        chapter_ids = (await self.db.execute(chapters_stmt)).scalars().all()
        
        if chapter_ids:
            ch_mastery_stmt = select(func.avg(UserChapterProgress.mastery_avg)).where(
                UserChapterProgress.user_id == user_id,
                UserChapterProgress.chapter_id.in_(chapter_ids)
            )
            subj_avg_mastery = (await self.db.execute(ch_mastery_stmt)).scalar() or 0.0
            
            ch_progress_stmt = select(func.avg(UserChapterProgress.progress_percent)).where(
                UserChapterProgress.user_id == user_id,
                UserChapterProgress.chapter_id.in_(chapter_ids)
            )
            subj_progress = (await self.db.execute(ch_progress_stmt)).scalar() or 0.0
            
            # Upsert Subject Stats
            update_subj_stmt = update(UserSubjectStats).where(
                UserSubjectStats.user_id == user_id,
                UserSubjectStats.subject_id == subject_id
            ).values(
                avg_mastery=subj_avg_mastery,
                progress_percent=subj_progress,
                last_studied_at=datetime.utcnow()
            )
            await self.db.execute(update_subj_stmt)

    async def end_session(self, session_id: uuid.UUID, total_xp: int):
        """Finalize a session and update global stats."""
        session_stmt = select(Session).where(Session.id == session_id)
        session = (await self.db.execute(session_stmt)).scalar_one()
        
        session.ended_at = datetime.utcnow()
        session.total_xp = total_xp
        
        # Update Global Stats
        stats_stmt = select(UserGlobalStats).where(UserGlobalStats.user_id == session.user_id)
        stats = (await self.db.execute(stats_stmt)).scalar_one()
        stats.total_xp += total_xp
        
        # Simple level up logic (1000 XP per level)
        stats.current_level = (stats.total_xp // 1000) + 1
        
        # Update Streak
        today = datetime.utcnow().date()
        if stats.last_active_date != today:
            if stats.last_active_date == today - timedelta(days=1):
                stats.streak_days += 1
            else:
                stats.streak_days = 1
            stats.last_active_date = today
