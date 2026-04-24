**Last Updated:** 2026-04-24

# AI-Powered Personalized Learning OS (LearnOS)

## Vision

A warm, gamified AI education platform for K-12 students that adapts content, teaching style, and pacing in real time using speech-to-speech conversation, live video sentiment analysis, and AI-generated personalized curricula. Includes spaced-repetition flashcards (SM-2), multi-day AI-generated projects, story mode, audio podcast (TTS), career glimpses, doubt scanner (Claude Vision), physics sims, mood check-ins + Pomodoro, and a next-best-action coach.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js 14+)                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────────┐  │
│  │ Dashboard │  │ Lesson   │  │ Voice Chat│  │ Video Sentiment   │  │
│  │ & Onboard│  │ Viewer   │  │ Interface │  │ Feed (WebRTC)     │  │
│  └──────────┘  └──────────┘  └───────────┘  └───────────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS / WebSocket / WebRTC
┌────────────────────────────▼────────────────────────────────────────┐
│                  BACKEND API (Python / FastAPI)                      │
│      Supabase Auth │ Rate Limiting │ WebSocket Manager               │
└──┬──────────┬───────────┬───────────┬───────────┬──────────────────┘
   │          │           │           │           │
   ▼          ▼           ▼           ▼           ▼
┌──────┐ ┌────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
│Onboa-│ │Curricu-│ │Teaching │ │Voice    │ │Video     │
│rding │ │lum     │ │Engine   │ │Engine   │ │Sentiment │
│Router│ │Gen Svc │ │(Chat)   │ │(S2S)    │ │Analyzer  │
└──┬───┘ └───┬────┘ └────┬────┘ └────┬────┘ └─────┬────┘
   │         │           │           │             │
   ▼         ▼           ▼           ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AI ORCHESTRATION LAYER                   │
│  Claude API (curriculum gen, teaching, eval, content creation)  │
│  Google Gemini Live (native-audio S2S, tool calls, server VAD)  │
│  Claude Vision (video frame sentiment analysis)                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     SUPABASE (BaaS Layer)                       │
│  PostgreSQL (users, progress, grades, curricula)                │
│  Auth (registration, login, JWT, row-level security)            │
│  Storage (marksheets, generated diagrams, recordings)           │
│  Realtime (live subscriptions for progress & sentiment)         │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     REDIS (optional cache)                       │
│  Session state, real-time sentiment cache, rate limiting         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Backend API | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| Voice (S2S) | Google Gemini Live `gemini-2.5-flash-native-audio-preview-09-2025` (WebSocket via FastAPI proxy), Web Audio API, server VAD, tool calls for visuals |
| Video search | YouTube Data API v3 (backend-proxied, safe-search strict, short-clip filter) for the `show_video` tool |
| Video Feed | WebRTC via browser MediaStream API, canvas frame capture |
| Sentiment Analysis | Claude Vision API (periodic frame analysis) |
| Curriculum & Teaching AI | Claude API (anthropic Python SDK) for content generation, tutoring, evaluation |
| Auth | Supabase Auth (email/password, OAuth, JWT verification in FastAPI) |
| Database | Supabase PostgreSQL (via supabase-py + SQLAlchemy/asyncpg for FastAPI) |
| Realtime | Supabase Realtime (progress updates, sentiment live feed) |
| File Storage | Supabase Storage (marksheets, diagrams, recordings) |
| Cache | Redis (optional — sentiment cache, rate limiting) |
| Diagramming | Mermaid.js (rendered in-browser), KaTeX for formulas |
| Testing | pytest + pytest-asyncio (backend), Vitest (frontend unit), Playwright (e2e) |
| Deployment | Docker Compose (dev), Supabase Cloud + any Python host (prod) |

---

## Project Structure

