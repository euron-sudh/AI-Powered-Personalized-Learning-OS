**Last Updated:** 2026-04-17 15:45

# 🚀 Getting Started — Complete Beginner's Guide

Welcome! Follow these steps to run LearnOS locally. **No experience needed.**

---

## ✅ Step 0: Install Required Software

Install these if you don't have them:

1. **Python 3.11+**
   - Go to [python.org/downloads](https://www.python.org/downloads/)
   - Download and install
   - Check: `python --version`

2. **Node.js 18+**
   - Go to [nodejs.org](https://nodejs.org/)
   - Download the LTS version
   - Check: `node --version`

3. **Git** (optional but helpful)
   - Go to [git-scm.com](https://git-scm.com/)
   - Download and install

---

## 🔑 Step 1: Get Your API Keys

You need 3 API keys. **Get them now before starting:**

### A. Supabase (Database)
1. Visit [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with email
4. Create new project
5. Go to **Settings → API Keys**
6. Copy these values:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`

### B. OpenAI (Voice Chat)
1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to **API Keys**
4. Click "Create new secret key"
5. Copy the key (write it down!)

### C. Anthropic (Claude AI)
1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Go to **API Keys**
4. Create new API key
5. Copy it

---

## 💻 Step 2: Setup Backend (Python Server)

Open **Terminal** and navigate to the project:

```bash
# Navigate to backend folder
cd path/to/project/backend
```

### 2A: Create Virtual Environment

```bash
# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

You should see `(venv)` at the start of your terminal line.

### 2B: Install Python Packages

```bash
pip install -r requirements.txt
```

Wait for completion (2-3 minutes).

### 2C: Create `.env` File

In the `backend/` folder, create a file named `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-secret
SUPABASE_DB_URL=postgresql+asyncpg://postgres:password@db.project.supabase.co:5432/postgres

ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:3001","http://localhost:3000"]
```

Replace with your actual API keys from Step 1.

### 2D: Run Database Migrations

```bash
alembic upgrade head
```

This creates all required database tables. Run this once before starting the server.

### 2E: Start Backend Server

Make sure you are in the `backend/` folder with the virtual environment active, then run:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Started reloader process
INFO:     Application startup complete
```

**Keep this terminal open!** ← Important!

---

## 💻 Step 3: Setup Frontend (React App)

Open a **NEW terminal** (keep backend terminal open!):

```bash
# Navigate to frontend folder
cd path/to/project/frontend
```

### 3A: Install JavaScript Packages

```bash
npm install
```

Wait for completion.

### 3B: Create `.env.local` File

In the `frontend/` folder, create a file named `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Use the **same Supabase keys** from Step 1A.

### 3C: Start Frontend Server

```bash
npm run dev
```

**You should see:**
```
> Local:  http://localhost:3001
```

**Keep this terminal open!** ← Important!

---

## 🎉 Step 4: Test the Application

### 4A: Open in Browser

Visit: **http://localhost:3001**

You should see the **LearnOS login page**.

### 4B: Create Account

1. Click "Sign Up"
2. Enter your email and password
3. Click "Sign Up"
4. Check your email for verification link
5. Click the link to verify
6. Return to app and log in

### 4C: Complete Onboarding

Fill out the form:
- **Name**: Your name
- **Grade**: 10 (or your grade)
- **Board**: CBSE (or your curriculum)
- **Subjects**: Physics, Chemistry
- **Background**: "I enjoy learning"
- **Interests**: Science, Technology

Click "Finish Setup"

**You should see the Dashboard!** ✅

### 4D: Test AI Tutor

1. Click "Tutor" button next to Physics
2. Wait for lesson to load
3. **In 3 seconds, you should hear "Hello, let's start learning"** 🎙️

**If you heard that, congratulations! It's working!** 🎉

---

## 🧪 Test Each Feature

### Voice Chat
- Say: "Show me a video about gravity"
- A YouTube card should appear
- AI responds with explanation

### Video Sentiment
- Enable camera (allow permissions)
- Make different expressions
- Watch sentiment indicator update

### Notes
- Type on the right side
- Auto-saves every 800ms

---

## 🐛 Troubleshooting

### "Port 9000 already in use"

**Windows:**
```bash
netstat -ano | findstr :9000
taskkill /PID 12345 /F
```

Then restart backend.

### "Frontend can't reach backend"

1. Check backend is running (terminal should show `Uvicorn running`)
2. Check `.env.local` has: `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. Close frontend (Ctrl+C), restart: `npm run dev`

### "Email already exists"

Use a different email to sign up.

### "401 Unauthorized" or "Invalid credentials"

1. Sign out
2. Sign in again
3. Try again

### "Microphone access denied"

1. Browser Settings → Privacy → Microphone
2. Allow `localhost:3001`
3. Refresh page
4. Try voice chat again

### "Students table not found"

In backend folder:
```bash
alembic upgrade head
```

Then restart backend.

---

## 📊 Verify Everything Works

Check these boxes:

- [ ] Backend terminal shows "Uvicorn running on http://0.0.0.0:8000"
- [ ] Frontend terminal shows "Local: http://localhost:3001"
- [ ] http://localhost:3001 opens login page
- [ ] Can sign up and log in
- [ ] Can complete onboarding
- [ ] Dashboard appears
- [ ] Can click "Tutor" and see lesson
- [ ] AI greets within 3 seconds
- [ ] Voice chat works

**All checked? You're ready to explore!** 🚀

---

## 📚 Next Steps

- Explore all subjects on the dashboard
- Try asking the AI different questions
- Enable camera for sentiment analysis
- Check [docs/QUICK_START.md](docs/QUICK_START.md) for more features
- Read [docs/CLAUDE.md](docs/CLAUDE.md) to understand architecture

---

## 🆘 Need Help?

1. **Check error message** — Read what it says in the terminal
2. **Try restarting** — Close both terminals and start over
3. **Verify API keys** — Check they're in `.env` and `.env.local` correctly
4. **Check ports** — Make sure 3001 and 9000 are available
5. **Read full docs** — See [docs/](docs/) folder

---

**Happy Learning! 🎓**

## Step 1: Setup Backend (Python)

### 1.1 Open Terminal #1 (Backend)

Navigate to the backend folder:

```bash
cd backend
```

### 1.2 Create Virtual Environment

```bash
python -m venv venv
```

### 1.3 Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

You should see `(venv)` at the start of your terminal line.

### 1.4 Install Python Dependencies

```bash
pip install -r requirements.txt
```

This takes 1-2 minutes. Wait for it to complete.

### 1.5 Run Database Migrations

```bash
alembic upgrade head
```

This creates the database tables.

### 1.6 Start Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

✅ **You should see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Started reloader process
```

**Keep this terminal running.** Do NOT close it.

---

## Step 2: Setup Frontend (Node.js)

### 2.1 Open Terminal #2 (Frontend)

In a **NEW terminal window**, navigate to the frontend folder:

```bash
cd frontend
```

Make sure you're in the **frontend** directory, not the root.

### 2.2 Install Node Dependencies

```bash
npm install
```

This takes 1-2 minutes.

### 2.3 Start Frontend Server

```bash
npm run dev
```

✅ **You should see:**
```
> ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Keep this terminal running.** Do NOT close it.

---

## Step 3: Open the App in Your Browser

Open your browser and go to:

### **http://localhost:3000**

You should see:
- 🎨 LearnOS login page
- Or the dashboard if you're already logged in

---

## Step 4: Test the App

### 4.1 Log In

- Use your Supabase email/password
- Or create a new account (register)

### 4.2 Complete Onboarding (First Time Only)

- Select your grade level
- Pick subjects you want to learn
- Upload a marksheet (optional)

### 4.3 View Dashboard

You'll see your subjects and chapters.

### 4.4 Enter a Lesson

- Pick any subject → pick any chapter
- Wait for lesson to load (15-30 seconds)

### 4.5 Watch AI Tutor

**🎙️ The AI will automatically start speaking within 3 seconds!**

You should see:
- Voice transcript bubbles on the left
- AI content cards (videos, diagrams, questions)
- Your sentiment emotion on the right
- Notes panel on the bottom right

---

## 🔗 Important URLs

| Purpose | URL | Port |
|---------|-----|------|
| **Frontend App** | http://localhost:3000 | 3000 |
| **Backend API** | http://localhost:8000 | 8000 |
| **API Docs** | http://localhost:8000/docs | 8000 |
| **Supabase Dashboard** | https://supabase.com/dashboard | Cloud |

---

## 🧪 Testing Checklist

Once you enter a lesson, verify:

- [ ] AI greets you automatically (no button press)
- [ ] YouTube videos appear in the feed when AI mentions them
- [ ] Diagrams render when AI shows them
- [ ] Question cards appear with answer input
- [ ] You can click the mic 🎤 and speak
- [ ] Your response appears as a speech bubble
- [ ] Notes panel saves automatically
- [ ] "Take Quiz" button works

---

## 🎥 Optional: Test Webcam & Sentiment

If you want to test sentiment analysis:

1. In the VideoFeed (top-right), click **"Start Camera"**
2. Browser asks for camera permission → click **"Allow"**
3. Make different facial expressions:
   - Confused face → AI detects 🤔
   - Yawn/tired → AI detects 😴
   - Normal engagement → AI detects 🎯
4. Watch the sentiment indicator update in real-time
5. AI will adapt its explanation based on your emotion

---

## ❌ Common Issues & Fixes

### Issue: "Port 3000 is already in use"

**Fix:** Kill the process on port 3000

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
npm run dev
```

**Mac/Linux:**
```bash
lsof -i :3000
kill -9 <PID>
npm run dev
```

---

### Issue: "ModuleNotFoundError: No module named 'langgraph'"

**Fix:** Install dependencies again

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

### Issue: "Cannot connect to Supabase"

**Fix:** Check your `.env` files

**Backend** (`backend/.env`):
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxx...
SUPABASE_JWT_SECRET=xxx
SUPABASE_DB_URL=postgresql+asyncpg://...
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-proj-xxx
```

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
```

---

### Issue: "npm: command not found"

**Fix:** You didn't navigate to the frontend folder

```bash
cd frontend
npm run dev
```

---

### Issue: "AI doesn't speak"

**Fixes:**
1. Check backend is running (Terminal #1)
2. Check browser console for errors (F12 → Console tab)
3. Verify `OPENAI_API_KEY` is in `backend/.env`
4. Reload page (Ctrl+R or Cmd+R)

---

## 🛑 Stopping the Servers

To stop either server:

Press `Ctrl+C` in the terminal

This will gracefully shut down the server.

---

## 📚 Next Steps

Once everything is running:

1. **Explore the lesson page** — voice chat, sentiment, content cards
2. **Take a quiz** — test your knowledge on a chapter
3. **Check the dashboard** — see your progress
4. **Read CLAUDE.md** — understand the full architecture

---

## 🆘 Still Having Issues?

Check these:

1. **Both terminals running?**
   - Terminal #1: Backend (port 8000) ✅
   - Terminal #2: Frontend (port 3000) ✅

2. **Correct directories?**
   - Backend terminal in `backend/` folder
   - Frontend terminal in `frontend/` folder

3. **Environment variables set?**
   - `backend/.env` has all Supabase keys
   - `frontend/.env.local` has Supabase public keys

4. **Python/Node versions correct?**
   - Python 3.11+ (`python --version`)
   - Node 18+ (`node --version`)

---

## ✅ Success!

If you see:
- ✅ Backend running on http://localhost:8000
- ✅ Frontend running on http://localhost:3000
- ✅ Login page visible in browser
- ✅ AI speaks in a lesson

**Congratulations! LearnOS is running locally.** 🎉

---

## 📖 Learn More

- **CLAUDE.md** — Full project architecture & vision
- **Backend docs** — API docs at http://localhost:8000/docs
- **Frontend components** — Code in `frontend/src/app/learn/`

---

**Happy learning! 🚀**
