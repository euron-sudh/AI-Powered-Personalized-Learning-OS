**Last Updated:** 2026-04-19 09:45

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
│   │       ├── 0001_init_schema.py
│   │       ├── 0002_add_chapters.py
│   │       ├── 0003_add_activities.py
│   │       ├── 0004_add_chat_messages.py
│   │       ├── 0005_add_sentiment_logs.py
│   │       ├── 0006_add_sessions.py
│   │       ├── 0007_add_adaptive_engine_tables.py
│   │       └── 0008_add_concept_mcq_fields.py
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
│   │   │   ├── learning.py             # Learning session management
│   │   │   ├── sessions.py             # Step-through MCQ session management
│   │   │   ├── practice.py             # Practice quiz endpoints
│   │   │   └── notes.py                # Student notes management
│   │   │
│   │   ├── services/                   # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── curriculum_generator.py # Claude API prompt chains for curriculum
│   │   │   ├── teaching_engine.py      # Conversational teaching logic with emotion awareness
│   │   │   ├── activity_evaluator.py   # Activity grading & feedback
│   │   │   ├── sentiment_analyzer.py   # Claude Vision for video sentiment
│   │   │   ├── voice_manager.py        # OpenAI Realtime session creation & context injection
│   │   │   ├── session_service.py      # MCQ session stepping logic
│   │   │   ├── tutor_session_engine.py # LangGraph state machine for voice + sentiment
│   │   │   └── note_summarizer.py      # Note extraction & summarization
│   │   │
│   │   ├── models/                     # SQLAlchemy ORM models (Supabase PostgreSQL)
│   │   │   ├── __init__.py
│   │   │   ├── student.py              # Student profile (extends auth.users)
│   │   │   ├── subject.py              # Subject enrollment
│   │   │   ├── chapter.py              # Chapter content & metadata
│   │   │   ├── concept.py              # Concepts within chapters
│   │   │   ├── activity.py             # Activities (quizzes, problems, etc.)
│   │   │   ├── activity_submission.py  # Student activity responses
│   │   │   ├── chat_message.py         # Teaching chat history
│   │   │   ├── sentiment_log.py        # Emotion detection results
│   │   │   ├── student_progress.py     # Aggregated per-subject progress
│   │   │   ├── learning_session.py     # Voice+sentiment session metadata
│   │   │   ├── mastery.py              # Concept mastery tracking
│   │   │   ├── session.py              # MCQ session state
│   │   │   └── note.py                 # Student notes
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
│   │   │   ├── page.tsx                # Landing page
│   │   │   ├── not-found.tsx           # 404 page
│   │   │
│   │   │   ├── (auth)/                 # Auth route group
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   ├── onboarding/             # Multi-step onboarding wizard
│   │   │   │   ├── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── components/
│   │   │   │       ├── GradeSelector.tsx
│   │   │   │       ├── BoardSelector.tsx
│   │   │   │       ├── SubjectSelector.tsx
│   │   │   │       └── MarksheetUpload.tsx
│   │   │   │
│   │   │   ├── dashboard/              # Student dashboard
│   │   │   │   ├── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── components/
│   │   │   │       ├── SubjectCard.tsx
│   │   │   │       ├── RecentActivity.tsx
│   │   │   │       └── QuickStats.tsx
│   │   │   │
│   │   │   ├── learn/                  # Main learning experience (lesson + voice + sentiment)
│   │   │   │   ├── page.tsx            # Subject/chapter selector
│   │   │   │   ├── [subjectId]/
│   │   │   │   │   ├── page.tsx        # Chapters list for subject
│   │   │   │   │   └── [chapterId]/
│   │   │   │   │       ├── page.tsx    # Full lesson (content + chat + voice + video + sentiment)
│   │   │   │   │       └── components/
│   │   │   │   │           ├── LessonContent.tsx      # Static chapter content
│   │   │   │   │           ├── TeachingChat.tsx       # Text chat with AI tutor
│   │   │   │   │           ├── VoiceChat.tsx          # OpenAI Realtime voice interface
│   │   │   │   │           ├── VideoFeed.tsx          # Webcam stream for sentiment
│   │   │   │   │           ├── SentimentIndicator.tsx # Real-time emotion display
│   │   │   │   │           ├── AIContentCard.tsx      # Tool call rendering (videos, diagrams)
│   │   │   │   │           ├── DiagramRenderer.tsx    # Mermaid.js diagrams
│   │   │   │   │           ├── FormulaRenderer.tsx    # LaTeX formula display
│   │   │   │   │           └── QuestionCard.tsx       # Inline questions/discussion
│   │   │   │   │
│   │   │   │   └── activity/
│   │   │   │       └── page.tsx        # Activity submission page
│   │   │   │
│   │   │   ├── session/                # Step-through MCQ session
│   │   │   │   ├── page.tsx            # Session question stepping
│   │   │   │   ├── complete/
│   │   │   │   │   └── page.tsx        # Session completion summary
│   │   │   │   └── components/
│   │   │   │       ├── QuestionCard.tsx
│   │   │   │       ├── ProgressBar.tsx
│   │   │   │       └── FeedbackCard.tsx
│   │   │   │
│   │   │   ├── practice/               # Practice quiz mode
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       └── QuizInterface.tsx
│   │   │   │
│   │   │   ├── analytics/              # Progress & analytics dashboard
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       ├── SubjectProgress.tsx
│   │   │   │       ├── WeeklyChart.tsx
│   │   │   │       └── StatsCard.tsx
│   │   │   │
│   │   │   ├── sentiment/              # Emotion/sentiment insights
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       ├── EmotionTimeline.tsx
│   │   │   │       ├── EmotionStats.tsx
│   │   │   │       └── RecommendationCard.tsx
│   │   │   │
│   │   │   └── (protected)/            # Protected layout group
│   │   │       └── layout.tsx
│   │   │
│   │   ├── components/                 # Reusable components
│   │   │   ├── ui/                     # shadcn/ui base components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   └── dialog.tsx
│   │   │   │
│   │   │   ├── Nav.tsx                 # Top navigation bar
│   │   │   ├── ProgressBar.tsx         # Reusable progress bar
│   │   │   ├── SentimentIndicator.tsx  # Emotion badge display
│   │   │   ├── LessonCard.tsx          # Chapter card component
│   │   │   ├── StatCard.tsx            # Stat display card
│   │   │   └── ErrorBoundary.tsx       # Error handler
│   │   │
│   │   ├── lib/
│   │   │   ├── supabase.ts             # Supabase JS client config
│   │   │   ├── api.ts                  # Fetch wrapper for FastAPI calls
│   │   │   ├── constants.ts            # App-wide constants
│   │   │   └── utils.ts                # Helper utilities (cn, formatting)
│   │   │
│   │   ├── hooks/                      # Custom React hooks
│   │   │   ├── useSupabaseAuth.ts      # Auth state management
│   │   │   ├── useVoiceChat.ts         # OpenAI Realtime WebSocket logic
│   │   │   ├── useSentiment.ts         # Real-time sentiment from Supabase
│   │   │   ├── useTutorSession.ts      # Tutor event streaming (Realtime)
│   │   │   └── useLocalStorage.ts      # Persistent client state
│   │   │
│   │   ├── types/                      # TypeScript type definitions
│   │   │   ├── curriculum.ts
│   │   │   ├── lesson.ts
│   │   │   ├── student.ts
│   │   │   ├── sentiment.ts
│   │   │   ├── session.ts
│   │   │   └── voice.ts
│   │   │
│   │   └── styles/
│   │       ├── globals.css             # Tailwind base + globals
│   │       └── animate.css             # Custom animations
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
    ├── IMPLEMENTATION_REPORT.md        # Architecture validation report
    ├── IMPLEMENTATION_FLOW.md          # Feature flow diagrams
    └── E2E_TEST_REPORT.md              # End-to-end test results
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
| `session_service.py` | Step through MCQ questions | `start_session()`, `step_session()` |
| `tutor_session_engine.py` | LangGraph state machine (voice + sentiment routing) | `run_voice_session()` (adaptive response selection) |

