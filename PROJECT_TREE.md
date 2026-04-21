**Last Updated:** 2026-04-21

# LearnOS — Complete Project Structure

## Overview

LearnOS is an AI-powered personalized K-12 learning platform combining FastAPI backend, Next.js frontend, Supabase PostgreSQL database, Claude API for curriculum/teaching, Claude Vision for sentiment analysis, and OpenAI Realtime for voice.

---

## Directory Structure

```
AI-Powered-Personalized-Learning-OS/
├── CLAUDE.md                           # Architecture & design decisions (authoritative)
├── QUICKSTART.md                       # 15-minute setup guide
├── PROJECT_TREE.md                     # This file — project structure reference
├── README.md                           # Feature overview & deployment guide
├── GETTING_STARTED.md                  # Getting started guide
├── CHANGELOG.md                        # Version history & updates
├── docker-compose.yml                  # Redis container (dev only)
│
├── backend/                            # Python FastAPI Backend
│   ├── pyproject.toml                  # Project config, dependencies
│   ├── requirements.txt                # Python package pinning
│   ├── pytest.ini                      # Pytest configuration
│   ├── alembic.ini                     # Database migration config
│   │
│   ├── alembic/
│   │   ├── env.py                      # Alembic migration environment
│   │   ├── script.py.mako              # Migration template
│   │   └── versions/                   # Individual migration files
│   │       ├── 0001_initial_schema.py
│   │       ├── 0002_add_board.py
│   │       ├── 0003_add_syllabus_tables.py
│   │       ├── 0004_add_tutor_sessions.py
│   │       ├── 0005_add_student_learning_memory.py
│   │       ├── 0006_add_tutor_session_tables.py
│   │       ├── 0007_add_adaptive_engine_tables.py
│   │       ├── 0008_add_concept_mcq_fields.py
│   │       ├── 0009_wave1_gamification.py    # Global stats, daily challenges
│   │       ├── 0010_wave2_flashcards.py      # SM-2 flashcard deck
│   │       └── 0011_wave6_mood_logs.py       # Mood check-in log
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI app initialization, CORS, lifespan
│   │   ├── config.py                   # Pydantic Settings (env vars)
│   │   ├── dependencies.py             # Shared FastAPI dependencies (auth, db session)
│   │   │
│   │   ├── routers/                    # API endpoint route modules
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                 # Auth proxy (verify JWT, user info)
│   │   │   ├── onboarding.py           # Student profile & onboarding flow
│   │   │   ├── curriculum.py           # Curriculum generation & retrieval
│   │   │   ├── lessons.py              # Lesson content & teaching chat (SSE)
│   │   │   ├── voice.py                # OpenAI Realtime session management
│   │   │   ├── video.py                # Video sentiment analysis
│   │   │   ├── activities.py           # Activity submission & evaluation
│   │   │   ├── progress.py             # Student progress & analytics
│   │   │   ├── learning.py             # Learning memory / adaptive profile
│   │   │   ├── sessions.py             # Step-through MCQ session management
│   │   │   ├── practice.py             # Adaptive practice quiz builder
│   │   │   ├── notes.py                # Student notes management
│   │   │   ├── tutor_session.py        # LangGraph tutor session state machine
│   │   │   ├── challenges.py           # Wave 1 — daily challenges + streak/XP grants
│   │   │   ├── leaderboard.py          # Wave 1 — global + friends leaderboard
│   │   │   ├── buddy.py                # Wave 1 — AI study buddy state + messages
│   │   │   ├── flashcards.py           # Wave 2 — SM-2 deck, due cards, backfill
│   │   │   ├── parent.py               # Wave 4 — parent read-only dashboard
│   │   │   ├── immersive.py            # Wave 5 — story / podcast / career / doubt-scan
│   │   │   ├── wellness.py             # Wave 6 — mood log + Pomodoro completion
│   │   │   ├── projects.py             # Wave 6 — AI multi-day projects
│   │   │   └── suggest.py              # Wave 7 — next-best-action recommendation
│   │   │
│   │   ├── services/                   # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── curriculum_generator.py # Claude API prompt chains for curriculum
│   │   │   ├── teaching_engine.py      # Conversational teaching with emotion awareness
│   │   │   ├── activity_evaluator.py   # Activity grading & feedback
│   │   │   ├── adaptive.py             # Adaptive ordering & difficulty tuning
│   │   │   ├── sentiment_analyzer.py   # Claude Vision for video sentiment
│   │   │   ├── voice_manager.py        # OpenAI Realtime session lifecycle
│   │   │   ├── flashcards.py           # SM-2 scheduling + deck generation
│   │   │   ├── gamification.py         # XP + level + streak bookkeeping
│   │   │   ├── tutor_session_engine.py # LangGraph state machine for voice + sentiment
│   │   │   ├── session_service.py      # MCQ session stepping logic
│   │   │   ├── parent_digest.py        # Parent-facing progress digest
│   │   │   └── syllabus_data.py        # Official board syllabus data (CBSE/ICSE/…)
│   │   │   # Note: immersive, wellness, projects, and suggest logic lives in
│   │   │   # their router modules — no dedicated service files.
│   │   │
│   │   ├── models/                     # SQLAlchemy ORM models (Supabase PostgreSQL)
│   │   │   ├── __init__.py
│   │   │   ├── student.py              # Student profile (extends auth.users)
│   │   │   ├── subject.py              # Subject enrollment
│   │   │   ├── chapter.py              # Chapter content & metadata
│   │   │   ├── concept.py              # Concepts within chapters
│   │   │   ├── activity.py             # Activities (quizzes, problems, etc.)
│   │   │   ├── chat_message.py         # Teaching chat history
│   │   │   ├── sentiment_log.py        # Emotion detection results
│   │   │   ├── progress.py             # Aggregated per-subject progress
│   │   │   ├── mastery.py              # Concept mastery snapshots
│   │   │   ├── session.py              # MCQ session state
│   │   │   ├── tutor_session.py        # LangGraph tutor session state
│   │   │   ├── notes.py                # Student notes
│   │   │   ├── adaptive.py             # Adaptive engine tables
│   │   │   ├── syllabus.py             # Board syllabus references
│   │   │   ├── daily_challenge.py      # Wave 1 — daily quests
│   │   │   ├── flashcard.py            # Wave 2 — SM-2 cards
│   │   │   └── mood.py                 # Wave 6 — mood_logs
│   │   │
│   │   ├── schemas/                    # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── onboarding.py
│   │   │   ├── curriculum.py
│   │   │   ├── lesson.py               # ChatRequest, ChatResponse
│   │   │   ├── activity.py
│   │   │   ├── sentiment.py
│   │   │   ├── progress.py
│   │   │   ├── voice.py
│   │   │   └── session.py
│   │   │
│   │   ├── core/                       # Cross-cutting concerns
│   │   │   ├── __init__.py
│   │   │   ├── supabase_client.py      # Supabase JS client setup
│   │   │   ├── ai_client.py            # Claude API (anthropic SDK) wrapper
│   │   │   ├── redis_client.py         # Redis connection & caching
│   │   │   ├── database.py             # SQLAlchemy async engine
│   │   │   └── security.py             # JWT verification middleware
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── audio.py                # PCM/WAV conversion
│   │       ├── image.py                # Base64 encoding for vision
│   │       └── validators.py           # Data validation utilities
│   │
│   ├── tests/
│   │   ├── conftest.py                 # Pytest fixtures
│   │   ├── test_curriculum.py
│   │   ├── test_teaching.py
│   │   ├── test_activities.py
│   │   ├── test_sentiment.py
│   │   ├── test_voice.py
│   │   └── test_session.py
│   │
│   ├── check_db.py                     # DB connectivity checker
│   ├── reset_state.py                  # DB reset utility
│   ├── list_students.py                # Student listing utility
│   ├── setup_chemistry.py              # Chemistry curriculum seed
│   ├── test_*.py                       # E2E test scripts
│   ├── start.sh                        # Linux/Mac startup script
│   └── start.bat                       # Windows startup script
│
├── frontend/                           # Next.js 14 Frontend
│   ├── package.json                    # Node dependencies & scripts
│   ├── next.config.ts                  # Next.js configuration
│   ├── tailwind.config.ts              # Tailwind CSS setup
│   ├── tsconfig.json                   # TypeScript configuration
│   │
│   ├── src/
│   │   ├── app/                        # Next.js App Router pages
│   │   │   ├── layout.tsx              # Root layout wrapper
│   │   │   ├── page.tsx                # Landing page (parchment + adventure hero)
│   │   │   ├── globals.css             # Theme tokens + glossy/parchment utilities
│   │   │   ├── error.tsx               # Route-level error boundary
│   │   │   ├── global-error.tsx        # Root error boundary
│   │   │   │
│   │   │   ├── (auth)/                 # Auth route group
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── auth/                   # Supabase auth callback handlers
│   │   │   ├── forgot-password/        # Password reset flow
│   │   │   │
│   │   │   ├── api/                    # Next.js route handlers (API proxy to FastAPI)
│   │   │   ├── components/             # App-level components (AuthRedirect, etc.)
│   │   │   │
│   │   │   ├── onboarding/             # Multi-step onboarding wizard
│   │   │   ├── dashboard/              # Student dashboard (parchment hero, glossy stats, NBA)
│   │   │   │
│   │   │   ├── learn/                  # Main learning experience
│   │   │   │   ├── page.tsx            # Subject/chapter selector
│   │   │   │   └── [subjectId]/[chapterId]/   # Full lesson (content + chat + voice + video)
│   │   │   ├── courses/                # Course catalog
│   │   │   │
│   │   │   ├── practice/               # Adaptive practice quiz mode
│   │   │   ├── review/                 # Wave 2 — SM-2 flashcard review
│   │   │   ├── leaderboard/            # Wave 1 — leaderboard
│   │   │   ├── buddy/                  # Wave 1 — AI study buddy
│   │   │   ├── parent/                 # Wave 4 — parent read-only dashboard
│   │   │   ├── path/                   # Wave 4 — learning path view
│   │   │   ├── focus/                  # Wave 6 — Pomodoro + mood check-in
│   │   │   ├── project/                # Wave 6 — AI multi-day project builder
│   │   │   ├── insights/               # Progress insights
│   │   │   │
│   │   │   ├── story/[chapterId]/      # Wave 5 — 5-scene story mode
│   │   │   ├── podcast/[chapterId]/    # Wave 5 — OpenAI TTS audio podcast
│   │   │   ├── career/[chapterId]/     # Wave 5 — career glimpse paragraph
│   │   │   ├── scan/                   # Wave 5 — Claude Vision doubt scanner
│   │   │   ├── sim/projectile/         # Wave 5 — canvas 2D projectile physics sim
│   │   │   │
│   │   │   ├── analytics/              # Progress & analytics dashboard
│   │   │   ├── sentiment/              # Emotion/sentiment insights
│   │   │   ├── voice/                  # Voice tutor standalone page
│   │   │   ├── video-session/          # Webcam-based tutoring session
│   │   │   ├── profile/                # Profile settings
│   │   │   └── preferences/            # User preferences
│   │   │
│   │   ├── components/                 # Reusable components
│   │   │   ├── ui/                     # shadcn/ui base components
│   │   │   ├── Nav.tsx                 # Top navigation bar
│   │   │   ├── ProgressBar.tsx         # Reusable progress bar
│   │   │   ├── SentimentIndicator.tsx  # Emotion badge display
│   │   │   └── SubjectIcon.tsx         # Subject iconography
│   │   │
│   │   ├── lib/
│   │   │   ├── supabase.ts             # Supabase JS client (localStorage-backed)
│   │   │   ├── api.ts                  # Fetch wrapper for FastAPI calls
│   │   │   ├── constants.ts            # App-wide constants
│   │   │   └── utils.ts                # Helper utilities (cn, formatting)
│   │   │
│   │   ├── hooks/                      # Custom React hooks
│   │   │   ├── useSupabaseAuth.ts      # Auth state management (expires_at-validated)
│   │   │   ├── useVoiceChat.ts         # OpenAI Realtime WebSocket logic
│   │   │   ├── useVideoFeed.ts         # Webcam stream + frame extraction
│   │   │   ├── useSentiment.ts         # Real-time sentiment from Supabase
│   │   │   └── useTutorSession.ts      # Tutor event streaming (Realtime)
│   │   │
│   │   └── types/                      # TypeScript type definitions
│   │       ├── curriculum.ts
│   │       ├── lesson.ts
│   │       ├── student.ts
│   │       └── sentiment.ts
│   │
│   ├── public/                         # Static assets
│   │   ├── logo.svg
│   │   ├── favicon.ico
│   │   └── images/
│   │
│   └── tests/
│       ├── unit/
│       │   └── components/
│       └── e2e/
│           └── learning-flow.spec.ts
│
└── docs/                               # Additional documentation
    ├── AGENTS.md                       # AI agent definitions (Claude roles)
    ├── SUPABASE_INFO.md                # Supabase setup & configuration
    ├── IMPLEMENTATION_FLOW.md          # Feature flow diagrams
    ├── PRESENTATION_SLIDES.md          # Demo / presentation deck
    ├── END-TO-END TESTING PROMPT.md    # E2E testing prompt rubric
    └── deployment/                     # Deployment guides
```