```
/d/project4/
├── CLAUDE.md                           # This file
│
├── backend/                            # Python FastAPI backend
│   ├── pyproject.toml                  # Python project config (dependencies, scripts)
│   ├── requirements.txt               # Pinned dependencies
│   ├── alembic.ini                    # DB migration config
│   ├── alembic/
│   │   └── versions/                  # Migration files
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app entry, CORS, lifespan
│   │   ├── config.py                  # Pydantic Settings (env vars)
│   │   ├── dependencies.py            # Shared FastAPI dependencies (auth, db session)
│   │   │
│   │   ├── routers/                   # API route modules
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # JWT verify / user info
│   │   │   ├── onboarding.py          # Student profile, heartbeat, marksheet upload
│   │   │   ├── curriculum.py          # Curriculum generation, retrieval, adjustment
│   │   │   ├── lessons.py             # Lesson content & streaming teaching chat (SSE)
│   │   │   ├── voice_gemini.py        # Gemini Live WebSocket proxy (primary, registered in main.py)
│   │   │   ├── voice.py               # Legacy OpenAI Realtime router (still imported but superseded by voice_gemini.py; kept for reference)
│   │   │   ├── youtube.py             # YouTube Data API search proxy (GET /api/youtube/search)
│   │   │   ├── video.py               # Video frame sentiment (HTTP + WS)
│   │   │   ├── activities.py          # Activity fetch, submit, AI evaluate
│   │   │   ├── progress.py            # Student progress & analytics
│   │   │   ├── notes.py               # Per-chapter freeform notes CRUD
│   │   │   ├── sessions.py            # Learning session lifecycle
│   │   │   ├── tutor_session.py       # LangGraph tutor session state machine
│   │   │   ├── learning.py            # Learning memory / adaptive profile
│   │   │   ├── practice.py            # Adaptive practice quiz builder
│   │   │   ├── challenges.py          # Daily challenges, streak/XP grants
│   │   │   ├── flashcards.py          # SM-2 flashcard deck + due cards + backfill
│   │   │   ├── leaderboard.py         # Global + friends leaderboard
│   │   │   ├── parent.py              # Parent dashboard (read-only)
│   │   │   ├── buddy.py               # AI study buddy state + messages
│   │   │   ├── immersive.py           # Story / podcast / career / doubt-scan
│   │   │   ├── wellness.py            # Mood log + Pomodoro completion
│   │   │   ├── projects.py            # AI-generated multi-day projects
│   │   │   └── suggest.py             # Next-best-action recommendation engine
│   │   │
│   │   ├── services/                  # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── curriculum_generator.py # Curriculum + chapter content + activity gen
│   │   │   ├── teaching_engine.py     # Conversational Socratic tutor (SSE stream)
│   │   │   ├── activity_evaluator.py  # AI grading & feedback
│   │   │   ├── adaptive.py            # Adaptive ordering & difficulty tuning
│   │   │   ├── sentiment_analyzer.py  # Claude Vision frame analysis
│   │   │   ├── voice_manager.py       # Legacy OpenAI Realtime session helper (unused by voice_gemini proxy; kept for reference only)
│   │   │   ├── flashcards.py          # SM-2 scheduling + deck generation
│   │   │   ├── gamification.py        # XP + level + streak bookkeeping
│   │   │   ├── tutor_session_engine.py # LangGraph tutor session state machine
│   │   │   ├── session_service.py     # Learning session lifecycle
│   │   │   ├── parent_digest.py       # Parent-facing progress digest
│   │   │   └── syllabus_data.py       # Official board syllabus data (CBSE/ICSE/…)
│   │   │   # Note: immersive, wellness, projects, and suggest logic lives inside
│   │   │   # their router modules — no dedicated service files.
│   │   │
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── student.py
│   │   │   ├── subject.py
│   │   │   ├── chapter.py
│   │   │   ├── activity.py
│   │   │   ├── chat_message.py
│   │   │   ├── sentiment_log.py
│   │   │   ├── progress.py
│   │   │   ├── notes.py
│   │   │   ├── session.py
│   │   │   ├── tutor_session.py
│   │   │   ├── adaptive.py            # Adaptive engine tables
│   │   │   ├── concept.py             # Concept-level tracking
│   │   │   ├── mastery.py             # Mastery snapshots
│   │   │   ├── syllabus.py
│   │   │   ├── daily_challenge.py     # Wave 1
│   │   │   ├── flashcard.py           # Wave 2
│   │   │   └── mood.py                # Wave 6 mood_logs
│   │   │
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── onboarding.py
│   │   │   ├── curriculum.py
│   │   │   ├── lesson.py
│   │   │   ├── activity.py
│   │   │   ├── sentiment.py
│   │   │   └── progress.py
│   │   │
│   │   ├── core/                      # Cross-cutting concerns
│   │   │   ├── __init__.py
│   │   │   ├── supabase_client.py     # Supabase Python client (auth, storage, db)
│   │   │   ├── ai_client.py           # Claude API (anthropic SDK) wrapper
│   │   │   ├── redis_client.py        # Redis connection
│   │   │   ├── database.py            # SQLAlchemy async engine & session
│   │   │   └── security.py            # JWT verification, Supabase auth middleware
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── audio.py               # PCM/WAV conversion utilities
│   │       └── image.py               # Base64 encoding for frame analysis
│   │
│   └── tests/
│       ├── conftest.py                # Fixtures (test DB, mock Supabase)
│       ├── test_curriculum.py
│       ├── test_teaching.py
│       ├── test_activities.py
│       ├── test_sentiment.py
│       └── test_voice.py
│
├── frontend/                          # Next.js frontend
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── layout.tsx             # Root layout
│   │   │   ├── page.tsx               # Landing page
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── onboarding/
│   │   │   │   ├── page.tsx           # Multi-step onboarding wizard
│   │   │   │   └── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx           # Student dashboard
│   │   │   │   └── components/
│   │   │   └── learn/
│   │   │       ├── [subjectId]/
│   │   │       │   ├── page.tsx       # Subject overview (chapters)
│   │   │       │   └── [chapterId]/
│   │   │       │       ├── page.tsx   # Lesson view (content + chat + voice + video)
│   │   │       │       └── activity/
│   │   │       │           └── page.tsx
│   │   │       └── components/
│   │   │           ├── LessonContent.tsx
│   │   │           ├── VoiceChat.tsx
│   │   │           ├── VideoFeed.tsx
│   │   │           ├── DiagramRenderer.tsx
│   │   │           ├── FormulaRenderer.tsx
│   │   │           └── ActivityPanel.tsx
│   │   ├── lib/
│   │   │   ├── supabase.ts            # Supabase JS client (browser-side auth)
│   │   │   ├── api.ts                 # Axios/fetch wrapper for FastAPI backend
│   │   │   └── constants.ts
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── Nav.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── SentimentIndicator.tsx
│   │   ├── hooks/
│   │   │   ├── useVoiceChat.ts
│   │   │   ├── useVideoFeed.ts
│   │   │   ├── useSentiment.ts
│   │   │   └── useSupabaseAuth.ts
│   │   └── types/
│   │       ├── curriculum.ts
│   │       ├── lesson.ts
│   │       ├── student.ts
│   │       └── sentiment.ts
│   └── tests/
│       ├── unit/
│       └── e2e/
│
└── docker-compose.yml                 # Redis (Supabase runs separately or via CLI)
```

