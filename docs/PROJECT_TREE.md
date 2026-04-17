**Last Updated:** 2026-04-17 16:00

# 📂 Project Tree — LearnOS

Complete directory structure with file descriptions.

---

## 📁 Root Level

```
AI-Powered-Personalized-Learning-OS/
├── backend/                    # Python FastAPI backend
├── frontend/                   # Next.js React frontend
├── CLAUDE.md                   # 📖 Project vision & architecture
├── GETTING_STARTED.md          # 🚀 Setup guide for beginners
├── PROJECT_TREE.md             # 📂 This file
├── AI_Tutor_OS.md              # Plan backup (pre-implementation)
├── AGENTS.md                   # 🤖 Agent descriptions
├── .vscode/                    # VSCode settings
├── .claude/                    # Claude Code settings
├── docker-compose.yml          # Docker config
├── .gitignore                  # Git ignore rules
└── README.md                   # Project overview
```

---

## 🔙 Backend (`backend/`)

Python FastAPI server with AI orchestration, database, and WebSocket support.

```
backend/
├── app/                        # Main application code
│   ├── main.py                 # 🚀 FastAPI entry point, CORS, lifespan
│   ├── config.py               # ⚙️ Pydantic settings (env vars)
│   ├── dependencies.py         # 🔌 Shared dependencies (auth, db)
│   │
│   ├── core/                   # Cross-cutting concerns
│   │   ├── ai_client.py        # 🤖 Claude & OpenAI API wrappers
│   │   ├── database.py         # 📊 SQLAlchemy async engine
│   │   ├── supabase_client.py  # ☁️ Supabase client (functions)
│   │   ├── redis_client.py     # 💾 Redis connection
│   │   ├── security.py         # 🔐 JWT verification, auth middleware
│   │   └── rate_limiter.py     # ⏱️ Rate limiting config
│   │
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── student.py          # 👤 Student profile
│   │   ├── subject.py          # 📚 Subject
│   │   ├── chapter.py          # 📖 Chapter
│   │   ├── activity.py         # ✏️ Quiz/exercise
│   │   ├── chat_message.py     # 💬 Teaching chat history
│   │   ├── sentiment_log.py    # 😊 Emotion tracking
│   │   ├── progress.py         # 📈 Student progress
│   │   ├── notes.py            # 📝 Student notes
│   │   ├── tutor_session.py    # 🎓 LangGraph session state
│   │   └── syllabus.py         # 📋 Syllabus data
│   │
│   ├── schemas/                # Pydantic request/response models
│   │   ├── auth.py             # Login/register schemas
│   │   ├── curriculum.py       # Curriculum generation schemas
│   │   ├── lesson.py           # Lesson content schemas
│   │   ├── activity.py         # Activity submission schemas
│   │   ├── sentiment.py        # Sentiment analysis schemas
│   │   ├── onboarding.py       # Student onboarding schemas
│   │   └── progress.py         # Progress analytics schemas
│   │
│   ├── routers/                # API route modules (endpoints)
│   │   ├── auth.py             # Auth routes (Supabase proxy)
│   │   ├── onboarding.py       # Student profile & onboarding
│   │   ├── curriculum.py       # Curriculum generation & retrieval
│   │   ├── lessons.py          # Lesson content & teaching chat
│   │   ├── voice.py            # OpenAI Realtime session management
│   │   ├── video.py            # Video sentiment analysis
│   │   ├── activities.py       # Activity submission & evaluation
│   │   ├── progress.py         # Student progress & analytics
│   │   └── tutor_session.py    # 🎓 NEW: Tutor session endpoints + WebSocket
│   │
│   ├── services/               # Business logic layer
│   │   ├── curriculum_generator.py   # Prompt chains for curriculum
│   │   ├── teaching_engine.py        # Conversational tutoring logic
│   │   ├── activity_evaluator.py     # AI grading & feedback
│   │   ├── sentiment_analyzer.py     # Video frame emotion analysis
│   │   ├── voice_manager.py          # OpenAI Realtime lifecycle
│   │   ├── tutor_session_engine.py   # 🎓 NEW: LangGraph state machine
│   │   └── syllabus_data.py          # Syllabus content (K-12 standards)
│   │
│   ├── learning_os/            # Adaptive Learning OS (SQLite engine)
│   │   ├── service.py          # Main learning OS service
│   │   ├── adaptive.py         # Adaptive curriculum logic
│   │   ├── retrieval.py        # Content retrieval & ranking
│   │   ├── storage.py          # SQLite storage layer
│   │   ├── router.py           # Learning OS API routes
│   │   ├── schemas.py          # Learning OS data models
│   │   └── seed.py             # SQLite seed data
│   │
│   ├── utils/                  # Helper utilities
│   │   ├── audio.py            # PCM/WAV conversion for voice
│   │   └── image.py            # Base64 encoding for frames
│   │
│   └── __init__.py             # Package init
│
├── alembic/                    # Database migrations
│   ├── versions/               # Migration files (numbered)
│   │   ├── 0001_initial_schema.py           # Tables: students, subjects, etc.
│   │   ├── 0002_add_board.py                # Add board column
│   │   ├── 0003_add_syllabus_tables.py      # Syllabus tracking
│   │   ├── 0004_add_tutor_sessions.py       # Old tutor session table
│   │   ├── 0005_add_student_learning_memory.py  # Learning memory JSONB
│   │   └── 0006_add_tutor_session_tables.py     # 🎓 NEW: LangGraph session tables
│   ├── env.py                  # Alembic config
│   └── script.py.mako          # Migration template
│
├── tests/                      # Backend tests
│   ├── conftest.py             # Pytest fixtures
│   ├── test_curriculum.py      # Curriculum generation tests
│   ├── test_teaching.py        # Teaching engine tests
│   ├── test_activities.py      # Activity evaluation tests
│   ├── test_sentiment.py       # Sentiment analysis tests
│   └── test_voice.py           # Voice management tests
│
├── .env                        # 🔐 Environment variables (DO NOT COMMIT)
├── .env.example                # Template for .env
├── requirements.txt            # Python dependencies
├── pyproject.toml              # Python project config
├── alembic.ini                 # Alembic config
├── pytest.ini                  # Pytest config
└── venv/                       # Python virtual environment (ignored)
```

