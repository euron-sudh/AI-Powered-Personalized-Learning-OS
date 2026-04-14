from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.learning_os.retrieval import MemoryAgent, RetrievalAgent, tokenize
from app.learning_os.storage import LearningOSStorage, utc_now


class PlannerAgent:
    def __init__(self, storage: LearningOSStorage):
        self.storage = storage

    def rebuild_roadmap(self, learner_id: str) -> None:
        rows = self.storage.fetch_all(
            """
            SELECT r.topic_id, t.prerequisites, m.score, m.trend
            FROM roadmap_items r
            JOIN topics t ON t.id = r.topic_id
            LEFT JOIN mastery_records m ON m.learner_id = r.learner_id AND m.topic_id = r.topic_id
            WHERE r.learner_id = ?
            """,
            (learner_id,),
        )
        scored = []
        for row in rows:
            mastery = float(row["score"] or 35)
            prerequisites = self.storage.loads(row["prerequisites"], [])
            ready_ratio = 0.0
            if prerequisites:
                cleared = 0
                for prerequisite in prerequisites:
                    pre = self.storage.fetch_one(
                        "SELECT score FROM mastery_records WHERE learner_id = ? AND topic_id = ?",
                        (learner_id, prerequisite),
                    )
                    if pre and float(pre["score"]) >= 65:
                        cleared += 1
                ready_ratio = cleared / len(prerequisites)
            urgency = (100 - mastery) / 100
            trend = row["trend"] or "steady"
            trend_bonus = 0.18 if trend == "rising" else 0.3 if trend == "recovering" else 0.4
            priority = round(urgency + ready_ratio * 0.3 + trend_bonus, 4)
            if mastery >= 82:
                status = "mastered"
                recommended = "Review with spaced repetition and one transfer question."
            elif mastery >= 60:
                status = "practicing"
                recommended = "Hold momentum with a short quiz and one reflective explanation."
            else:
                status = "focus"
                recommended = "Move this topic into remediation with examples, feedback, and reteach."
            scored.append((priority, status, recommended, row["topic_id"]))
        scored.sort(key=lambda item: item[0], reverse=True)
        for index, (priority, status, recommended, topic_id) in enumerate(scored, start=1):
            confidence = round(max(0.2, min(0.95, 1 - priority / 2)), 3)
            next_review = (datetime.now(timezone.utc) + timedelta(days=1 if status == "focus" else 3)).isoformat()
            self.storage.execute(
                """
                UPDATE roadmap_items
                SET status = ?, priority = ?, sequence_position = ?, recommended_action = ?,
                    next_review_at = ?, confidence = ?, updated_at = ?
                WHERE learner_id = ? AND topic_id = ?
                """,
                (
                    status,
                    priority,
                    index,
                    recommended,
                    next_review,
                    confidence,
                    utc_now(),
                    learner_id,
                    topic_id,
                ),
            )

    def build_today_plan(self, learner_id: str) -> list[dict[str, Any]]:
        rows = self.storage.fetch_all(
            """
            SELECT t.id, t.title, t.domain, t.estimated_minutes, r.status, r.recommended_action, m.score, m.trend
            FROM roadmap_items r
            JOIN topics t ON t.id = r.topic_id
            LEFT JOIN mastery_records m ON m.learner_id = r.learner_id AND m.topic_id = r.topic_id
            WHERE r.learner_id = ?
            ORDER BY r.sequence_position ASC
            LIMIT 3
            """,
            (learner_id,),
        )
        return [
            {
                "topic_id": row["id"],
                "title": row["title"],
                "domain": row["domain"],
                "estimated_minutes": row["estimated_minutes"],
                "mastery_score": round(float(row["score"] or 35), 1),
                "status": row["status"],
                "trend": row["trend"] or "steady",
                "mission": row["recommended_action"],
            }
            for row in rows
        ]