---

## Database Schema (Supabase PostgreSQL)

Tables are managed via Alembic migrations from the FastAPI backend. Supabase Auth handles the `auth.users` table automatically — our tables reference `auth.users.id` as the student identity.

```
students (extends auth.users)
  - id (UUID, FK → auth.users.id, PK)
  - name (text)
  - grade (text — K, 1-12)
  - background (text — parsed from onboarding)
  - interests (text[] — subjects of interest)
  - marksheet_path (text, nullable — Supabase Storage path)
  - onboarding_completed (boolean, default false)
  - created_at, updated_at

subjects
  - id (UUID, PK)
  - student_id (UUID, FK → students.id)
  - name (text — e.g. "Physics", "Mathematics")
  - status (enum: not_started | in_progress | completed)
  - difficulty_level (enum: beginner | intermediate | advanced)
  - created_at

chapters
  - id (UUID, PK)
  - subject_id (UUID, FK → subjects.id)
  - order_index (int)
  - title (text)
  - description (text)
  - status (enum: locked | available | in_progress | completed)
  - content_json (jsonb — AI-generated lesson content)
  - created_at

activities
  - id (UUID, PK)
  - chapter_id (UUID, FK → chapters.id)
  - type (enum: quiz | problem_set | experiment | diagram_exercise)
  - prompt_json (jsonb — activity definition)
  - status (enum: pending | submitted | evaluated)

activity_submissions
  - id (UUID, PK)
  - activity_id (UUID, FK → activities.id)
  - student_id (UUID, FK → students.id)
  - response_json (jsonb)
  - evaluation_json (jsonb — AI-generated feedback)
  - score (int, 0-100)
  - submitted_at

chat_messages
  - id (UUID, PK)
  - chapter_id (UUID, FK → chapters.id)
  - student_id (UUID, FK → students.id)
  - role (enum: student | tutor)
  - content (text)
  - created_at

sentiment_logs
  - id (UUID, PK)
  - student_id (UUID, FK → students.id)
  - chapter_id (UUID, FK → chapters.id)
  - timestamp (timestamptz)
  - emotion (enum: engaged | confused | bored | frustrated | happy | drowsy)
  - confidence (float, 0.0-1.0)
  - action_taken (text, nullable)

student_progress
  - id (UUID, PK)
  - student_id (UUID, FK → students.id)
  - subject_id (UUID, FK → subjects.id)
  - chapters_completed (int)
  - total_chapters (int)
  - average_score (float)
  - strengths (text[])
  - weaknesses (text[])
  - last_active_at (timestamptz)
```