### Routers (API Endpoints)

| Router | Routes | Purpose |
|---|---|---|
| `auth.py` | `POST /api/auth/verify` | JWT verification & user info |
| `onboarding.py` | `POST /api/onboarding`, `POST /api/onboarding/profile`, `POST /api/onboarding/marksheet` | Student registration & profile |
| `curriculum.py` | `POST /api/curriculum/generate`, `GET /api/curriculum` | Curriculum generation & retrieval |
| `lessons.py` | `GET /api/lessons/{chapter_id}/content`, `POST /api/lessons/{chapter_id}/chat` (SSE) | Lesson content & teaching chat |
| `voice.py` | `POST /api/voice/session`, `WS /api/voice/ws` | OpenAI Realtime session management |
| `video.py` | `POST /api/video/analyze`, `WS /api/video/sentiment/ws` | Video sentiment analysis & streaming |
| `activities.py` | `POST /api/activities/{activity_id}/submit`, `POST /api/activities/{activity_id}/evaluate` | Activity submission & evaluation |
| `progress.py` | `GET /api/progress/{student_id}` | Student progress analytics |
| `learning.py` | `GET /api/learning/next`, `WS /api/learning/session/ws` | Learning session management |
| `sessions.py` | `POST /api/sessions/start`, `POST /api/sessions/{session_id}/step` | MCQ session stepping |
| `practice.py` | `POST /api/practice/quiz`, `POST /api/practice/submit` | Practice quiz generation |
| `notes.py` | `POST /api/notes`, `GET /api/notes/{student_id}` | Note taking & retrieval |