class QuizAgent:
    def __init__(self, storage: LearningOSStorage):
        self.storage = storage

    def generate_quiz(self, learner_id: str, topic_id: str, question_count: int) -> dict[str, Any]:
        topic = self.storage.fetch_one("SELECT * FROM topics WHERE id = ?", (topic_id,))
        if not topic:
            raise ValueError("Unknown topic")
        bank = self.storage.loads(topic["quiz_bank"], [])
        questions = bank[:question_count]
        quiz_id = str(uuid.uuid4())
        self.storage.execute(
            """
            INSERT INTO quizzes (id, learner_id, topic_id, questions, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (quiz_id, learner_id, topic_id, self.storage.dumps(questions), utc_now()),
        )
        public_questions = []
        for question in questions:
            public_question = {key: value for key, value in question.items() if key not in {"answer", "answer_keywords", "ideal_answer"}}
            public_questions.append(public_question)
        return {"quiz_id": quiz_id, "topic_id": topic_id, "title": topic["title"], "questions": public_questions}


class AnalyzerAgent:
    def __init__(self, storage: LearningOSStorage):
        self.storage = storage

    def evaluate_quiz(self, learner_id: str, quiz_id: str, answers: list[str], duration_sec: float) -> dict[str, Any]:
        quiz = self.storage.fetch_one("SELECT * FROM quizzes WHERE id = ?", (quiz_id,))
        if not quiz:
            raise ValueError("Quiz not found")
        questions = self.storage.loads(quiz["questions"], [])
        evaluation_items = []
        earned = 0.0
        weak_signals: list[str] = []
        strong_signals: list[str] = []
        for index, question in enumerate(questions):
            answer = answers[index] if index < len(answers) else ""
            if question["type"] == "mcq":
                correct = answer.strip().lower() == str(question["answer"]).strip().lower()
                item_score = 1.0 if correct else 0.0
                expected = question["answer"]
            else:
                matched = sum(1 for keyword in question.get("answer_keywords", []) if keyword.lower() in answer.lower())
                item_score = min(1.0, matched / max(1, min(3, len(question.get("answer_keywords", [])))))
                correct = item_score >= 0.6
                expected = question.get("ideal_answer", "")
            if correct:
                strong_signals.append("accurate retrieval" if question["type"] == "mcq" else "constructed explanation")
            else:
                weak_signals.append("missed key concept" if question["type"] == "mcq" else "thin reasoning")
            earned += item_score
            evaluation_items.append(
                {
                    "prompt": question["prompt"],
                    "answer": answer,
                    "correct": correct,
                    "score": round(item_score * 100, 1),
                    "expected": expected,
                    "explanation": question["explanation"],
                }
            )
        score = round((earned / max(1, len(questions))) * 100, 1)
        topic_id = quiz["topic_id"]
        topic = self.storage.fetch_one("SELECT title FROM topics WHERE id = ?", (topic_id,))
        evaluation = {
            "score": score,
            "topic_id": topic_id,
            "items": evaluation_items,
            "remediation": (
                f"Return to {topic['title']} with one worked example, then explain the idea aloud before retrying."
                if score < 70
                else f"Advance to application tasks for {topic['title']} and schedule a review in 3 days."
            ),
            "coach_summary": (
                "Strong retention with room to deepen transfer."
                if score >= 80
                else "Conceptual understanding is forming, but a few gaps still need targeted practice."
                if score >= 60
                else "The system detected fragile understanding and moved this topic forward in the roadmap."
            ),
        }
        self.storage.execute(
            """
            INSERT INTO quiz_attempts (id, quiz_id, learner_id, topic_id, answers, evaluation, score, duration_sec, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                quiz_id,
                learner_id,
                topic_id,
                self.storage.dumps(answers),
                self.storage.dumps(evaluation),
                score,
                duration_sec,
                utc_now(),
            ),
        )
        previous = self.storage.fetch_one(
            "SELECT score, attempts, average_latency_sec FROM mastery_records WHERE learner_id = ? AND topic_id = ?",
            (learner_id, topic_id),
        )
        old_score = float(previous["score"]) if previous else 35.0
        attempts = int(previous["attempts"]) + 1 if previous else 1
        avg_latency = (((float(previous["average_latency_sec"]) * (attempts - 1)) + duration_sec) / attempts) if previous else duration_sec
        blended_score = round(old_score * 0.45 + score * 0.55, 1)
        trend = "rising" if score >= 75 else "recovering" if score >= 55 else "needs_support"
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
                blended_score,
                attempts,
                round(avg_latency, 2),
                trend,
                self.storage.dumps(sorted(set(weak_signals))[:5]),
                self.storage.dumps(sorted(set(strong_signals))[:5]),
                score,
                utc_now(),
            ),
        )
        return evaluation