Row-Level Security (RLS) policies enforce that students can only access their own data. The FastAPI backend uses the Supabase service role key for admin operations (curriculum generation, evaluation writes).

---

## Supabase Integration Details

### Auth
- **Registration/Login**: Frontend calls Supabase Auth JS SDK directly (`supabase.auth.signUp`, `supabase.auth.signInWithPassword`)
- **JWT Verification in FastAPI**: Every FastAPI request includes `Authorization: Bearer <supabase-jwt>`. The `security.py` middleware verifies the JWT using Supabase's JWT secret (HMAC) or JWKS endpoint, extracts `user.id`
- **OAuth**: Supabase Auth supports Google, GitHub, etc. — configured in Supabase dashboard
- **Session refresh**: Handled client-side by Supabase JS SDK (`onAuthStateChange`)

### Storage
- **Bucket: `marksheets`** — Student-uploaded marksheet images/PDFs
- **Bucket: `content`** — AI-generated diagrams and media
- **Upload flow**: Frontend gets a signed upload URL from FastAPI → uploads directly to Supabase Storage → FastAPI records the path in the DB
- **Access control**: Storage policies scoped per student (RLS on bucket level)

### Database
- **FastAPI reads/writes**: Uses `supabase-py` client with service role key for full access, or SQLAlchemy async engine connected directly to the Supabase PostgreSQL connection string
- **Frontend reads (optional)**: Can use Supabase JS client for real-time subscriptions (progress updates, sentiment feed) — RLS ensures data isolation
- **Migrations**: Managed via Alembic (not Supabase migrations) to keep schema versioning in the Python backend

### Realtime
- Supabase Realtime channels used for:
  - Live sentiment updates pushed to the lesson UI
  - Progress bar updates on the dashboard
  - The frontend subscribes via `supabase.channel('sentiment:chapter_id').on('postgres_changes', ...)`

---

## Features (Build Order)

### Phase 1: Foundation
1. **Project scaffolding** — FastAPI backend (pyproject.toml, app structure), Next.js frontend, Docker Compose (Redis)
2. **Supabase setup** — Project creation, auth config, storage buckets, RLS policies
3. **Auth flow** — Supabase Auth on frontend, JWT verification middleware in FastAPI
4. **Onboarding wizard** — Multi-step form: grade, subjects, background, marks/marksheet upload (to Supabase Storage), learning goals
5. **Student dashboard** — Subject cards, progress overview

