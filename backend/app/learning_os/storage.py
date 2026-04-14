from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from app.config import settings


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class LearningOSStorage:
    def __init__(self, db_path: str | None = None):
        self.db_path = Path(db_path or settings.local_db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialized = False

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=MEMORY;")
        conn.execute("PRAGMA synchronous=OFF;")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def initialize(self) -> None:
        if self._initialized:
            return
        with self.connection() as conn:
            conn.executescript(
                """
                PRAGMA foreign_keys = ON;

                CREATE TABLE IF NOT EXISTS learners (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    goal TEXT NOT NULL,
                    pace_preference TEXT NOT NULL,
                    difficulty_tolerance REAL NOT NULL,
                    preferred_styles TEXT NOT NULL,
                    xp INTEGER NOT NULL DEFAULT 0,
                    level INTEGER NOT NULL DEFAULT 1,
                    streak_days INTEGER NOT NULL DEFAULT 0,
                    last_activity_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS topics (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    description TEXT NOT NULL,
                    difficulty TEXT NOT NULL,
                    estimated_minutes INTEGER NOT NULL,
                    tags TEXT NOT NULL,
                    prerequisites TEXT NOT NULL,
                    lesson_summary TEXT NOT NULL,
                    concepts TEXT NOT NULL,
                    quiz_bank TEXT NOT NULL,
                    retrieval_notes TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS roadmap_items (
                    learner_id TEXT NOT NULL,
                    topic_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    priority REAL NOT NULL,
                    sequence_position INTEGER NOT NULL,
                    recommended_action TEXT NOT NULL,
                    next_review_at TEXT,
                    confidence REAL NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (learner_id, topic_id)
                );

                CREATE TABLE IF NOT EXISTS mastery_records (
                    learner_id TEXT NOT NULL,
                    topic_id TEXT NOT NULL,
                    score REAL NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    average_latency_sec REAL NOT NULL DEFAULT 0,
                    trend TEXT NOT NULL,
                    weak_signals TEXT NOT NULL,
                    strong_signals TEXT NOT NULL,
                    last_score REAL NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (learner_id, topic_id)
                );

                CREATE TABLE IF NOT EXISTS quizzes (
                    id TEXT PRIMARY KEY,
                    learner_id TEXT NOT NULL,
                    topic_id TEXT NOT NULL,
                    questions TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS quiz_attempts (
                    id TEXT PRIMARY KEY,
                    quiz_id TEXT NOT NULL,
                    learner_id TEXT NOT NULL,
                    topic_id TEXT NOT NULL,
                    answers TEXT NOT NULL,
                    evaluation TEXT NOT NULL,
                    score REAL NOT NULL,
                    duration_sec REAL NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS feedback_events (
                    id TEXT PRIMARY KEY,
                    learner_id TEXT NOT NULL,
                    topic_id TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    focus_minutes REAL NOT NULL,
                    friction TEXT NOT NULL,
                    notes TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS memory_events (
                    id TEXT PRIMARY KEY,
                    learner_id TEXT NOT NULL,
                    category TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    learner_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    metadata TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS document_chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    learner_id TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    keywords TEXT NOT NULL,
                    embedding TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS achievements (
                    code TEXT NOT NULL,
                    learner_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    unlocked_at TEXT NOT NULL,
                    PRIMARY KEY (code, learner_id)
                );
                """
            )
        self._initialized = True

    def fetch_one(self, query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        self.initialize()
        with self.connection() as conn:
            row = conn.execute(query, params).fetchone()
            return dict(row) if row else None

    def fetch_all(self, query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        self.initialize()
        with self.connection() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]

    def execute(self, query: str, params: tuple[Any, ...] = ()) -> None:
        self.initialize()
        with self.connection() as conn:
            conn.execute(query, params)

    def executemany(self, query: str, params: list[tuple[Any, ...]]) -> None:
        self.initialize()
        with self.connection() as conn:
            conn.executemany(query, params)

    @staticmethod
    def dumps(value: Any) -> str:
        return json.dumps(value, ensure_ascii=True)

    @staticmethod
    def loads(value: str | None, default: Any) -> Any:
        if not value:
            return default
        return json.loads(value)