---

## Backend Architecture

### Core Flow

```
Request → FastAPI Router → Service Layer → Models/ORM → Supabase PostgreSQL
                ↓
          Dependency Injection
          (user, db_session, supabase_client)
                ↓
          JWT Verification (security.py)
                ↓
          Business Logic (services/)
                ↓
          AI API calls (Claude, OpenAI)
```

### Key Services

| Service | Purpose | Key Functions |
|---|---|---|
| `curriculum_generator.py` | Generate K-12 curriculum | `generate_curriculum()`, `generate_chapter_content()` |
| `teaching_engine.py` | Conversational AI tutor (text) | `stream_teaching_response()` (with emotion awareness) |
| `sentiment_analyzer.py` | Detect emotion from video frames | `analyze_sentiment()` (Claude Vision) |
| `voice_manager.py` | Create OpenAI Realtime sessions | `create_realtime_session()` (with chapter context injection) |
| `activity_evaluator.py` | Grade student responses | `evaluate_activity()` (Claude-powered) |
| `adaptive.py` | Adaptive ordering & difficulty tuning | Concept mastery → chapter re-ordering |
| `flashcards.py` | SM-2 scheduling + deck generation | Claude deck generation, due-card queue |
| `gamification.py` | XP, level, streak bookkeeping | Grant XP, advance level, apply streak-freeze |
| `session_service.py` | Step through MCQ questions | `start_session()`, `step_session()` |
| `tutor_session_engine.py` | LangGraph state machine (voice + sentiment) | `run_voice_session()` (adaptive response selection) |
| `parent_digest.py` | Parent-facing progress digest | Weekly summary for parent dashboard |
| `syllabus_data.py` | Official board syllabus data | CBSE / ICSE / Cambridge / IB / Common Core |