### Phase 2: AI Curriculum & Content
6. **Curriculum generator** — Takes onboarding data, calls Claude API to produce a full subject curriculum (ordered chapters with titles, descriptions, learning objectives, estimated difficulty)
7. **Chapter content generator** — For each chapter, generates:
   - Explanatory text with real-world examples
   - Diagrams (Mermaid.js markup)
   - Mathematical formulas (LaTeX via KaTeX)
   - Key concepts and definitions
   - Summary
8. **Lesson viewer** — Renders generated content with diagrams, formulas, and interactive elements

### Phase 3: AI Teaching Engine (Chat)
9. **Teaching chat** — Streaming conversational tutor per chapter (FastAPI SSE endpoint):
   - Explains concepts step-by-step
   - Gives examples, asks follow-up questions
   - Adapts explanation depth based on student responses
   - Shows diagrams and formulas inline in chat
   - Uses Socratic method — guides rather than gives answers
10. **Context-aware conversation** — Maintains chapter context, references prior exchanges, tracks what the student has understood vs. not

### Phase 4: Activities & Evaluation
11. **Activity generation** — After each chapter, AI generates activities:
    - Multiple choice quizzes
    - Problem sets (math/physics)
    - Diagram labeling exercises
    - Short-answer conceptual questions
    - Hands-on experiment prompts (describe & report)
12. **Activity submission & AI evaluation** — Student submits responses; AI evaluates with:
    - Correctness assessment
    - Detailed feedback and explanations
    - Score (0-100)
    - Guidance on what to revisit
13. **Adaptive difficulty** — Adjusts future content based on activity scores

### Phase 5: Voice (Speech-to-Speech)
14. **Google Gemini Live integration** — WebSocket-based S2S:
    - FastAPI proxy at `/api/voice/gemini` keeps `GEMINI_API_KEY` server-side; the browser never sees it
    - Auth handshake via the FIRST client WS message (`{"auth": "<supabase-jwt>"}`) — keeps long JWTs out of the URL where handshake layers can reject them
    - Backend overlaps the upstream Gemini dial with JWT verification to shave ~300 ms off perceived connect latency
    - Client-side Web Audio API for 16 kHz PCM16 mic capture; Gemini emits 24 kHz PCM16 back, played with a 60 ms jitter buffer
    - `automaticActivityDetection.silenceDurationMs: 1000` — balanced for kid-style pauses
    - `activityHandling: "NO_INTERRUPTION"` plus client-side physical mic-track-disable during AI speech eliminates speaker-to-mic bleed
    - Tool-call support: `show_diagram`, `show_video`, `show_image` — the tutor renders Mermaid + Wikipedia images + YouTube clips while it's talking
15. **Voice tutoring mode** — Student can speak to the AI tutor:
    - Native-audio model, so there's no separate STT/TTS step — audio in, audio out, transcripts for display only
    - Auto-connects on lesson mount in parallel with the chapter fetch
    - Transcript view client-side filters Devanagari (Gemini sometimes latches onto Indian-accented English as Hindi script — the audio understanding is unaffected, only the display needs the filter)

### Phase 6: Video Sentiment Analysis
16. **Video feed capture** — WebRTC camera access, periodic frame extraction (every 5-10 seconds)
17. **Sentiment analysis** — Each frame sent to FastAPI → Claude Vision API:
    - Detects: engagement, confusion, boredom, frustration, happiness, drowsiness
    - Confidence scoring per emotion
    - Results cached in Redis, persisted to Supabase
18. **Adaptive response** — Based on sentiment trends:
    - Bored/disengaged → simplify content, add interactive elements, suggest break
    - Confused → slow down, re-explain with different examples
    - Frustrated → offer encouragement, break problem into smaller steps
    - Drowsy/lazy → suggest physical activity break, switch to interactive mode
19. **Sentiment dashboard** — Visual timeline of student engagement per session (Supabase Realtime subscription)

### Phase 7: Personalization & Analytics
20. **Learning profile** — Aggregated view of strengths, weaknesses, learning style
21. **Progress analytics** — Charts showing progress across subjects, chapters, scores over time
22. **Adaptive curriculum adjustment** — Re-order or regenerate chapters based on performance and sentiment data

