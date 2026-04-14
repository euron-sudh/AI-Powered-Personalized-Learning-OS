from __future__ import annotations

import logging
import math
import re
import uuid
from collections import Counter
from pathlib import Path
from typing import Any

from app.config import settings
from app.learning_os.storage import LearningOSStorage, utc_now

log = logging.getLogger(__name__)

TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9']+")

OPENAI_EMBED_DIMENSIONS = 512
OPENAI_EMBED_MODEL = "text-embedding-3-small"


def tokenize(text: str) -> list[str]:
    return [token.lower() for token in TOKEN_PATTERN.findall(text)]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        return 0.0
    numerator = sum(x * y for x, y in zip(a, b))
    denom_a = math.sqrt(sum(x * x for x in a))
    denom_b = math.sqrt(sum(y * y for y in b))
    if denom_a == 0 or denom_b == 0:
        return 0.0
    return numerator / (denom_a * denom_b)


class RetrievalAgent:
    def __init__(self, storage: LearningOSStorage):
        self.storage = storage
        self._openai_available = bool(settings.openai_api_key)
        self.dimensions = OPENAI_EMBED_DIMENSIONS if self._openai_available else settings.rag_embedding_dimensions

    def embed(self, text: str) -> list[float]:
        if self._openai_available:
            return self._embed_openai(text)
        return self._embed_hash(text)

    def _embed_openai(self, text: str) -> list[float]:
        try:
            from app.core.ai_client import openai_sync_client
            response = openai_sync_client.embeddings.create(
                model=OPENAI_EMBED_MODEL,
                input=text,
                dimensions=OPENAI_EMBED_DIMENSIONS,
            )
            return response.data[0].embedding
        except Exception as exc:
            log.warning("OpenAI embed failed (%s), falling back to hash", exc)
            self._openai_available = False
            self.dimensions = settings.rag_embedding_dimensions
            return self._embed_hash(text)

    def _embed_hash(self, text: str) -> list[float]:
        dims = settings.rag_embedding_dimensions
        vector = [0.0] * dims
        counts = Counter(tokenize(text))
        for token, count in counts.items():
            idx = hash(token) % dims
            vector[idx] += float(count)
        norm = math.sqrt(sum(v * v for v in vector))
        if norm:
            vector = [v / norm for v in vector]
        return vector

    def chunk_text(self, content: str, chunk_size: int = 420) -> list[str]:
        words = content.split()
        if not words:
            return []
        return [" ".join(words[start:start + chunk_size]) for start in range(0, len(words), chunk_size)]

    def ingest_document(self, learner_id: str, title: str, content: str,
                        source_type: str = "notes", source_path: str | None = None) -> dict:
        if source_path and Path(source_path).suffix.lower() == ".pdf":
            raise ValueError("PDF path ingestion requires a PDF parser dependency that is not installed.")
        document_id = str(uuid.uuid4())
        chunks = self.chunk_text(content)
        embed_model = OPENAI_EMBED_MODEL if self._openai_available else "hash"
        metadata = {"source_path": source_path, "chunk_count": len(chunks), "embed_model": embed_model}
        self.storage.execute(
            "INSERT INTO documents (id, learner_id, title, source_type, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (document_id, learner_id, title, source_type, self.storage.dumps(metadata), utc_now()),
        )
        rows = []
        for index, chunk in enumerate(chunks):
            keywords = list(dict.fromkeys(tokenize(chunk)))[:10]
            rows.append((str(uuid.uuid4()), document_id, learner_id, index, chunk,
                         self.storage.dumps(keywords), self.storage.dumps(self.embed(chunk)), utc_now()))
        if rows:
            self.storage.executemany(
                "INSERT INTO document_chunks (id, document_id, learner_id, chunk_index, content, keywords, embedding, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                rows,
            )
        return {"document_id": document_id, "title": title, "source_type": source_type,
                "chunk_count": len(chunks), "embed_model": embed_model}

    def reindex_document(self, document_id: str, learner_id: str) -> dict:
        chunks = self.storage.fetch_all(
            "SELECT id, content FROM document_chunks WHERE document_id = ? AND learner_id = ?",
            (document_id, learner_id),
        )
        if not chunks:
            raise ValueError(f"No chunks found for document {document_id}")
        embed_model = OPENAI_EMBED_MODEL if self._openai_available else "hash"
        for chunk in chunks:
            self.storage.execute(
                "UPDATE document_chunks SET embedding = ? WHERE id = ?",
                (self.storage.dumps(self.embed(chunk["content"])), chunk["id"]),
            )
        doc = self.storage.fetch_one("SELECT metadata FROM documents WHERE id = ?", (document_id,))
        if doc:
            meta = self.storage.loads(doc["metadata"], {})
            meta["embed_model"] = embed_model
            self.storage.execute("UPDATE documents SET metadata = ? WHERE id = ?",
                                 (self.storage.dumps(meta), document_id))
        return {"document_id": document_id, "chunks_reindexed": len(chunks), "embed_model": embed_model}

    def reindex_all(self, learner_id: str) -> dict:
        docs = self.storage.fetch_all("SELECT id, title FROM documents WHERE learner_id = ?", (learner_id,))
        results = []
        for doc in docs:
            result = self.reindex_document(doc["id"], learner_id)
            result["title"] = doc["title"]
            results.append(result)
        return {"reindexed": results, "total": len(results)}

    def search(self, learner_id: str, query: str, limit: int = 5) -> list[dict]:
        rows = self.storage.fetch_all(
            """SELECT c.content, c.keywords, c.embedding, d.title, d.source_type, d.id AS document_id
               FROM document_chunks c
               JOIN documents d ON d.id = c.document_id
               WHERE c.learner_id = ?""",
            (learner_id,),
        )
        query_vector = self.embed(query)
        scored = []
        for row in rows:
            stored_vec = self.storage.loads(row["embedding"], [])
            similarity = cosine_similarity(query_vector, stored_vec)
            overlap = len(set(tokenize(query)) & set(self.storage.loads(row["keywords"], [])))
            scored.append({
                "document_id": row["document_id"],
                "title": row["title"],
                "source_type": row["source_type"],
                "content": row["content"],
                "score": round(similarity + overlap * 0.03, 4),
            })
        scored.sort(key=lambda item: item["score"], reverse=True)
        return scored[:limit]


class MemoryAgent:
    def __init__(self, storage: LearningOSStorage):
        self.storage = storage

    def remember(self, learner_id: str, category: str, summary: str, payload: dict) -> None:
        self.storage.execute(
            "INSERT INTO memory_events (id, learner_id, category, summary, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), learner_id, category, summary, self.storage.dumps(payload), utc_now()),
        )

    def recent(self, learner_id: str, limit: int = 6) -> list[dict]:
        rows = self.storage.fetch_all(
            """SELECT category, summary, payload, created_at
               FROM memory_events WHERE learner_id = ?
               ORDER BY created_at DESC LIMIT ?""",
            (learner_id, limit),
        )
        for row in rows:
            row["payload"] = self.storage.loads(row["payload"], {})
        return rows