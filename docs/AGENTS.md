**Last Updated:** 2026-04-19 09:51

# AGENTS.md — LearnOS Project Guide for Codex

This file provides the authoritative context for automated agents (Codex, etc.) working in this repository.

---

## Project Summary

LearnOS is an AI-powered adaptive learning OS for K-12 students. The active, working implementation uses:

- **Backend**: Python FastAPI with a SQLite-backed multi-agent learning engine (`/api/system/*`)
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Recharts

The classic Supabase/PostgreSQL routes (`/api/lessons/*`, `/api/curriculum/*`) are scaffolded but not actively used by the frontend.

---

## Repository Layout

```
project4/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app entry (lifespan, CORS, Sentry)
│   │   ├── config.py                   # Pydantic Settings (reads .env)
│   │   ├── learning_os/                # ← PRIMARY ACTIVE ENGINE
│   │   │   ├── service.py              # LearningOSService (7 agents, all business logic)
│   │   │   ├── router.py               # /api/system/* endpoints (7 routes)
│   │   │   ├── schemas.py              # Pydantic request/response models
│   │   │   ├── adaptive.py             # Adaptive difficulty / planner logic
│   │   │   ├── retrieval.py            # RAG vector search (192-dim token embeddings)
│   │   │   ├── storage.py              # SQLite persistence layer (11 tables)
│   │   │   └── seed.py                 # Demo learner + topic/quiz/document seed data
│   │   ├── routers/                    # REST routes (legacy / scaffolded)
│   │   └── services/                   # Claude/OpenAI service wrappers (scaffolded)
│   ├── tests/                          # pytest suite
│   │   └── conftest.py                 # Shared fixtures (mock Claude, mock Supabase)
│   └── pyproject.toml                  # pytest config: asyncio_mode=auto, testpaths=tests
└── frontend/
    ├── src/
    │   ├── app/                        # Next.js App Router pages
    │   │   ├── layout.tsx              # Root layout (IBM Plex Sans + Space Grotesk fonts)
    │   │   ├── page.tsx                # Landing page
    │   │   ├── dashboard/page.tsx      # Dashboard (uses LearningWorkspace)
    │   │   ├── analytics/page.tsx      # Analytics view
    │   │   ├── learn/                  # Subject → Chapter → Activity routes
    │   │   ├── tutor/page.tsx          # Tutor chat page
    │   │   └── api/proxy/[...path]/    # Backend proxy route
    │   ├── components/
    │   │   ├── learning-os/
    │   │   │   └── LearningWorkspace.tsx  # Main interactive workspace component
    │   │   └── ui/                     # shadcn/ui primitives
    │   ├── lib/
    │   │   ├── learning-os.ts          # Typed API wrappers for /api/system/*
    │   │   └── api.ts                  # Generic fetch wrapper (4-min auth cache, 5-min response cache)
    │   ├── hooks/                      # useVoiceChat, useVideoFeed, useSentiment, useSupabaseAuth
    │   └── types/                      # curriculum.ts, lesson.ts, student.ts, sentiment.ts
    ├── tests/
    │   ├── unit/                       # Vitest unit tests
    │   └── e2e/                        # Playwright e2e tests
    └── package.json
```

---

## Active API Endpoints (`/api/system/*`)

| Method | Route | Handler | Description |
|--------|-------|---------|-------------|
| POST | `/api/system/learners/bootstrap` | `bootstrap_learner` | Create/initialize a learner |
| GET | `/api/system/workspace/{learner_id}` | `get_workspace` | Full workspace dump (plan, roadmap, analytics) |
| POST | `/api/system/quizzes/generate` | `generate_quiz` | Create quiz for a topic |
| POST | `/api/system/quizzes/submit` | `submit_quiz` | Evaluate answers, update mastery |
| POST | `/api/system/tutor/query` | `tutor` | Scaffolded tutoring with retrieval context |
| POST | `/api/system/feedback/lesson` | `capture_feedback` | Submit confidence/friction feedback |
| POST | `/api/system/library/ingest` | `ingest_document` | Add document to vector store |
| POST | `/api/system/library/search` | `search_library` | Semantic search over documents |

Also: `GET /api/health` — returns status + `default_learner_id`

---

## Learning OS Agents (in `service.py`)

| Agent | Responsibility |
|-------|---------------|
| **RetrievalAgent** | RAG search over chunked documents (token-hash embeddings, cosine similarity) |
| **MemoryAgent** | Append-only event log (profile, quiz, feedback, tutor, library events) |
| **PlannerAgent** | Priority-scored roadmap (mastery + trend + prerequisite graph) |
| **QuizAgent** | Quiz generation from seeded `quiz_bank`; persists quiz metadata |
| **AnalyzerAgent** | Auto-grades MCQ (exact) + short-answer (keyword); blends scores: `0.45*old + 0.55*new` |
| **GamificationAgent** | XP, levels, streaks, achievements (3-day streak, score ≥ 85, level 3 unlock) |
| **TutorAgent** | Adaptive scaffolding/coaching/challenge modes based on mastery; uses retrieval context |

---

## SQLite Schema (11 tables via `storage.py`)

