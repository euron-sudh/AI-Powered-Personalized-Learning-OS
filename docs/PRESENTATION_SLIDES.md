**Last Updated:** 2026-04-17 16:00

# LearnOS — 20-Slide Presentation Content
**Audience**: Complete beginners | **Purpose**: Understand what LearnOS is and does

---

## SLIDE 1 — Title
**Headline:** LearnOS
**Subtitle:** Your Personal AI Tutor That Knows How You Learn
**Tagline:** *Like Netflix, but for education — and it talks back.*

---

## SLIDE 2 — The Problem: One-Size-Fits-All Education
**Headline:** Every student is different. Most classrooms aren't.
**Points:**
- 30 students. 1 teacher. 1 pace. 1 style.
- Fast learners get bored. Slow learners get left behind.
- Nobody asks: *"How are you feeling right now?"*
- Nobody changes the lesson because you look confused.

**Visual idea:** A classroom with one teacher and many students with different facial expressions (bored, confused, engaged)

---

## SLIDE 3 — The Vision: Netflix for Learning
**Headline:** What if education adapted to YOU — in real time?
**Points:**
- Netflix recommends what to watch next → LearnOS recommends what to learn next
- Spotify adapts your playlist → LearnOS adapts your lesson pace
- Duolingo gives streaks → LearnOS gives XP, levels, and achievements
- A private tutor who never gets tired → That's LearnOS

**Visual idea:** Split screen — boring textbook vs. interactive AI tutor

---

## SLIDE 4 — What is LearnOS?
**Headline:** An AI-powered learning operating system for K-12 students
**Definition:** LearnOS is a web application where an AI tutor:
- Teaches you through voice conversation
- Watches your facial expressions to detect confusion or boredom
- Adapts the lesson in real time
- Quizzes you, tracks your progress, and builds your curriculum

**Visual idea:** A student at a laptop with speech bubbles, a camera icon, and a brain icon

---

## SLIDE 5 — The 6 Core Features
**Headline:** Six things LearnOS does that no textbook can
1. 🎙️ Talks to you (Voice AI Tutor)
2. 👁️ Watches your reactions (Video Sentiment)
3. 🧠 Adapts the lesson (Smart Curriculum)
4. 📝 Quizzes you intelligently (AI Quiz Engine)
5. 📊 Tracks your mastery (Progress Analytics)
6. 🏆 Rewards your effort (Gamification)

---

## SLIDE 6 — Feature 1: Voice AI Tutor
**Headline:** Ask anything. Get a real answer. Out loud.
**How it works:**
- Click the mic → speak your question
- LearnOS replies in natural spoken language
- Shows YouTube videos, diagrams, and formulas as it talks
- Adapts tone based on how you're doing

**Example:** *"I don't understand gravity"*
→ AI explains with an analogy, shows a diagram, asks a follow-up question

**Tech behind it:** OpenAI Realtime API (speech-to-speech)

---

## SLIDE 7 — Feature 2: Video Sentiment Analysis
**Headline:** LearnOS can see when you're confused — before you say so
**How it works:**
- Your webcam captures a frame every few seconds
- AI analyses your face: engaged, confused, bored, frustrated, drowsy
- Lesson automatically adjusts based on your emotion

**What changes:**
- 😕 Confused → AI slows down, re-explains differently
- 😴 Bored/Drowsy → Suggests a short break, switches to interactive mode
- 😤 Frustrated → Encouragement, breaks problem into smaller steps

**Tech behind it:** Claude Vision API

---

## SLIDE 8 — Feature 3: Adaptive Curriculum
**Headline:** A curriculum that grows with you
**How it works:**
- You tell LearnOS your grade, subjects, and goals during onboarding
- AI builds a personalised roadmap of topics to learn
- After each quiz, the roadmap updates based on what you know
- Weak topics get more practice; strong topics advance faster

**Visual idea:** A roadmap with branches — some topics green (mastered), some yellow (in progress), some grey (upcoming)

---

## SLIDE 9 — Feature 4: AI Quiz Engine
**Headline:** Quizzes that actually teach, not just test
**How it works:**
- After each topic, LearnOS generates a quiz tailored to you
- Mix of multiple-choice and short-answer questions
- AI grades your answers and explains every mistake
- Your score updates your mastery level for that topic

**Key detail:** If you score low, the roadmap sends you back to reinforce the weak area.

---

## SLIDE 10 — Feature 5: Progress Analytics
**Headline:** Know exactly where you stand — and where to go next
**What you can see:**
- 📈 Average mastery % across all topics
- 🎯 Topics to focus on today
- 📚 Topics already mastered
- 🔥 Streak days and XP points
- 📋 Recent quiz scores and feedback

**Visual idea:** A clean dashboard with progress bars, topic cards, and a streak counter

---

## SLIDE 11 — Feature 6: Gamification
**Headline:** Learning feels like levelling up a game
**Rewards system:**
- ⭐ XP points for every quiz, lesson, and feedback submitted
- 🏆 Level up as your XP grows (Level 1 → 2 → 3…)
- 🔥 Streak days for consecutive days of learning
- 🥇 Achievements unlocked: "3-day streak", "Quiz Master", "Level 3 Unlocked"