### Routers (API Endpoints)

| Router | Wave | Purpose |
|---|---|---|
| `auth.py` | core | JWT verification & user info |
| `onboarding.py` | core | Student registration, profile, marksheet upload |
| `curriculum.py` | core | Curriculum generation & retrieval |
| `lessons.py` | core | Lesson content & streaming teaching chat (SSE) |
| `voice.py` | core | OpenAI Realtime session management |
| `video.py` | core | Video sentiment analysis (HTTP + WS) |
| `activities.py` | core | Activity submission & evaluation |
| `progress.py` | core | Student progress analytics |
| `learning.py` | core | Learning memory / adaptive profile |
| `sessions.py` | core | Step-through MCQ sessions |
| `practice.py` | core | Adaptive practice quiz builder |
| `notes.py` | core | Per-chapter freeform notes CRUD |
| `tutor_session.py` | core | LangGraph tutor session state machine |
| `challenges.py` | Wave 1 | Daily challenges, streak/XP grants |
| `leaderboard.py` | Wave 1 | Global + friends leaderboard |
| `buddy.py` | Wave 1 | AI study buddy state + messages |
| `flashcards.py` | Wave 2 | SM-2 deck, due cards, backfill |
| `parent.py` | Wave 4 | Parent read-only dashboard |
| `immersive.py` | Wave 5 | Story / podcast / career / doubt-scan |
| `wellness.py` | Wave 6 | Mood log + Pomodoro completion |
| `projects.py` | Wave 6 | AI-generated multi-day projects |
| `suggest.py` | Wave 7 | Next-best-action recommendation engine |

