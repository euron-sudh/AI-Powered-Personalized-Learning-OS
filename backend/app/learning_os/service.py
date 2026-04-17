from __future__ import annotations

import uuid
from typing import Any

from app.config import settings
from app.learning_os.adaptive import AnalyzerAgent, GamificationAgent, PlannerAgent, QuizAgent, TutorAgent
from app.learning_os.retrieval import MemoryAgent, RetrievalAgent
from app.learning_os.seed import SEED_LIBRARY_DOCUMENTS, SEED_TOPICS
from app.learning_os.storage import LearningOSStorage, utc_now


class LearningOSService:
    def __init__(self):
        self.storage = LearningOSStorage()
        self.retrieval_agent = RetrievalAgent(self.storage)
        self.memory_agent = MemoryAgent(self.storage)
        self.planner_agent = PlannerAgent(self.storage)
        self.quiz_agent = QuizAgent(self.storage)
        self.analyzer_agent = AnalyzerAgent(self.storage)
        self.gamification_agent = GamificationAgent(self.storage)
        self.tutor_agent = TutorAgent(self.storage, self.retrieval_agent, self.memory_agent)
        self.initialize()

    def initialize(self) -> None:
        self.storage.initialize()
        if not self.storage.fetch_one("SELECT id FROM topics LIMIT 1"):
            rows = []
            for topic in SEED_TOPICS:
                rows.append(
                    (
                        topic["id"],
                        topic["title"],
                        topic["domain"],
                        topic["description"],
                        topic["difficulty"],
                        topic["estimated_minutes"],
                        self.storage.dumps(topic["tags"]),
                        self.storage.dumps(topic["prerequisites"]),
                        topic["lesson_summary"],
                        self.storage.dumps(topic["concepts"]),
                        self.storage.dumps(topic["quiz_bank"]),
                        self.storage.dumps(topic["retrieval_notes"]),
                    )
                )
            self.storage.executemany(
                """
                INSERT INTO topics (
                    id, title, domain, description, difficulty, estimated_minutes, tags,
                    prerequisites, lesson_summary, concepts, quiz_bank, retrieval_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                rows,
            )
        self.bootstrap_learner()

    def bootstrap_learner(
        self,
        learner_id: str | None = None,
        name: str = "Ava",
        goal: str = "Become confident in math, science, and problem solving over the next 8 weeks.",
        pace_preference: str = "steady",
        difficulty_tolerance: float = 0.62,
        preferred_styles: list[str] | None = None,
    ) -> dict[str, Any]:
        learner_id = learner_id or settings.default_learner_id
        preferred_styles = preferred_styles or ["worked examples", "quizzes", "concept maps"]
        learner = self.storage.fetch_one("SELECT * FROM learners WHERE id = ?", (learner_id,))
        if learner:
            return self.serialize_learner(learner)

        now = utc_now()
        self.storage.execute(
            """
            INSERT INTO learners (
                id, name, goal, pace_preference, difficulty_tolerance, preferred_styles,
                xp, level, streak_days, last_activity_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 1, 0, NULL, ?, ?)
            """,
            (learner_id, name, goal, pace_preference, difficulty_tolerance, self.storage.dumps(preferred_styles), now, now),
        )
        topics = self.storage.fetch_all("SELECT id FROM topics ORDER BY rowid ASC")
        roadmap_rows = []
        mastery_rows = []
        for position, topic in enumerate(topics, start=1):
            roadmap_rows.append(
                (
                    learner_id,
                    topic["id"],
                    "queued",
                    round(1 / position + 0.35, 4),
                    position,
                    "Begin with a concept walk-through",
                    utc_now(),
                    0.5,
                    utc_now(),
                )
            )
            starting_score = max(28, 68 - position * 5)
            mastery_rows.append(
                (
                    learner_id,
                    topic["id"],
                    float(starting_score),
                    0,
                    0,
                    "steady",
                    self.storage.dumps(["untested"]),
                    self.storage.dumps([]),
                    0,
                    utc_now(),
                )
            )
        self.storage.executemany(
            """
            INSERT INTO roadmap_items (
                learner_id, topic_id, status, priority, sequence_position, recommended_action,
                next_review_at, confidence, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            roadmap_rows,
        )
        self.storage.executemany(
            """
            INSERT INTO mastery_records (
                learner_id, topic_id, score, attempts, average_latency_sec, trend,
                weak_signals, strong_signals, last_score, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            mastery_rows,
        )
        self.memory_agent.remember(learner_id, "profile", "Learner profile initialized", {"goal": goal, "preferred_styles": preferred_styles})
        for document in SEED_LIBRARY_DOCUMENTS:
            self.retrieval_agent.ingest_document(learner_id, document["title"], document["content"], source_type=document["source_type"])
        self.memory_agent.remember(
            learner_id,
            "system",
            "Seeded adaptive roadmap and study library",
            {"topic_count": len(topics), "library_documents": len(SEED_LIBRARY_DOCUMENTS)},
        )
        self.planner_agent.rebuild_roadmap(learner_id)
        learner = self.storage.fetch_one("SELECT * FROM learners WHERE id = ?", (learner_id,))
        return self.serialize_learner(learner)

    def serialize_learner(self, learner: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": learner["id"],
            "name": learner["name"],
            "goal": learner["goal"],
            "pace_preference": learner["pace_preference"],
            "difficulty_tolerance": learner["difficulty_tolerance"],
            "preferred_styles": self.storage.loads(learner["preferred_styles"], []),
            "xp": learner["xp"],
            "level": learner["level"],
            "streak_days": learner["streak_days"],
            "last_activity_at": learner["last_activity_at"],
        }

    def get_workspace(self, learner_id: str) -> dict[str, Any]:
        learner = self.storage.fetch_one("SELECT * FROM learners WHERE id = ?", (learner_id,))
        if not learner:
            self.bootstrap_learner(learner_id=learner_id)
            learner = self.storage.fetch_one("SELECT * FROM learners WHERE id = ?", (learner_id,))

        self.planner_agent.rebuild_roadmap(learner_id)
        roadmap_rows = self.storage.fetch_all(
            """
            SELECT t.id, t.title, t.domain, t.description, t.difficulty, t.estimated_minutes,
                   r.status, r.priority, r.sequence_position, r.recommended_action, r.confidence,
                   m.score, m.trend, m.weak_signals, m.strong_signals
            FROM roadmap_items r
            JOIN topics t ON t.id = r.topic_id
            LEFT JOIN mastery_records m ON m.learner_id = r.learner_id AND m.topic_id = r.topic_id
            WHERE r.learner_id = ?
            ORDER BY r.sequence_position ASC
            """,
            (learner_id,),
        )
        roadmap = []
        mastery_snapshot = []
        for row in roadmap_rows:
            mastery_score = round(float(row["score"] or 0), 1)
            roadmap.append(
                {
                    "topic_id": row["id"],
                    "title": row["title"],
                    "domain": row["domain"],
                    "description": row["description"],
                    "difficulty": row["difficulty"],
                    "estimated_minutes": row["estimated_minutes"],
                    "status": row["status"],
                    "priority": row["priority"],
                    "sequence_position": row["sequence_position"],
                    "recommended_action": row["recommended_action"],
                    "confidence": row["confidence"],
                    "mastery_score": mastery_score,
                    "trend": row["trend"] or "steady",
                }
            )
            mastery_snapshot.append(
                {
                    "topic_id": row["id"],
                    "title": row["title"],
                    "domain": row["domain"],
                    "score": mastery_score,
                    "trend": row["trend"] or "steady",
                    "weak_signals": self.storage.loads(row["weak_signals"], []),
                    "strong_signals": self.storage.loads(row["strong_signals"], []),
                }
            )

        recent_attempts = self.storage.fetch_all(
            """
            SELECT q.id AS quiz_id, t.title, a.score, a.duration_sec, a.created_at, a.evaluation
            FROM quiz_attempts a
            JOIN quizzes q ON q.id = a.quiz_id
            JOIN topics t ON t.id = a.topic_id
            WHERE a.learner_id = ?
            ORDER BY a.created_at DESC
            LIMIT 5
            """,
            (learner_id,),
        )
        recent_quizzes = []
        for row in recent_attempts:
            evaluation = self.storage.loads(row["evaluation"], {})
            recent_quizzes.append(
                {
                    "quiz_id": row["quiz_id"],
                    "title": row["title"],
                    "score": row["score"],
                    "duration_sec": row["duration_sec"],
                    "created_at": row["created_at"],
                    "remediation": evaluation.get("remediation"),
                }
            )

        documents = self.storage.fetch_all(
            "SELECT id, title, source_type, metadata, created_at FROM documents WHERE learner_id = ? ORDER BY created_at DESC LIMIT 8",
            (learner_id,),
        )
        retrieval_library = []
        for row in documents:
            metadata = self.storage.loads(row["metadata"], {})
            retrieval_library.append(
                {
                    "document_id": row["id"],
                    "title": row["title"],
                    "source_type": row["source_type"],
                    "chunk_count": metadata.get("chunk_count", 0),
                    "created_at": row["created_at"],
                }
            )

        achievements = self.storage.fetch_all(
            "SELECT code, title, description, unlocked_at FROM achievements WHERE learner_id = ? ORDER BY unlocked_at DESC",
            (learner_id,),
        )
        memory = self.memory_agent.recent(learner_id)
        average_mastery = round(sum(item["score"] for item in mastery_snapshot) / max(1, len(mastery_snapshot)), 1)
        analytics = {
            "average_mastery": average_mastery,
            "focus_topics": len([item for item in roadmap if item["status"] == "focus"]),
            "mastered_topics": len([item for item in roadmap if item["status"] == "mastered"]),
            "active_documents": len(retrieval_library),
            "memory_events": len(memory),
            "plan_completion_signal": round(len([item for item in recent_quizzes if item["score"] >= 70]) / max(1, len(recent_quizzes)) * 100, 1),
        }
        low_mastery = [item["title"] for item in mastery_snapshot if item["score"] < 60][:2]
        high_mastery = [item["title"] for item in mastery_snapshot if item["score"] >= 75][:2]
        recommendations = []
        if low_mastery:
            recommendations.append(f"Move {', '.join(low_mastery)} into short daily remediation blocks.")
        if high_mastery:
            recommendations.append(f"Use {', '.join(high_mastery)} for transfer practice and stretch tasks.")
        recommendations.append("Ingest class notes or handouts into the memory library before the next tutoring session.")
        return {
            "learner": self.serialize_learner(learner),
            "today_plan": self.planner_agent.build_today_plan(learner_id),
            "roadmap": roadmap,
            "mastery_snapshot": mastery_snapshot,
            "analytics": analytics,
            "recent_quizzes": recent_quizzes,
            "achievements": achievements,
            "retrieval_library": retrieval_library,
            "recommendations": recommendations,
        }

    def generate_quiz(self, learner_id: str, topic_id: str, question_count: int) -> dict[str, Any]:
        self.bootstrap_learner(learner_id=learner_id)
        return self.quiz_agent.generate_quiz(learner_id, topic_id, question_count)

    def submit_quiz(self, learner_id: str, quiz_id: str, answers: list[str], duration_sec: float) -> dict[str, Any]:
        evaluation = self.analyzer_agent.evaluate_quiz(learner_id, quiz_id, answers, duration_sec)
        quiz = self.storage.fetch_one("SELECT topic_id FROM quizzes WHERE id = ?", (quiz_id,))
        if quiz:
            self.memory_agent.remember(learner_id, "quiz", "Quiz evaluation stored", {"quiz_id": quiz_id, "topic_id": quiz["topic_id"], "score": evaluation["score"]})
        self.planner_agent.rebuild_roadmap(learner_id)
        evaluation["achievements"] = self.gamification_agent.award_for_quiz(learner_id, evaluation["score"])
        evaluation["workspace"] = self.get_workspace(learner_id)
        return evaluation

    def tutor(self, learner_id: str, topic_id: str, question: str) -> dict[str, Any]:
        self.bootstrap_learner(learner_id=learner_id)
        return self.tutor_agent.answer(learner_id, topic_id, question)

    def capture_feedback(self, learner_id: str, topic_id: str, confidence: float, focus_minutes: float, friction: str, notes: str) -> dict[str, Any]:
        event_id = str(uuid.uuid4())
        self.storage.execute(
            """
            INSERT INTO feedback_events (id, learner_id, topic_id, confidence, focus_minutes, friction, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (event_id, learner_id, topic_id, confidence, focus_minutes, friction, notes, utc_now()),
        )
        mastery = self.storage.fetch_one("SELECT score, weak_signals, strong_signals FROM mastery_records WHERE learner_id = ? AND topic_id = ?", (learner_id, topic_id))
        current = float(mastery["score"]) if mastery else 35.0
        adjustment = (confidence - 0.5) * 12 + (4 if friction == "low" else -6 if friction == "high" else 0)
        updated_score = round(max(0, min(100, current + adjustment)), 1)
        weak = self.storage.loads(mastery["weak_signals"] if mastery else None, [])
        strong = self.storage.loads(mastery["strong_signals"] if mastery else None, [])
        if friction == "high":
            weak = list(dict.fromkeys(weak + ["fatigue", "high friction"]))
        elif confidence >= 0.7:
            strong = list(dict.fromkeys(strong + ["self-reported confidence"]))
        trend = "rising" if updated_score > current else "steady" if updated_score == current else "recovering"
        attempts = self.storage.fetch_one("SELECT attempts, last_score FROM mastery_records WHERE learner_id = ? AND topic_id = ?", (learner_id, topic_id))
        self.storage.execute(
            """
            INSERT INTO mastery_records (
                learner_id, topic_id, score, attempts, average_latency_sec, trend,
                weak_signals, strong_signals, last_score, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(learner_id, topic_id) DO UPDATE SET
                score = excluded.score,
                attempts = excluded.attempts,
                average_latency_sec = excluded.average_latency_sec,
                trend = excluded.trend,
                weak_signals = excluded.weak_signals,
                strong_signals = excluded.strong_signals,
                last_score = excluded.last_score,
                updated_at = excluded.updated_at
            """,
            (
                learner_id,
                topic_id,
                updated_score,
                attempts["attempts"] if attempts else 0,
                focus_minutes * 60,
                trend,
                self.storage.dumps(weak[:5]),
                self.storage.dumps(strong[:5]),
                attempts["last_score"] if attempts else 0,
                utc_now(),
            ),
        )
        self.memory_agent.remember(
            learner_id,
            "feedback",
            "Lesson feedback incorporated into adaptive model",
            {"topic_id": topic_id, "confidence": confidence, "friction": friction, "notes": notes},
        )
        self.planner_agent.rebuild_roadmap(learner_id)
        return {"event_id": event_id, "updated_score": updated_score, "workspace": self.get_workspace(learner_id)}

    def ingest_document(self, learner_id: str, title: str, content: str, source_type: str, source_path: str | None) -> dict[str, Any]:
        self.bootstrap_learner(learner_id=learner_id)
        result = self.retrieval_agent.ingest_document(learner_id, title, content, source_type, source_path)
        self.memory_agent.remember(learner_id, "library", "New resource ingested into retrieval memory", {"title": title, "source_type": source_type})
        return {**result, "workspace": self.get_workspace(learner_id)}

    def search_library(self, learner_id: str, query: str) -> list[dict[str, Any]]:
        self.bootstrap_learner(learner_id=learner_id)
        return self.retrieval_agent.search(learner_id, query)


learning_os_service = LearningOSService()