**Why it works:** Small rewards trigger dopamine and build habit.

---

## SLIDE 12 — How a Student Uses LearnOS (User Journey)
**Headline:** From signup to lesson in 5 minutes
**Steps:**
1. **Sign Up** — Enter email, create password
2. **Onboard** — Tell LearnOS your grade, subjects, and learning goals
3. **Get Your Roadmap** — AI builds your personalised learning plan
4. **Start a Lesson** — AI tutor greets you and starts teaching
5. **Chat & Learn** — Ask questions, watch videos, read diagrams
6. **Take a Quiz** — Test what you learned
7. **See Your Progress** — Dashboard shows mastery and next steps

---

## SLIDE 13 — The Dashboard
**Headline:** Your learning mission control
**What's on the dashboard:**
- Today's recommended lessons
- Your XP, level, and streak
- Topic mastery scores (colour-coded)
- Recent quiz results
- Quick-start buttons for each topic

**Visual idea:** Screenshot or wireframe of the dashboard UI

---

## SLIDE 14 — The Lesson Experience
**Headline:** A lesson is a conversation, not a lecture
**What happens during a lesson:**
- AI tutor starts speaking automatically (no button needed)
- Content cards appear: YouTube videos, diagrams, formulas
- You can speak back or type your response
- AI adjusts depth based on your answers and facial expression
- Lesson ends with a quiz when you're ready

---

## SLIDE 15 — Behind the Scenes: 7 AI Agents
**Headline:** LearnOS runs 7 specialised AI agents working together
| Agent | Job |
|-------|-----|
| Planner | Builds and updates your learning roadmap |
| Tutor | Adapts teaching style (coaching, scaffolding, challenge) |
| Quiz | Generates questions from your topic history |
| Analyzer | Grades answers and blends your mastery score |
| Memory | Logs every interaction so context is never lost |
| Retrieval | Searches your personal document library for relevant content |
| Gamification | Awards XP, tracks streaks, unlocks achievements |

---

## SLIDE 16 — The Technology Stack (Simple Version)
**Headline:** What powers LearnOS
| Layer | What it does | Technology |
|-------|-------------|------------|
| Frontend | What you see and click | Next.js (React) |
| Backend API | Brains of the operation | Python + FastAPI |
| AI Tutor | Teaching, quizzing, evaluating | Claude AI (Anthropic) |
| Voice | Speaking and listening | OpenAI Realtime API |
| Emotion Detection | Reading your face | Claude Vision |
| Database | Storing your progress | Supabase (PostgreSQL) |
| Login / Auth | Keeping your account safe | Supabase Auth |

---

## SLIDE 17 — Privacy & Safety
**Headline:** Your data is yours
**Key commitments:**
- 📷 Video frames are analysed and immediately deleted — never stored
- 🔒 Every student only sees their own data
- 🛡️ Login protected by Supabase Auth (industry-standard security)
- 🚫 No raw video recordings kept
- ✅ Designed with COPPA (children's privacy) principles in mind

---

## SLIDE 18 — Who is LearnOS For?
**Headline:** Built for students, usable by anyone
**Primary audience:** K-12 students (ages 6–18)
**Works best for:**
- Students who struggle to keep up in class
- Students who get bored and need challenge
- Self-learners who want structure
- Students prepping for exams (CBSE, ICSE, Common Core)
- Parents wanting to supplement school education

---

## SLIDE 19 — Getting Started (Quick Setup)
**Headline:** Running locally in under 10 minutes
```bash
# 1. Start the backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --port 8000

# 2. Start the frontend
cd frontend
npm install
npm run dev
# → Open http://localhost:3001
```
**Full guide:** See GETTING_STARTED.md

---

## SLIDE 20 — The Future of LearnOS
**Headline:** This is just the beginning
**On the roadmap:**
- 📱 Mobile app (iOS & Android)
- 🌍 Multi-language support (Hindi, Tamil, Spanish…)
- 👨‍👩‍👧 Parent dashboard to track child's progress
- 🏫 School admin panel for classroom deployment
- 📖 Upload your own textbooks for AI to teach from
- 🤝 Peer learning rooms (study with friends, AI as moderator)

**The mission:** Every student on Earth deserves a personal tutor. LearnOS makes that possible.

---
*LearnOS — AI-Powered Personalized Learning OS*
*Built with Claude AI + OpenAI + Next.js + FastAPI*
---

## SLIDE — Recent Updates (Auto-synced from CHANGELOG)
**Headline:** What changed in LearnOS — 🗂️ April 16 — File Organization & Automated Audit System
**Latest fixes and improvements:**
- ✅ Deleted: `Updates_emkay/` folder (6 unused markdown files)
- ✅ Deleted: `knowledgeforge.db` (unrelated SQLite database, 552KB)
- ✅ Moved: `IMPLEMENTATION_REPORT.html` → `docs/`
- ✅ Moved: `amplify.yml` → `docs/deployment/`
- ✅ Moved: `package-lock.json` → `frontend/`
- ✅ Moved: `tools/` contents → `scripts/`

*Last synced: 2026-04-17*