---

## 🎨 Frontend (`frontend/`)

Next.js React application with voice chat, sentiment analysis, and adaptive UI.

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout (header, nav)
│   │   ├── page.tsx            # Landing page
│   │   ├── globals.css         # Global styles
│   │   │
│   │   ├── (auth)/             # Auth routes (no header)
│   │   │   ├── login/
│   │   │   │   └── page.tsx    # Login page
│   │   │   └── register/
│   │   │       └── page.tsx    # Registration page
│   │   │
│   │   ├── onboarding/         # Onboarding flow
│   │   │   ├── page.tsx        # Multi-step wizard
│   │   │   └── components/
│   │   │       ├── GradeSelector.tsx
│   │   │       ├── SubjectPicker.tsx
│   │   │       ├── MarksheetUpload.tsx
│   │   │       └── GoalsForm.tsx
│   │   │
│   │   ├── dashboard/          # Student dashboard
│   │   │   ├── page.tsx        # Subject cards, progress
│   │   │   └── components/
│   │   │       ├── SubjectCard.tsx
│   │   │       ├── ProgressChart.tsx
│   │   │       └── QuickStats.tsx
│   │   │
│   │   └── learn/              # Lesson page (main feature)
│   │       ├── [subjectId]/
│   │       │   ├── page.tsx    # Subject overview
│   │       │   └── [chapterId]/
│   │       │       ├── page.tsx                 # 🎓 NEW: Unified lesson page
│   │       │       │                            #  - Lifted useSentiment
│   │       │       │                            #  - useTutorSession hook
│   │       │       │                            #  - useVoiceChat with tools
│   │       │       │                            #  - Unified session feed
│   │       │       ├── activity/
│   │       │       │   └── page.tsx             # Quiz/activity page
│   │       │       └── layout.tsx
│   │       │
│   │       └── components/
│   │           ├── LessonContent.tsx            # Lesson markdown renderer
│   │           ├── VoiceChat.tsx                # Voice interface component
│   │           ├── VideoFeed.tsx                # 🎓 NEW: External sentiment props
│   │           ├── AIContentCard.tsx            # 🎓 NEW: YouTube/diagram/question
│   │           ├── DiagramRenderer.tsx         # Mermaid diagram display
│   │           ├── FormulaRenderer.tsx         # KaTeX formula display
│   │           └── ActivityPanel.tsx           # Activity/quiz display
│   │
│   ├── lib/
│   │   ├── supabase.ts         # Supabase JS client (browser auth)
│   │   ├── api.ts              # Axios wrapper for FastAPI
│   │   └── constants.ts        # App-wide constants
│   │
│   ├── components/             # Reusable components
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── Nav.tsx             # Navigation header
│   │   ├── ProgressBar.tsx     # Chapter progress bar
│   │   └── SentimentIndicator.tsx  # Emotion display
│   │
│   ├── hooks/                  # React hooks
│   │   ├── useSupabaseAuth.ts  # Authentication hook
│   │   ├── useVoiceChat.ts     # 🎓 ENHANCED: Voice + tools + sentiment
│   │   ├── useVideoFeed.ts     # Webcam management
│   │   ├── useSentiment.ts     # Emotion detection (Claude Vision)
│   │   └── useTutorSession.ts  # 🎓 NEW: Session state + events
│   │
│   ├── types/                  # TypeScript type definitions
│   │   ├── curriculum.ts       # Curriculum types
│   │   ├── lesson.ts           # Lesson types
│   │   ├── student.ts          # Student profile types
│   │   └── sentiment.ts        # Sentiment types
│   │
│   └── styles/                 # Tailwind & custom styles
│       ├── globals.css
│       └── tailwind.css
│
├── public/                     # Static assets
│   ├── logo.png
│   └── favicon.ico
│
├── .env.local                  # 🔐 Frontend env vars (DO NOT COMMIT)
├── .env.example                # Template
├── package.json                # Node dependencies & scripts
├── package-lock.json           # Lockfile
├── tsconfig.json               # TypeScript config
├── next.config.ts              # Next.js config
├── tailwind.config.ts          # Tailwind CSS config
├── postcss.config.js           # PostCSS config
├── .eslintrc.json              # ESLint config
├── vitest.config.ts            # Vitest unit test config
├── jest.config.js              # Jest config
├── playwright.config.ts        # Playwright e2e test config
│
├── tests/
│   ├── unit/                   # Unit tests (vitest)
│   └── e2e/                    # E2E tests (playwright)
│
├── node_modules/               # Node packages (ignored)
└── .next/                      # Next.js build output (ignored)
```

---

## 🔑 Key Files by Purpose

### 🔐 Authentication
- `backend/app/core/security.py` — JWT verification
- `frontend/src/hooks/useSupabaseAuth.ts` — Auth state management
- `backend/app/routers/auth.py` — Auth endpoints

### 🤖 AI Orchestration
- `backend/app/core/ai_client.py` — Claude & OpenAI SDKs
- `backend/app/services/teaching_engine.py` — Conversational teaching
- `backend/app/services/curriculum_generator.py` — Content generation
- `backend/app/services/tutor_session_engine.py` — 🎓 **NEW: LangGraph state machine**

### 🎙️ Voice (Speech-to-Speech)
- `backend/app/routers/voice.py` — OpenAI Realtime WebSocket
- `frontend/src/hooks/useVoiceChat.ts` — 🎓 **ENHANCED: Tools + sentiment**
- `backend/app/services/voice_manager.py` — Session lifecycle

### 📹 Sentiment Analysis
- `backend/app/routers/video.py` — Frame analysis endpoint
- `backend/app/services/sentiment_analyzer.py` — Claude Vision analysis
- `frontend/src/hooks/useSentiment.ts` — Webcam + emotion state

### 🎓 Tutor Session (NEW)
- `backend/app/services/tutor_session_engine.py` — LangGraph brain
- `backend/app/routers/tutor_session.py` — Session endpoints + WebSocket
- `backend/alembic/versions/0006_add_tutor_session_tables.py` — DB schema
- `frontend/src/hooks/useTutorSession.ts` — Session state + events
- `frontend/src/app/learn/[chapterId]/page.tsx` — 🎓 **NEW: Unified lesson page**
- `frontend/src/app/learn/components/AIContentCard.tsx` — 🎓 **NEW: Content renderer**

### 📚 Content & Curriculum
- `backend/app/learning_os/` — Adaptive Learning OS (SQLite)
- `backend/app/services/syllabus_data.py` — K-12 syllabus content
- `backend/app/routers/curriculum.py` — Curriculum endpoints

### 📊 Database
- `backend/app/models/` — SQLAlchemy ORM models
- `backend/alembic/versions/` — Migration scripts
- `backend/app/core/database.py` — Async engine

### 📝 Testing
- `backend/tests/` — Pytest unit tests
- `frontend/tests/unit/` — Vitest unit tests
- `frontend/tests/e2e/` — Playwright e2e tests

---

## 🔗 Data Flow

```
Student enters lesson page
    ↓
