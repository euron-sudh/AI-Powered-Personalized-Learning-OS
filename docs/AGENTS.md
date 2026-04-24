**Last Updated:** 2026-04-24

# AGENTS.md — LearnOS Project Guide for Codex / Automated Agents

Authoritative context for automated agents (Codex, Claude Code, etc.) working in this repo. For full architecture see [CLAUDE.md](../CLAUDE.md); for the file tree see [PROJECT_TREE.md](../PROJECT_TREE.md).

---

## Project Summary

LearnOS is an AI-powered K-12 learning platform. The stack is:

- **Backend**: Python 3.11+ FastAPI, SQLAlchemy (async) against Supabase PostgreSQL, Alembic migrations
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui
- **AI**: Claude API (curriculum, teaching, evaluation, story, doubt-scan), **Google Gemini Live** (voice S2S, `gemini-2.5-flash-native-audio-preview-09-2025`, with tool calls for visuals), OpenAI TTS (podcast only), Claude Vision (sentiment + doubt scanner), YouTube Data API v3 (backend-proxied video search for the `show_video` tool)

All Supabase/Postgres routes under `/api/*` are live and in use.

---

## Repository Layout (condensed)

```
LearnOS/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry (lifespan, CORS)
│   │   ├── config.py               # Pydantic Settings
│   │   ├── dependencies.py         # Auth + DB session injection
│   │   ├── routers/                # 25 routers (adds voice_gemini.py + youtube.py)
│   │   ├── services/               # 12 service modules
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── core/                   # supabase_client, ai_client, database, security
│   │   └── utils/                  # audio, image helpers
│   ├── alembic/versions/           # 0001–0011 migrations
│   └── tests/                      # pytest
└── frontend/
    ├── src/
    │   ├── app/                    # App Router routes (see PROJECT_TREE.md)
    │   ├── components/             # Nav, ProgressBar, SentimentIndicator, SubjectIcon, ui/
    │   ├── lib/                    # supabase.ts, api.ts, constants.ts, utils.ts
    │   ├── hooks/                  # useSupabaseAuth, useVoiceChat, useVideoFeed, useSentiment, useTutorSession
    │   └── types/                  # curriculum, lesson, student, sentiment
    └── package.json                # dev script uses cross-env NODE_OPTIONS=--max-http-header-size=65536
```

---

## Routers (`/api/*`)

Core: `auth`, `onboarding`, `curriculum`, `lessons`, `voice`, `video`, `activities`, `progress`, `learning`, `sessions`, `practice`, `notes`, `tutor_session`

Wave add-ons:
- **Wave 1 (gamification)**: `challenges`, `leaderboard`, `buddy`
- **Wave 2 (spaced repetition)**: `flashcards` (SM-2)
- **Wave 4 (parent/path)**: `parent`
- **Wave 5 (immersive)**: `immersive` (story / podcast / career / doubt-scan)
- **Wave 6 (wellness + projects)**: `wellness`, `projects`
- **Wave 7 (coach)**: `suggest` (next-best-action)

