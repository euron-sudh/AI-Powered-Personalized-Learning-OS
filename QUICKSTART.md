**Last Updated:** 2026-04-21

# LearnOS — Quick Start Guide

Get the AI-powered personalized learning platform running locally in **15 minutes**.

---

## Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **Supabase account** (free tier works) → [supabase.com](https://supabase.com)
- **OpenAI API key** (for voice speech-to-speech)
- **Anthropic Claude API key** (for curriculum + teaching)
- **Git** (to clone the repo)

---

## Step 1: Clone & Setup (2 min)

```bash
# Clone the repository
git clone <repo-url>
cd "AI-Powered-Personalized-Learning-OS"

# Create backend virtual environment
cd backend
python -m venv venv

# Activate venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Go back to root
cd ..
```

---

## Step 2: Configure Supabase (3 min)

1. **Create a Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Copy credentials** from Project Settings → API:
   - Project URL
   - Anon Key
   - Service Role Key
   - JWT Secret
3. **Create backend/.env file**:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Server
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:3000"]
```

4. **Run database migrations**:

```bash
cd backend
alembic upgrade head
cd ..
```

---

## Step 3: Configure Frontend (2 min)

Create **frontend/.env.local**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Step 4: Start Backend (3 min)

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend running at: **http://localhost:8000**  
📚 API docs at: **http://localhost:8000/docs**

---

## Step 5: Start Frontend (3 min)

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend running at: **http://localhost:3000**

> The `dev` script uses `cross-env NODE_OPTIONS=--max-http-header-size=65536` to accommodate large Supabase SSR cookies. If you see `HTTP 431 Request Header Fields Too Large`, clear `localhost:3000` cookies in DevTools → Application → Storage.

---

## Step 6: Test the App (2 min)

1. Open **http://localhost:3000** in your browser
2. Click **"Get started"** → register with email
3. Complete onboarding:
   - Select grade (K-12)
   - Pick curriculum board (CBSE/ICSE/Cambridge/IB/Common Core)
   - Choose subjects (Math, Science, English, etc.)
4. Click **"Start learning"** → browse chapters
5. Open a chapter → AI tutor auto-starts with voice! 🎤

---

## Key Features to Try

| Feature | How to Access |
|---------|--------------|
| **AI Teaching Chat** | Open any lesson chapter |
| **Voice Tutoring** | Allow microphone access in the lesson |
| **Video Sentiment** | Enable webcam in the lesson (emotion detection) |
| **Practice Quiz** | Click "Practice" in nav |
| **Flashcard Review (SM-2)** | Click "Review" in nav |
| **Daily Challenges + Streaks** | Dashboard hero + challenge cards |
| **Story Mode** | Open a lesson → Story icon in the chat panel |
| **Audio Podcast (TTS)** | Open a lesson → Listen icon |
| **Career Glimpse** | Open a lesson → Careers icon |
| **Doubt Scanner** | Dashboard → Quick Actions → Doubt scanner |
| **Projectile Sim** | Direct URL: `/sim/projectile` |
| **Mood + Pomodoro** | Dashboard → Focus & Mood |
| **AI Project Mode** | Dashboard → Project mode |
| **Next-Best-Action** | "For you, right now" widget on the dashboard |
| **Progress Analytics** | Click "Progress" in nav |
| **Leaderboard / Buddy** | Nav tabs |

---

## Troubleshooting

### "Port 8000 already in use"
```bash
# Find and kill the process using port 8000
lsof -i :8000
kill -9 <PID>
```

### "CORS error" when calling backend
- Make sure backend is running on port 8000
- Check `CORS_ORIGINS` in `backend/.env` includes `http://localhost:3000`

### "Supabase connection failed"
- Verify `SUPABASE_URL`, `SUPABASE_ANON_KEY` are correct
- Check your Supabase project is active (check dashboard)
- Run `alembic upgrade head` to apply migrations

### "Missing API keys"
- Get `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com)
- Get `OPENAI_API_KEY` from [platform.openai.com](https://platform.openai.com)

---

## Architecture at a Glance

```
Frontend (Next.js, React)          Backend (FastAPI)           AI Services
     ↓                                   ↓                            ↓
  /login              →  JWT auth   ← Supabase Auth
  /onboarding         →  Register   ← Supabase + PostgreSQL
  /learn              →  Lesson API ← Claude Curriculum Gen
  /practice           →  Quiz API   ← Claude Activity Gen
  /analytics          →  Progress   ← Student data from DB
  (Voice, Sentiment)  →  Realtime   ← OpenAI Realtime (Voice)
                                    ← Claude Vision (Sentiment)
```

---

## Next Steps

1. **Explore the codebase**: See [PROJECT_TREE.md](PROJECT_TREE.md)
2. **Read architecture**: See [CLAUDE.md](CLAUDE.md)
3. **Deploy to production**: See [Deployment](#deployment) in README.md
4. **Customize**: Fork and modify curriculum, UI, or AI prompts

---

## Support

- **Bugs?** Check [GitHub Issues](https://github.com/your-repo/issues)
- **Questions?** See [CLAUDE.md](CLAUDE.md) for architecture details
- **API docs?** Open http://localhost:8000/docs (Swagger UI)

---

**Happy learning! 🚀**