---

## Frontend Architecture

### App Router Structure

```
/login, /register          → Auth pages (Supabase Auth)
/onboarding                → Multi-step wizard (grade, board, subjects, marksheet)
/dashboard                 → Home (subject cards, recent activity, quick stats)
/learn                     → Subject/chapter selector
/learn/[subjectId]         → Chapters for subject
/learn/[subjectId]/[chapterId]  → Full lesson (content + chat + voice + sentiment)
/learn/[subjectId]/[chapterId]/activity → Activity submission
/session                   → MCQ session (step-through questions)
/session/complete          → Session summary (XP, streak, level)
/practice                  → Practice quiz mode
/analytics                 → Progress dashboard (real data from API)
/sentiment                 → Emotion insights timeline
```

### Key Hooks

| Hook | Purpose |
|---|---|
| `useSupabaseAuth()` | Manage Supabase JWT & user session |
| `useVoiceChat()` | OpenAI Realtime WebSocket connection, transcript management |
| `useSentiment()` | Subscribe to Supabase Realtime sentiment channel |
| `useTutorSession()` | Subscribe to tutor event streaming from backend |
| `useLocalStorage()` | Persist state across page reloads |

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

| Method | Route | Purpose | Response |
|---|---|---|---|
| POST | `/api/auth/verify` | Verify JWT | `{user_id, email, name}` |
| POST | `/api/onboarding` | Save profile | `{student_id}` |
| GET | `/api/onboarding/profile` | Get student profile | `{name, grade, streak_days, level, xp}` |
| POST | `/api/curriculum/generate` | Generate curriculum | `{subjects: [...]}` |
| GET | `/api/curriculum` | List curriculum | `{subjects: [...]}` |
| GET | `/api/lessons/{chapter_id}/content` | Get chapter content | `{title, content_json, concepts[]}` |
| POST | `/api/lessons/{chapter_id}/chat` | Chat with tutor (SSE) | Streaming text responses |
| POST | `/api/voice/session` | Create voice session | `{client_secret, expires_in}` |
| POST | `/api/video/analyze` | Analyze video frame | `{emotion, confidence}` |
| POST | `/api/activities/{id}/submit` | Submit activity | `{score, feedback}` |
| GET | `/api/progress/{student_id}` | Get progress analytics | `{subjects[], streak_days, total_xp}` |
| POST | `/api/sessions/start` | Start MCQ session | `{session_id, concept, question}` |
| POST | `/api/sessions/{id}/step` | Step through MCQ | `{is_correct, xp_earned, next}` |
| POST | `/api/practice/quiz` | Generate practice quiz | `{questions[]}` |
| GET | `/api/learning/next` | Get next recommended chapter | `{chapter_id, title}` |

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

**Last Updated:** 2026-04-19  
**Status:** Complete — All critical path implementations finished, documentation complete