### Post-MVP Waves (shipped)

**Wave 1 — Gamification.** Global stats (XP / level / streak), streak-freeze auto-apply, daily challenges (3 rotating quests), leaderboard, AI study buddy. Keeps students returning daily; `challenges.py`, `leaderboard.py`, `buddy.py`, `gamification.py` service.

**Wave 2 — Spaced repetition.** SM-2 flashcard decks per chapter (Claude generates 8–12 cards on completion); `/review` UI with Again/Hard/Good/Easy grading; due-card queue; backfill tool. `flashcards.py` router + service.

**Wave 3 — Adaptive engine.** Concept-level mastery tracking, adaptive difficulty, chapter re-ordering on weak scores. `adaptive.py` service + `concept`, `mastery` models.

**Wave 4 — Parent & path.** Parent-facing read-only dashboard (`parent.py` router, `parent_digest.py` service), learning path view.

**Wave 5 — Immersive learning.** Story mode (5-scene Claude narrative), audio podcast (OpenAI TTS with 6 voices), career glimpse paragraph, doubt scanner (Claude Vision → step-by-step), projectile physics simulator (canvas 2D with analytical predictions). All in `immersive.py` router; frontend pages under `/story`, `/podcast`, `/career`, `/scan`, `/sim/projectile`.

**Wave 6 — Wellness & projects.** Mood log (`mood_logs` table, migration 0011) with coach-line responses; Pomodoro timer with XP grants; AI-generated multi-day project builder with milestone checklist persisted to `localStorage`. `wellness.py`, `projects.py` routers.

**Wave 7 — Next-best-action coach.** `/api/suggest/next-best-action` aggregates signals (streak risk, due flashcards, recent mood, rolling quiz average, missing check-in) into up to 3 prioritized action cards rendered on the dashboard. `suggest.py` router.

**Theme refresh.** Warm cream + parchment palette, glossy gradient stat tiles, kid-friendly emoji doodles, adventure hero banner. Lives in `globals.css` as CSS variables; most components read tokens and automatically inherit the new theme.

---

## Key Design Decisions

### FastAPI Backend Architecture
- **Async throughout**: All database and AI calls use async/await (asyncpg, httpx)
- **Streaming responses**: Teaching chat uses Server-Sent Events (SSE) via `StreamingResponse`
- **WebSocket**: Voice session management and real-time sentiment use FastAPI WebSocket endpoints
- **Dependency injection**: Supabase client, DB session, and current user injected via `Depends()`
- **Service layer pattern**: Routers are thin — business logic lives in `services/`

### Voice: Overlap & Diarization Handling
- Use Gemini Live's built-in server VAD (`automaticActivityDetection`) for turn detection
- Configure `turn_detection.silence_duration_ms` to allow natural pauses without premature cutoff
- Track `speaker` field in transcript events to distinguish student vs. AI
- If student interrupts, cancel current AI response and process new input
- Keep a rolling transcript synced to the text chat panel

### Sentiment Analysis: Privacy & Performance
- Video frames are processed but NOT stored permanently — only sentiment labels are persisted
- Frame capture rate is configurable (default: 1 frame every 5 seconds)
- Analysis runs server-side; raw frames are discarded after classification
- Student can disable video feed at any time (sentiment features degrade gracefully)
- All sentiment data is scoped to the student and never shared

### Content Generation: Quality Controls
- All AI-generated content goes through a structured prompt pipeline with rubrics
- Curriculum must align with standard K-12 frameworks (NCERT/Common Core depending on config)
- Content difficulty is tagged and validated against the student's grade level
- Diagrams are generated as Mermaid.js (deterministic rendering, no hallucinated images)
- Math formulas use LaTeX and are validated for syntax before rendering

### Teaching Approach
- Default pedagogical style: Socratic method (ask questions, guide discovery)
- After every concept, verify understanding before proceeding
- Use analogies appropriate to the student's grade level and background
- Reference prior chapters and activities to reinforce connections
- Never just give answers to activity questions — guide the student to discover them