---

## Frontend Architecture

### App Router Structure

```
/login, /register          → Auth pages (Supabase Auth)
/forgot-password           → Password reset
/onboarding                → Multi-step wizard (grade, board, subjects, marksheet)
/dashboard                 → Parchment hero, glossy stats, NBA coach, subject cards
/learn                     → Subject/chapter selector
/learn/[subjectId]/[chapterId]  → Full lesson (content + chat + voice + sentiment)
/courses                   → Course catalog
/practice                  → Adaptive practice quiz
/review                    → Wave 2 — SM-2 flashcard review (Again/Hard/Good/Easy)
/leaderboard               → Wave 1 — leaderboard
/buddy                     → Wave 1 — AI study buddy
/parent                    → Wave 4 — parent read-only dashboard
/path                      → Wave 4 — learning path view
/focus                     → Wave 6 — Pomodoro + mood check-in
/project                   → Wave 6 — AI multi-day project builder
/story/[chapterId]         → Wave 5 — 5-scene story mode
/podcast/[chapterId]       → Wave 5 — OpenAI TTS podcast
/career/[chapterId]        → Wave 5 — career glimpse
/scan                      → Wave 5 — Claude Vision doubt scanner
/sim/projectile            → Wave 5 — canvas physics sim
/insights                  → Progress insights
/analytics                 → Progress dashboard (real data from API)
/sentiment                 → Emotion insights timeline
/voice                     → Voice tutor standalone
/video-session             → Webcam-based tutoring session
/profile                   → Profile settings
/preferences               → User preferences
```

