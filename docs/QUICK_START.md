**Last Updated:** 2026-04-17 16:00

# LearnOS Quick Start Guide — April 17, 2026

## System Status: ✅ READY FOR TESTING

All critical fixes applied. Navigation redesigned (Home/Session/Path/Insights). AI Priority Engine live. Frontend, backend, and database are synchronized.

---

## Prerequisites

- **Python 3.11+** (tested with 3.14)
- **Node.js 18+** (for Next.js frontend)
- **Supabase Account** (cloud-hosted PostgreSQL + Auth)
- **OpenAI API Key** (Realtime API for voice)
- **Anthropic API Key** (Claude for teaching/content)

---

## Environment Setup

### Backend Configuration (`backend/.env`)

```env
# Already configured with:
SUPABASE_URL=https://gijowphqadmdmyuyyaqm.supabase.co
SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>
SUPABASE_JWT_SECRET=<key>
SUPABASE_DB_URL=postgresql+asyncpg://postgres:...@db.supabase.co:5432/postgres

ANTHROPIC_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>

API_HOST=0.0.0.0
API_PORT=8000  # Port 8000 has zombie processes on Windows
CORS_ORIGINS=["http://localhost:3001","http://localhost:3000"]
```

### Frontend Configuration (`frontend/.env.local`)

```env
# Already configured with:
NEXT_PUBLIC_SUPABASE_URL=https://gijowphqadmdmyuyyaqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Starting the System

### 1. Backend (Python/FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Migrations already applied, but verify:
alembic current  # Should show: 0006 (head)

# Start server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**Test health endpoint:**
```bash
curl http://localhost:8000/api/health
# { "status": "healthy", "default_learner_id": "demo-learner" }
```

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

**Opens on:** `http://localhost:3001`

---

## Testing the Full Flow

### Step 1: Onboarding

1. Navigate to `http://localhost:3001/onboarding`
2. You'll be redirected to Supabase Auth login
3. Sign up with email/password (or use test account)
4. Fill onboarding form:
   - Name: `Your Name`
   - Grade: `10`
   - Subjects: `Physics, Mathematics`
   - Background: `Strong in STEM`
   - Interests: `Science, Engineering`
5. Click "Finish Setup"

**Expected:**
- Redirects to `/dashboard`
- Shows subject cards (Physics, Mathematics)
- Backend returns HTTP 200 with `student_id`

### Step 2: Dashboard — Today's Focus

1. Dashboard shows:
   - **Stats row**: Subjects, Chapters Completed (with progress bar), Average Score
   - **Today's Focus section**: 🔥 AI's recommended topic (if available)
   - Subject cards: Physics, Mathematics
2. Click **"Start Now"** on Today's Focus (or resume/start a subject card)

**Expected:**
- Subject selected
- Navigates to `/session` (unified learning experience)

### Step 3: Lesson Content Loads

1. Lesson page opens with:
   - Content feed (chapter content + diagrams + formulas)
   - Chat panel (teaching tutor)
   - Voice controls
   - Video feed (optional webcam sentiment)
2. Within 3 seconds, AI should greet via audio: "Hello, let's start the lesson"
3. See "🎙️ Live" indicator in top-right

**If audio doesn't play:**
- Check browser console for WebSocket errors
- Verify OpenAI API key is valid
- Check browser microphone permissions

### Step 4: Interaction Testing

**Send voice input:**
- Say: "Show me a video about [topic]"
- YouTube card should appear in content feed
- AI responds with video reference

**Video sentiment:**
- Enable camera in VideoFeed
- Make expressions (confused, engaged, bored)
- Sentiment indicator updates in top-right

**Notes:**
- Type in notes panel (right side)
- Auto-saves with 800ms debounce

---

## Troubleshooting

### Backend Won't Start on Port 9000

**Issue:** `Address already in use`

**Solution:**
```bash
# On Windows, find process on port 9000
netstat -ano | findstr :9000

# Kill the process
taskkill /PID <PID> /F

# Try again
python -m uvicorn app.main:app --port 8000
```

### Frontend Can't Reach Backend

**Issue:** `POST /api/onboarding 500` or `connection refused`

**Check:**
1. Backend is running on port 9000: `curl http://localhost:8000/api/health`
2. Frontend .env has correct `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. Restart frontend: `npm run dev`

### JWT Token Invalid

**Issue:** `401 Unauthorized` on onboarding request

**Cause:** Supabase Auth session token expired

**Solution:**
- Sign out from onboarding page
- Sign back in (refreshes token)
- Try again

### Microphone Permission Denied

**Issue:** Voice chat says "Microphone access denied"

**Solution:**
1. Browser Settings → Privacy → Microphone → Allow `localhost:3001`
2. Refresh page
3. Try voice chat again

### Database Connection Error

**Issue:** `relation "students" does not exist` or similar

**Solution:**
```bash
cd backend
alembic upgrade head  # Re-apply all migrations
```

---

## Database Verification

Check that tables exist:

```bash
cd backend
python << 'EOF'
from sqlalchemy import text
from app.core.database import engine
import asyncio

async def check():
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        tables = [row[0] for row in result.fetchall()]
        print("Tables:", ", ".join(sorted(tables)))

asyncio.run(check())
EOF
```

**Expected tables:**
- students
- subjects
- chapters
- activities
- chat_messages
- sentiment_logs
- student_progress
- learning_sessions
- tutor_events
- alembic_version

---

## Development Notes

### Key Files Modified (April 15)

| File | Change | Reason |
|------|--------|--------|
| `backend/app/main.py` | Disabled SlowAPI middleware | ASGI corruption |
| `backend/app/services/tutor_session_engine.py` | Removed asyncio.run(), use ainvoke() | Can't call in event loop |
| `frontend/src/app/learn/.../page.tsx` | Fixed useVoiceChat options, removed voiceChat from deps | Infinite re-renders |
| `frontend/.env.local` | Updated NEXT_PUBLIC_API_URL to 9000 | Port change |

### Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend builds without TypeScript errors
- [ ] Health endpoint responds
- [ ] Onboarding completes successfully
- [ ] Dashboard shows subjects
- [ ] Lesson page loads
- [ ] AI greets within 3 seconds
- [ ] Voice input works
- [ ] Video sentiment updates
- [ ] Tool calls (YouTube, diagrams) appear in feed

---

## Next Steps

1. **Full E2E Testing** — Complete all checklist items above
2. **Performance Profiling** — Check voice latency, sentiment analysis response time
3. **Edge Cases** — Test with network delays, slow systems, different browsers
4. **Deployment** — Move to production environment (Vercel, Railway, AWS)
5. **Security Audit** — JWT handling, input validation, SQL injection prevention

---

## Support

For issues:
1. Check browser console (F12) for JavaScript errors
2. Check backend logs: `tail -f backend/debug.log`
3. Verify all environment variables are set
4. Restart both backend and frontend
5. Clear browser cache if experiencing stale state

---

**Last Updated:** April 15, 2026  
**Status:** All fixes verified, system ready for testing