Full endpoint table in [PROJECT_TREE.md](../PROJECT_TREE.md#api-endpoint-summary).

---

## Services

| Service | Purpose |
|---|---|
| `curriculum_generator.py` | Claude-driven curriculum + chapter content + activity generation |
| `teaching_engine.py` | Streaming Socratic tutor with emotion-aware prompting |
| `activity_evaluator.py` | AI grading & feedback |
| `adaptive.py` | Concept mastery → chapter re-ordering + difficulty tuning |
| `sentiment_analyzer.py` | Claude Vision frame classification |
| `voice_manager.py` | **Legacy.** Kept alongside `voice.py` for historical reference; the active path is the `voice_gemini.py` router which proxies directly to Gemini Live. No service file is needed because Gemini's WS handles turn state. |
| `flashcards.py` | SM-2 scheduling + Claude deck generation |
| `gamification.py` | XP, level, streak, streak-freeze bookkeeping |
| `tutor_session_engine.py` | LangGraph state machine routing voice + sentiment |
| `session_service.py` | Step-through MCQ session lifecycle |
| `parent_digest.py` | Weekly parent-facing progress summary |
| `syllabus_data.py` | Board syllabus data (CBSE / ICSE / Cambridge / IB / Common Core) |

Note: `immersive`, `wellness`, `projects`, and `suggest` logic lives inside their router modules, not as separate services.

---

## Supabase Database Schema

See [CLAUDE.md](../CLAUDE.md#database-schema-supabase-postgresql) for the canonical schema. Key tables: `students`, `subjects`, `chapters`, `concepts`, `activities`, `activity_submissions`, `chat_messages`, `sentiment_logs`, `learning_sessions`, `student_progress`, `mastery`, `notes`, `daily_challenges`, `flashcards`, `mood_logs`.

Migrations live in `backend/alembic/versions/0001_initial_schema.py` through `0011_wave6_mood_logs.py`.

---

## Environment Variables

### Backend (`backend/.env`)
```env
ANTHROPIC_API_KEY=        # Claude API
GEMINI_API_KEY=           # Gemini Live voice (required)
OPENAI_API_KEY=           # OpenAI TTS (podcast only; voice is Gemini now)
YOUTUBE_DATA_API_KEY=     # optional — powers the show_video tool
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_DB_URL=
REDIS_URL=redis://localhost:6379     # optional
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:3000"]
SENTIMENT_FRAME_INTERVAL_MS=5000
SENTIMENT_CONFIDENCE_THRESHOLD=0.6
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Development Commands

```bash
# Backend
cd backend
python -m venv venv
# Windows: venv\Scripts\activate   |   *nix: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
python -m pytest

# Frontend
cd frontend
npm install
npm run dev      # http://localhost:3000 — cross-env sets NODE_OPTIONS=--max-http-header-size=65536
npm run build    # authoritative validation before commit
npx tsc --noEmit # faster type check only
```

---

## Known Build Constraints

- **Elevated HTTP header size is required** for the frontend dev server because `@supabase/ssr` session cookies can exceed Node's 8KB default. The `dev` script sets `NODE_OPTIONS=--max-http-header-size=65536` via `cross-env`. Do not remove it. If a user hits `HTTP 431`, first clear `localhost:3000` cookies.
- **JSX arrows**: use `→` (Unicode) not `->` in JSX text — raw `->` triggers a TypeScript parse error.
- **`IBM_Plex_Sans` font** requires explicit `weight` array (`["400", "500", "600", "700"]`).
- **`npm run build`** is the authoritative pre-commit validation step.

---

## Frontend Architecture Notes

- All backend calls go through `src/app/api/proxy/[...path]/route.ts` (server-side proxy, avoids CORS and forwards the Supabase JWT).
- `lib/api.ts` — generic fetch wrapper with short auth cache + response cache.
- `lib/supabase.ts` — `createBrowserClient` from `@supabase/ssr` with `localStorage` backing + `autoRefreshToken`.
- Auth state: `hooks/useSupabaseAuth.ts` validates `session.expires_at` before treating the session as authenticated (avoids stale-cookie flicker).
- `AuthRedirect` component is intentionally NOT used on the landing page — the landing renders for all users. Auth-gated features redirect internally.
- Visualization libraries: Recharts, Mermaid (diagrams), KaTeX (formulas).

---

## Test Patterns

### Backend (pytest)
```python
# conftest.py provides fixtures; mock AI calls:
with patch("app.services.curriculum_generator.anthropic_client") as mock:
    mock.messages.create = AsyncMock(return_value=...)
```

### Frontend (Vitest)
```ts
// tests/unit/ — @testing-library/react + jest-dom available
```

### E2E (Playwright)
```ts
// tests/e2e/ — Config in playwright.config.ts
```

---

## What Agents Should Know

1. **Supabase + FastAPI is the real system.** There is no `learning_os/` subsystem; any reference to one is from an abandoned branch — ignore.
2. **Authoritative docs:** [CLAUDE.md](../CLAUDE.md) for architecture, [PROJECT_TREE.md](../PROJECT_TREE.md) for file structure, [README.md](../README.md) for feature overview, [QUICKSTART.md](../QUICKSTART.md) for setup.
3. **Waves 1–7 + theme refresh are shipped.** When adding a feature, check whether it belongs in an existing wave router before creating a new one.
4. **Immersive / wellness / projects / suggest logic lives in the router module itself** — don't hunt for separate service files that don't exist.
5. **Teaching is emotion-aware**: `teaching_engine.py` receives emotion + confidence from the frontend (sentiment analysis) and adjusts tone via an `EMOTION_GUIDANCE` map.
6. **Voice sessions inject chapter context from the client**: the `useVoiceChat` hook builds the Gemini Live `systemInstruction` on connect, embedding grade, board, lesson title, key concepts, and summary so the tutor speaks in lesson scope. `voice_gemini.py` (router) is a transparent proxy — it doesn't touch the prompt. Tool calls (`show_diagram`, `show_video`, `show_image`) are declared in the same setup frame so the tutor can render visuals mid-turn.
7. **Theme is global via CSS variables** in `frontend/src/app/globals.css` (parchment palette, glossy gradients). Most components inherit automatically — avoid hardcoding hex colors in new components.
