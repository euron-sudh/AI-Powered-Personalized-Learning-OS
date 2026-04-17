**Last Updated:** 2026-04-17 15:45

# AI-Powered Personalized Learning OS (LearnOS)

## Vision

A Netflix-like AI education platform for K-12 students that adapts content, teaching style, and pacing in real time using speech-to-speech conversation, live video sentiment analysis, and AI-generated personalized curricula.

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
│  OpenAI Realtime API (speech-to-speech with VAD/diarization)    │
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
| Voice (S2S) | OpenAI Realtime API (WebSocket), Web Audio API, VAD for turn detection |
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
│   │   │   ├── auth.py                # Auth routes (proxy to Supabase Auth)
│   │   │   ├── onboarding.py          # Student profile & onboarding
│   │   │   ├── curriculum.py          # Curriculum generation & retrieval
│   │   │   ├── lessons.py             # Lesson content & teaching chat
│   │   │   ├── voice.py               # OpenAI Realtime session management
│   │   │   ├── video.py               # Video frame sentiment analysis
│   │   │   ├── activities.py          # Activity submission & evaluation
│   │   │   └── progress.py            # Student progress & analytics
│   │   │
│   │   ├── services/                  # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── curriculum_generator.py # Prompt chains for curriculum creation
│   │   │   ├── teaching_engine.py     # Conversational teaching logic
│   │   │   ├── activity_evaluator.py  # Activity grading & feedback
│   │   │   ├── sentiment_analyzer.py  # Video frame analysis via Claude Vision
│   │   │   └── voice_manager.py       # OpenAI Realtime session lifecycle
│   │   │
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── student.py
│   │   │   ├── subject.py
│   │   │   ├── chapter.py
│   │   │   ├── activity.py
│   │   │   ├── chat_message.py
│   │   │   ├── sentiment_log.py
│   │   │   └── progress.py
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
14. **OpenAI Realtime API integration** — WebSocket-based S2S:
    - FastAPI endpoint creates ephemeral session tokens
    - Client-side Web Audio API for mic capture and playback
    - Voice Activity Detection (VAD) for natural turn-taking
    - Speaker diarization tracking (student vs. system)
15. **Voice tutoring mode** — Student can speak to the AI tutor:
    - Ask questions verbally
    - Get spoken explanations
    - Voice and text chat stay synchronized (transcript shown)
    - Handles overlapping speech gracefully

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

---

## Key Design Decisions

### FastAPI Backend Architecture
- **Async throughout**: All database and AI calls use async/await (asyncpg, httpx)
- **Streaming responses**: Teaching chat uses Server-Sent Events (SSE) via `StreamingResponse`
- **WebSocket**: Voice session management and real-time sentiment use FastAPI WebSocket endpoints
- **Dependency injection**: Supabase client, DB session, and current user injected via `Depends()`
- **Service layer pattern**: Routers are thin — business logic lives in `services/`

### Voice: Overlap & Diarization Handling
- Use OpenAI Realtime API's built-in server VAD mode for turn detection
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
ANTHROPIC_API_KEY=<claude-api-key>
OPENAI_API_KEY=<openai-api-key-for-realtime>

# Server
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:3001","http://localhost:3000"]

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
| WS | `/api/voice/ws` | WebSocket for OpenAI Realtime voice session |
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
- **Voice**: Round-trip voice latency < 500ms (leveraging OpenAI Realtime's low-latency design)
- **Video**: Sentiment analysis must not block the UI; runs asynchronously
- **Security**: All FastAPI routes authenticated via Supabase JWT; file uploads scanned and size-limited; RLS on all tables
- **Accessibility**: UI supports keyboard navigation; voice mode provides text transcripts
- **Data Privacy**: No raw video stored; marksheets in private Supabase Storage bucket; COPPA considerations for K-12

---

## Current Status (April 15, 2026)

### ✅ Critical Fixes Applied

1. **SlowAPI Middleware Disabled** — Was corrupting ASGI message sequences
   - File: `backend/app/main.py:95-98`
   - Impact: Requests now reach handlers without protocol corruption

2. **Database Migrations Applied** — All 6 Alembic migrations now create schema
   - Command: `alembic upgrade head`
   - Tables: students, subjects, chapters, activities, chat_messages, sentiment_logs, student_progress, learning_sessions, tutor_events

3. **Frontend TypeScript Errors Fixed**
   - `useVoiceChat` options now include chapterId, lessonTitle, etc.
   - Removed incorrect parameters from `connect()` call (takes no args)
   - Fixed sentiment context passing to VideoFeed component

4. **Backend Async/Await Fixed** — LangGraph nodes now properly async
   - File: `backend/app/services/tutor_session_engine.py:252-295`
   - Replaced `asyncio.run()` with async lambdas + `await graph.ainvoke()`

5. **UUID Parsing Fixed** — Student/chapter IDs now cast to UUID
   - File: `backend/app/services/tutor_session_engine.py:307-308`

### 🚀 Verified Working

| Component | Status | Port |
|-----------|--------|------|
| Backend API | Running | 9000 |
| Onboarding Endpoint | HTTP 200 | ✅ |
| Health Check | Passing | ✅ |
| Database | Initialized | ✅ |
| JWT Auth | Working | ✅ |
| TypeScript | No errors | ✅ |

### 📝 Configuration

**Frontend Environment** (`frontend/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://gijowphqadmdmyuyyaqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend Environment** (`backend/.env`):
- SUPABASE_URL, SUPABASE_JWT_SECRET configured
- ANTHROPIC_API_KEY, OPENAI_API_KEY configured
- Database: Supabase PostgreSQL with asyncpg

### 🎯 Ready for Testing

1. Start backend: `cd backend && python -m uvicorn app.main:app --port 8000`
2. Start frontend: `cd frontend && npm run dev` (port 3000)
3. Open `http://localhost:3001/onboarding` (with Supabase auth redirect)
4. Complete onboarding → dashboard → lesson page
5. AI tutor should auto-connect within 3 seconds