[page.tsx] — Lifts useSentiment, connects tutorSession + voice
    ↓
Backend: TutorSessionEngine (LangGraph state machine)
    ↓
Agents: Teacher, Emotion, Examiner, Coach, Memory
    ↓
OpenAI Realtime: Streams speech + tool calls
    ↓
Tool calls → AIContentCard (YouTube, diagrams, questions)
    ↓
Sentiment changes → injectSentimentContext() → LangGraph routes
    ↓
Supabase Realtime: Events stream to frontend
    ↓
Session feed updates with new content
```

---

## 🎯 Important Files to Know

| File | Purpose | Type |
|------|---------|------|
| `CLAUDE.md` | Project vision & architecture | 📖 Doc |
| `GETTING_STARTED.md` | Setup guide | 🚀 Guide |
| `PROJECT_TREE.md` | This file | 📂 Reference |
| `backend/app/main.py` | FastAPI entry point | 🔙 Backend |
| `frontend/src/app/learn/[chapterId]/page.tsx` | Lesson page | 🎨 Frontend |
| `backend/app/services/tutor_session_engine.py` | LangGraph brain | 🤖 AI |
| `frontend/src/hooks/useVoiceChat.ts` | Voice state | 🎤 Voice |
| `backend/alembic/versions/0006_*` | DB migrations | 📊 DB |

---

## 🎓 NEW Files (Implementation)

All new files created in this implementation are marked with 🎓:

1. **Backend**
   - `app/services/tutor_session_engine.py` — LangGraph orchestration
   - `app/routers/tutor_session.py` — Session endpoints + WebSocket
   - `alembic/versions/0006_add_tutor_session_tables.py` — Schema

2. **Frontend**
   - `hooks/useTutorSession.ts` — Session state management
   - `app/learn/components/AIContentCard.tsx` — Content card renderer
   - `app/learn/[chapterId]/page.tsx` — REDESIGNED lesson page

3. **Documentation**
   - `GETTING_STARTED.md` — Beginner setup guide
   - `PROJECT_TREE.md` — This file

---

## 📦 Key Dependencies

### Backend
- **FastAPI** — Web framework
- **SQLAlchemy** — ORM
- **Alembic** — Migrations
- **Pydantic** — Validation
- **Supabase-py** — BaaS client
- **Anthropic SDK** — Claude API
- **OpenAI SDK** — GPT + Realtime API
- **LangGraph** — 🎓 **NEW: State machine**
- **Uvicorn** — ASGI server

### Frontend
- **Next.js 14+** — React framework
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **Supabase JS** — Auth + Realtime
- **Axios** — HTTP client
- **Mermaid** — Diagrams
- **KaTeX** — Math formulas
- **Vitest** — Unit tests
- **Playwright** — E2E tests

---

## 🚀 Quick Navigation

**Need to:**
- ✅ **Get started?** → See `GETTING_STARTED.md`
- ✅ **Understand architecture?** → See `CLAUDE.md`
- ✅ **See file structure?** → You're reading it!
- ✅ **Add a new API route?** → Add to `backend/app/routers/`
- ✅ **Add a new page?** → Add to `frontend/src/app/`
- ✅ **Run migrations?** → `alembic upgrade head`
- ✅ **See API docs?** → Go to http://localhost:8000/docs

---

**Happy coding! 🎉**