```
learners, topics, roadmap_items, mastery_records,
quizzes, quiz_attempts, feedback_events,
documents, document_chunks, memory_events, achievements
```

Database file: `backend/data/learning_os_v2.db`  
Default learner: `demo-learner` (seeded on startup)

---

## Environment Variables

### Backend (`backend/.env`)
```env
ANTHROPIC_API_KEY=        # Claude API (curriculum gen, teaching, eval)
OPENAI_API_KEY=           # OpenAI Realtime API (voice)
SUPABASE_URL=             # Optional (classic routes only)
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_DB_URL=
REDIS_URL=redis://localhost:6379
SENTRY_DSN=
LOCAL_DB_PATH=data/learning_os_v2.db
DEFAULT_LEARNER_ID=demo-learner
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SENTRY_DSN=    # If set, withSentryConfig wraps next.config.mjs
```

---

## Development Commands

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run backend tests
python -m pytest

# Frontend
cd frontend
npm install
npm run dev                    # http://localhost:3000
npm run build                  # Production validation (must pass before committing)
npx tsc --noEmit               # Type-check only (faster)
npm run test                   # Vitest unit tests
npm run test:e2e               # Playwright e2e

# Both (from repo root, Windows PowerShell)
.\tools\run-local-tests.ps1              # backend + frontend unit
.\tools\run-local-tests.ps1 -IncludeE2E # + e2e
```

---

## Known Build Constraints

- **`IBM_Plex_Sans` font** requires explicit `weight` array: `["400", "500", "600", "700"]`
- **JSX arrows**: Use `→` (Unicode) not `->` in JSX text — raw `->` triggers a TypeScript parse error
- **`npm run build`** is the authoritative validation step. `npx tsc --noEmit` is a faster preliminary check
- **`NEXT_PUBLIC_SENTRY_DSN`**: Only set if Sentry is configured — when set, `withSentryConfig` wraps the Next.js config; this is gated in `next.config.mjs`
- Sentry config files (`sentry.client.config.ts`, `sentry.server.config.ts`) guard on `NEXT_PUBLIC_SENTRY_DSN` before calling `Sentry.init()`

---

## Frontend Architecture Notes

- All backend calls go through `src/app/api/proxy/[...path]/route.ts` (server-side proxy, avoids CORS)
- `lib/learning-os.ts` provides typed wrappers: `getWorkspace()`, `generateQuiz()`, `submitQuiz()`, `queryTutor()`, `submitFeedback()`
- `lib/api.ts` handles auth token caching (4-min TTL) and response caching (5-min default)
- Main interactive UI lives in `components/learning-os/LearningWorkspace.tsx`
- Visualization libraries available: **Recharts** (charts), **Mermaid** (diagrams), **KaTeX** (formulas)

---

## Test Patterns

### Backend (pytest)
```python
# conftest.py provides:
sample_student, sample_chapter, sample_chapter_content, sample_activity_prompt

# Mock pattern for AI calls:
with patch("app.services.curriculum_generator.anthropic_client") as mock:
    mock.messages.create = AsyncMock(return_value=...)
```

### Frontend (Vitest)
```ts
// Tests in tests/unit/
// @testing-library/react + @testing-library/jest-dom available
```

### E2E (Playwright)
```ts
// Tests in tests/e2e/
// Config in playwright.config.ts
// Currently: auth.spec.ts
```

---

## Codex Task Progress (as of April 17 2026)

From the active Codex session "Build learning OS platform":

- [x] Audit current backend/frontend entrypoints and dependency constraints
- [x] Design a new modular learning OS domain model, storage layer, and service interfaces
- [x] Implement backend services for planning, tutoring, quizzes, mastery, memory, analytics, gamification, and retrieval
- [x] Wire new API routes and seed/sample data flows end-to-end
- [x] Refit the frontend into a dashboard-driven learning OS experience backed by the new APIs
- [x] Integrate Hybrid Architecture (Voice Chat + Webcam Sentiment analysis)
- [x] Finalize migration of all legacy frontend pages to the new Multi-Agent Engine
- [x] Update documentation with final architecture and timestamps

**Current blocker**: `npm run build` EPERM error in Codex's sandbox (spawn permission denied). The build itself is passing locally — `frontend/src/app/layout.tsx` weight fix and `LearningWorkspace.tsx` JSX arrow fix are both applied.

---

## What Codex Should Know

1. **Primary system is `learning_os/`** — the SQLite multi-agent engine. All new features should extend this, not the classic Supabase routes.
2. **Frontend ↔ Backend** talk via `/api/proxy/[...path]` — add new endpoints in `learning_os/router.py` and wire them via `lib/learning-os.ts`.
3. **The build passes** (`npm run build` succeeds locally, 19 pages). TypeScript types are clean.
4. **Do not use `->` in JSX text** — use `→` or wrap with `{">"}`.
5. **IBM_Plex_Sans** always needs `weight: ["400", "500", "600", "700"]` in the font config.
6. **Tests**: run `python -m pytest` from `backend/` and `npm run test` from `frontend/`. Both must pass.
7. **Seed data** (4 topics, 2 documents, 1 demo learner) is re-seeded on every `LearningOSService.initialize()` call — safe to re-run.