---

## Environment Variables

```env
# === Backend (backend/.env) ===

# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
SUPABASE_JWT_SECRET=<supabase-jwt-secret>
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379

# AI
ANTHROPIC_API_KEY=<claude-api-key>           # curriculum, teaching, evaluation, Vision sentiment
GEMINI_API_KEY=<gemini-api-key>              # required for Gemini Live voice tutor
OPENAI_API_KEY=<openai-api-key>              # ONLY used for TTS podcast generation now (voice is Gemini)
YOUTUBE_DATA_API_KEY=<youtube-data-v3-key>   # optional — enables the show_video tool

# Server
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:3000"]

# Sentiment
SENTIMENT_FRAME_INTERVAL_MS=5000
SENTIMENT_CONFIDENCE_THRESHOLD=0.6

# === Frontend (frontend/.env.local) ===

NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Development Commands

```bash
# === Backend ===

# Create virtual environment
cd backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Run database migrations (against Supabase PostgreSQL)
alembic upgrade head

# Start FastAPI dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run backend tests
pytest

# === Frontend ===

cd frontend
npm install
npm run dev                     # Starts on http://localhost:3000

# Run frontend tests
npm run test                    # unit tests (vitest)
npm run test:e2e                # e2e tests (playwright)

# === Infrastructure ===

# Start Redis (only local dependency — Supabase is cloud-hosted)
docker-compose up -d
```

---

## API Route Summary (FastAPI)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/verify` | Verify Supabase JWT & return user info |
| POST | `/api/onboarding` | Save student profile & trigger curriculum gen |
| POST | `/api/onboarding/marksheet` | Upload marksheet to Supabase Storage |
| POST | `/api/curriculum/generate` | Generate full curriculum for a subject |
| GET | `/api/curriculum/{subject_id}` | Get curriculum (chapters list) |
| GET | `/api/lessons/{chapter_id}/content` | Get/generate chapter content |
| POST | `/api/lessons/{chapter_id}/chat` | Streaming teaching chat (SSE) |
| WS | `/api/voice/gemini` | WebSocket proxy to Gemini Live (auth via first message, then pass-through) |
| GET | `/api/voice/gemini/health` | Proxy liveness + API key configured flag |
| GET | `/api/youtube/search?q=...` | Backend YouTube Data API proxy for the `show_video` tool |
| POST | `/api/lessons/{chapter_id}/complete` | Mark chapter complete; idempotent; awards +25 XP on first completion |
| POST | `/api/video/analyze` | Analyze video frame for sentiment |
| WS | `/api/video/sentiment/ws` | WebSocket for live sentiment stream |
| POST | `/api/activities/{activity_id}/submit` | Submit activity response |
| POST | `/api/activities/{activity_id}/evaluate` | AI-evaluate submitted activity |
| GET | `/api/progress/{student_id}` | Get student progress & analytics |

---

## Python Dependencies (Key Packages)

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.0
pydantic-settings>=2.0
supabase>=2.0
anthropic>=0.40.0
openai>=1.50.0
sqlalchemy[asyncio]>=2.0
asyncpg>=0.29.0
alembic>=1.13.0
redis>=5.0
python-multipart>=0.0.9
httpx>=0.27.0
python-jose[cryptography]>=3.3.0
Pillow>=10.0
```

---

## Non-Functional Requirements

- **Latency**: Teaching chat responses must start streaming within 1 second
- **Voice**: Round-trip voice latency < 500 ms on good networks (native-audio Gemini Live avoids the STT→LLM→TTS serialization that made the old OpenAI Realtime chain slower)
- **Video**: Sentiment analysis must not block the UI; runs asynchronously
- **Security**: All FastAPI routes authenticated via Supabase JWT; file uploads scanned and size-limited; RLS on all tables
- **Accessibility**: UI supports keyboard navigation; voice mode provides text transcripts
- **Data Privacy**: No raw video stored; marksheets in private Supabase Storage bucket; COPPA considerations for K-12