### Key Hooks

| Hook | Purpose |
|---|---|
| `useSupabaseAuth()` | Manage Supabase JWT & user session (`expires_at`-validated) |
| `useVoiceChat()` | OpenAI Realtime WebSocket connection, transcript management |
| `useVideoFeed()` | Webcam stream + periodic frame capture for sentiment |
| `useSentiment()` | Subscribe to Supabase Realtime sentiment channel |
| `useTutorSession()` | Subscribe to tutor event streaming from backend |

### Key Components

| Component | File | Purpose |
|---|---|---|
| Navigation | `Nav.tsx` | Top bar with AI Tutor/Practice/Analytics links + profile dropdown |
| Lesson Content | `LessonContent.tsx` | Display chapter text, diagrams (Mermaid), formulas (KaTeX) |
| Teaching Chat | `TeachingChat.tsx` | Text Q&A with AI tutor (SSE stream) |
| Voice Chat | `VoiceChat.tsx` | OpenAI Realtime S2S interface (Web Audio API) |
| Video Feed | `VideoFeed.tsx` | Webcam stream + sentiment indicator |
| AI Content | `AIContentCard.tsx` | Render tool calls (YouTube links, diagrams, questions) |
| Session Flow | Multiple | MCQ stepping with feedback cards |
| Analytics | `analytics/page.tsx` | Real progress data from `GET /api/progress/{student_id}` |