class GamificationAgent:
    def __init__(self, storage: LearningOSStorage):
        self.storage = storage

    def award_for_quiz(self, learner_id: str, score: float) -> list[dict[str, Any]]:
        learner = self.storage.fetch_one("SELECT xp, level, streak_days, last_activity_at FROM learners WHERE id = ?", (learner_id,))
        if not learner:
            return []
        xp_gain = int(18 + score * 0.7)
        current_xp = int(learner["xp"]) + xp_gain
        new_level = max(1, current_xp // 120 + 1)
        streak = int(learner["streak_days"])
        now = datetime.now(timezone.utc)
        last_activity = learner["last_activity_at"]
        if last_activity:
            previous = datetime.fromisoformat(last_activity)
            delta_days = (now.date() - previous.date()).days
            streak = streak + 1 if delta_days == 1 else 1 if delta_days > 1 else streak
        else:
            streak = 1
        self.storage.execute(
            "UPDATE learners SET xp = ?, level = ?, streak_days = ?, last_activity_at = ?, updated_at = ? WHERE id = ?",
            (current_xp, new_level, streak, now.isoformat(), utc_now(), learner_id),
        )
        unlocked = []
        if streak >= 3:
            unlocked.extend(self.unlock(learner_id, "streak-3", "3-Day Streak", "Stayed active for three consecutive days."))
        if score >= 85:
            unlocked.extend(self.unlock(learner_id, "quiz-sharp", "Sharp Solver", "Scored 85 or above on a quiz."))
        if new_level >= 3:
            unlocked.extend(self.unlock(learner_id, "level-3", "Momentum Builder", "Reached level 3 through consistent practice."))
        return unlocked

    def unlock(self, learner_id: str, code: str, title: str, description: str) -> list[dict[str, Any]]:
        exists = self.storage.fetch_one("SELECT code FROM achievements WHERE learner_id = ? AND code = ?", (learner_id, code))
        if exists:
            return []
        achievement = {"code": code, "title": title, "description": description, "unlocked_at": utc_now()}
        self.storage.execute(
            "INSERT INTO achievements (code, learner_id, title, description, unlocked_at) VALUES (?, ?, ?, ?, ?)",
            (code, learner_id, title, description, achievement["unlocked_at"]),
        )
        return [achievement]


class TutorAgent:
    def __init__(self, storage: LearningOSStorage, retrieval_agent: RetrievalAgent, memory_agent: MemoryAgent):
        self.storage = storage
        self.retrieval_agent = retrieval_agent
        self.memory_agent = memory_agent

    def answer(self, learner_id: str, topic_id: str, question: str) -> dict[str, Any]:
        topic = self.storage.fetch_one("SELECT * FROM topics WHERE id = ?", (topic_id,))
        mastery = self.storage.fetch_one("SELECT * FROM mastery_records WHERE learner_id = ? AND topic_id = ?", (learner_id, topic_id))
        retrieval = self.retrieval_agent.search(learner_id, f"{topic['title']} {question}", limit=3)
        score = round(float(mastery["score"]) if mastery else 35.0, 1)
        mode = "scaffold" if score < 60 else "challenge" if score > 80 else "coach"
        context = " ".join(item["content"] for item in retrieval[:2]) if retrieval else "No external notes were needed, so the tutor is using the system knowledge base."
        answer = (
            f"{topic['title']} sits at a mastery score of {score}. "
            f"Anchor on this idea: {topic['lesson_summary']} "
            f"Next move: {'work through one concrete example before abstracting' if mode == 'scaffold' else 'compare two solution strategies and justify the better one' if mode == 'challenge' else 'explain the concept in your own words, then test it with a short example'}. "
            f"Relevant context: {context}"
        )
        follow_up = (
            "What single cause-and-effect rule should you remember from this topic?"
            if mode == "scaffold"
            else "How would the same idea behave in a new scenario?"
        )
        self.memory_agent.remember(learner_id, "tutor", f"Tutor coached {topic['title']}", {"topic_id": topic_id, "question": question, "mode": mode})
        return {"answer": answer, "follow_up_prompt": follow_up, "mode": mode, "retrieval_hits": retrieval}