---

## Supabase Database Schema (10 Tables)

```sql
-- Students (extends auth.users)
students:
  id (UUID, PK, FK → auth.users.id)
  name, grade, background, interests[]
  marksheet_path, onboarding_completed
  created_at, updated_at

-- Content
subjects:
  id (UUID, PK)
  student_id (UUID, FK → students.id)
  name, status, difficulty_level

chapters:
  id (UUID, PK)
  subject_id (UUID, FK → subjects.id)
  title, description, order_index
  content_json (AI-generated), status

concepts:
  id (UUID, PK)
  chapter_id (UUID, FK → chapters.id)
  title, explanation, order_index

activities:
  id (UUID, PK)
  chapter_id (UUID, FK → chapters.id)
  type (quiz | problem_set | experiment)
  prompt_json, status

-- Student Work
activity_submissions:
  id (UUID, PK)
  activity_id (UUID, FK → activities.id)
  student_id (UUID, FK → students.id)
  response_json, evaluation_json, score
  submitted_at

chat_messages:
  id (UUID, PK)
  chapter_id (UUID, FK → chapters.id)
  student_id (UUID, FK → students.id)
  role (student | tutor), content
  created_at

-- Sentiment & Sessions
sentiment_logs:
  id (UUID, PK)
  student_id (UUID, FK → students.id)
  chapter_id (UUID, FK → chapters.id)
  emotion, confidence (0.0-1.0)
  action_taken, timestamp

learning_sessions:
  id (UUID, PK)
  student_id (UUID, FK → students.id)
  chapter_id (UUID, FK → chapters.id)
  session_type, status
  created_at, ended_at

-- Progress
student_progress:
  id (UUID, PK)
  student_id (UUID, FK → students.id)
  subject_id (UUID, FK → subjects.id)
  chapters_completed, total_chapters
  average_score, strengths[], weaknesses[]
  last_active_at

-- Mastery Tracking
mastery:
  id (UUID, PK)
  student_id (UUID, FK → students.id)
  concept_id (UUID, FK → concepts.id)
  level (0.0-1.0), last_assessed_at
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>
SUPABASE_JWT_SECRET=<secret>
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Server
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:3000"]

# Sentiment
SENTIMENT_FRAME_INTERVAL_MS=5000
SENTIMENT_CONFIDENCE_THRESHOLD=0.6
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Key Implementation Details

### Emotion-Aware Teaching

The teaching engine now accepts emotion + confidence from the frontend (detected via video sentiment) and injects adaptive guidance into system prompts:

```python
EMOTION_GUIDANCE = {
  "bored": "Simplify language, add surprising fact, keep response shorter",
  "confused": "Re-explain with different analogy, break into smallest steps",
  "frustrated": "Be warm & encouraging, acknowledge difficulty, tiny steps",
  "drowsy": "Suggest short break, keep response very brief",
}
```

### Voice Context Injection

When creating an OpenAI Realtime session, the backend now accepts chapter context and injects it into the system instructions:

```python
# voice_manager.py: create_realtime_session()
instructions = f"""You are an expert {subject_name} tutor for grade {grade} 
({board} curriculum). Currently teaching: {chapter_title}. Student: {student_name}.
Use Socratic method — ask guiding questions rather than giving answers."""
```

### Real-Time Analytics

The analytics page fetches real data from `GET /api/progress/{student_id}` instead of using random values:

```typescript
// Returns:
{
  subjects: [{
    subject_id, subject_name,
    chapters_completed, total_chapters,
    progress_percent, average_score
  }],
  streak_days, total_xp, current_level
}
```

### Session Progression

Session completion pages now fetch real streak and level values from the student profile before redirecting:

```typescript
// session/page.tsx: startSession()
const profileRes = await fetch("/api/proxy/api/onboarding/profile", {...});
const profile = await profileRes.json();
setStreakDays(profile.streak_days || 0);
setLevel(profile.level || 1);
```

---

## API Endpoint Summary

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/verify` | Verify JWT & return user info |
| POST | `/api/onboarding` | Save profile & trigger curriculum gen |
| GET | `/api/onboarding/profile` | Get student profile with streak/XP/level |
| POST | `/api/curriculum/generate` | Generate curriculum |
| GET | `/api/curriculum` | List curriculum |
| GET | `/api/lessons/{chapter_id}/content` | Get chapter content |
| POST | `/api/lessons/{chapter_id}/chat` | Chat with tutor (SSE) |
| POST | `/api/voice/session` | Create voice session |
| POST | `/api/video/analyze` | Analyze video frame |
| POST | `/api/activities/{id}/submit` | Submit activity |
| GET | `/api/progress/{student_id}` | Get progress analytics |
| POST | `/api/sessions/start` | Start MCQ session |
| POST | `/api/sessions/{id}/step` | Step through MCQ |
| POST | `/api/practice/quiz` | Generate practice quiz |
| GET | `/api/learning/next` | Get next recommended chapter |
| GET | `/api/challenges/today` | Wave 1 — daily challenges |
| POST | `/api/challenges/{id}/complete` | Wave 1 — grant challenge XP |
| GET | `/api/leaderboard` | Wave 1 — leaderboard snapshot |
| GET | `/api/buddy` | Wave 1 — study buddy state |
| POST | `/api/buddy/message` | Wave 1 — send buddy message |
| GET | `/api/flashcards/due` | Wave 2 — SM-2 due queue |
| POST | `/api/flashcards/{id}/grade` | Wave 2 — grade card (Again/Hard/Good/Easy) |
| POST | `/api/flashcards/generate-missing` | Wave 2 — backfill decks for chapters |
| GET | `/api/parent/digest` | Wave 4 — parent progress digest |
| POST | `/api/immersive/story` | Wave 5 — 5-scene story |
| POST | `/api/immersive/podcast` | Wave 5 — OpenAI TTS podcast |
| POST | `/api/immersive/career` | Wave 5 — career glimpse paragraph |
| POST | `/api/immersive/doubt-scan` | Wave 5 — Claude Vision doubt scanner |
| POST | `/api/wellness/mood` | Wave 6 — log mood + coach line |
| POST | `/api/wellness/pomodoro/complete` | Wave 6 — grant Pomodoro XP |
| POST | `/api/projects/generate` | Wave 6 — AI multi-day project plan |
| GET | `/api/suggest/next-best-action` | Wave 7 — up to 3 NBA cards |

---

## Development Commands

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Docker (Redis)
docker-compose up -d
```

---

## Key Files to Know

| File | Purpose |
|---|---|
| `CLAUDE.md` | Architecture decisions & tech stack |
| `QUICKSTART.md` | 15-minute setup guide |
| `backend/app/main.py` | FastAPI initialization |
| `backend/app/config.py` | Environment configuration |
| `backend/app/dependencies.py` | Auth & session injection |
| `backend/core/security.py` | JWT verification middleware |
| `frontend/src/app/learn/[subjectId]/[chapterId]/page.tsx` | Main lesson page (full AI experience) |
| `frontend/src/components/Nav.tsx` | Navigation (AI Tutor → /learn, Insights → /sentiment) |
| `frontend/src/app/analytics/page.tsx` | Progress dashboard (real API data) |

---

**Last Updated:** 2026-04-21  
**Status:** Waves 1–7 + theme refresh shipped. Docs in sync with current routers, services, and frontend routes.
