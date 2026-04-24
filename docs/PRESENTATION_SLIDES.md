<!--
Last Updated: 2026-04-24
LearnOS — 20-Slide Presentation Content
Audience: Complete beginners
Purpose: Understand what LearnOS is, every feature it ships today, and where it's going next

This file is designed for Markdown-to-slides tools (Marp, Slidev, Reveal):
each `---` separator is one slide. There are exactly 20 separators below,
corresponding to the 20 numbered slides.
-->

## SLIDE 1 — Title
**Headline:** LearnOS
**Subtitle:** Your Personal AI Tutor That Knows How You Learn
**Tagline:** *Like Netflix, but for education — and it talks back.*

---

## SLIDE 2 — The Problem: One-Size-Fits-All Education
**Headline:** Every student is different. Most classrooms aren't.
- 30 students. 1 teacher. 1 pace. 1 style.
- Fast learners get bored. Slow learners get left behind.
- Nobody asks: *"How are you feeling right now?"*
- Nobody changes the lesson because you look confused.

**Visual idea:** A classroom with one teacher and many students with different facial expressions

---

## SLIDE 3 — The Vision: Netflix for Learning
**Headline:** What if education adapted to YOU — in real time?
- Netflix recommends what to watch next → LearnOS recommends what to learn next
- Spotify adapts your playlist → LearnOS adapts your lesson pace
- Duolingo gives streaks → LearnOS gives XP, levels, daily challenges
- A private tutor who never gets tired → That's LearnOS

---

## SLIDE 4 — What is LearnOS? (Feature Panorama)
**Headline:** Everything LearnOS does today, on one slide
| Category | Feature |
|---|---|
| Talk | Voice AI tutor (Gemini Live) with inline diagrams, Wikipedia images, short YouTube clips |
| See | Video sentiment analysis (Claude Vision) |
| Learn | AI curriculum, Mermaid+LaTeX chapter content, adaptive re-ordering |
| Test | AI quiz engine, adaptive practice, SM-2 flashcards |
| Finish | One-tap **Mark chapter complete** (+25 XP) |
| Explore | Story mode, audio podcast, career glimpse, doubt scanner, physics sim |
| Thrive | Mood check-in, Pomodoro, multi-day AI project builder |
| Track | Analytics, emotion timeline, streak + level dashboard |
| Stick | XP, levels, streak freezes, daily challenges, leaderboard, AI study buddy |
| Guide | Next-best-action coach, parent dashboard, learning-path view |

*(The rest of the deck walks through each of these.)*

---

## SLIDE 5 — Voice AI Tutor + Visuals Mid-Speech
**Headline:** Ask anything. Get a real answer. Out loud — with a picture.
**How it works:**
- Tutor auto-connects on lesson mount — ready before the page finishes loading
- Replies in 4–6 sentences: definition → how/why → concrete example → one check question, then stops and waits
- While it's still talking, it renders visuals via **tool calls**:
  - `show_diagram` — Mermaid flowchart (≥ 6 emoji-labelled nodes, themed colors) **plus** a real Wikipedia lead image
  - `show_video` — short (< 4 min), embeddable, safe-search YouTube clip (backend-searched — no hallucinated IDs)
  - `show_image` — specific Wikimedia Commons URL (used sparingly)
- VAD tuned for kid-style pauses (`silenceDurationMs: 1000`), `NO_INTERRUPTION` keeps turns intact

**Tech:** Google Gemini Live (`gemini-2.5-flash-native-audio-preview-09-2025`), FastAPI WebSocket proxy, YouTube Data API v3

---

## SLIDE 6 — Video Sentiment Analysis
**Headline:** LearnOS can see when you're confused — before you say so
- Webcam captures a frame every few seconds → **Claude Vision** classifies it (engaged / happy / confused / bored / frustrated / drowsy)
- Only the label is stored; the raw frame is discarded immediately
- Lesson adapts in real time:
  - 😕 Confused → slow down, re-explain with a new analogy
  - 😴 Bored / Drowsy → suggest a short break, switch to interactive mode
  - 😤 Frustrated → warm tone, break the problem into smaller steps

---

## SLIDE 7 — AI Curriculum (Adaptive)
**Headline:** A curriculum that grows with you — by the board you picked
- Onboarding captures grade, board (**CBSE / ICSE / Cambridge IGCSE / IB / Common Core**), subjects, optional marksheet
- Claude generates 8–12 chapters/subject in board-specific style (NCERT format, Cambridge command words, IB inquiry, etc.)
- After a quiz score below 60 %, remaining chapters are **auto re-ordered** to front-load weak topics (prerequisites preserved)
- Per-chapter content (HTML + Mermaid diagrams + LaTeX) is generated on demand the first time you open it

---

## SLIDE 8 — AI Quiz Engine + Chapter Completion
**Headline:** Quizzes that teach, not just test
- Every chapter has a matching AI-generated activity (MCQ, short answer, problem sets), styled to the student's board
- Claude grades → score / correctness breakdown / detailed feedback / strengths & weaknesses
- Strengths & weaknesses feed the adaptive re-ordering engine
- **✓ Mark complete** button inside the lesson and on the chapter list: flips status to "Complete," increments progress aggregate, awards **+25 XP** on first completion only (idempotent)

---

## SLIDE 9 — Spaced Repetition + Adaptive Practice
**Headline:** Remember everything, and practise where it still hurts
- **SM-2 flashcards (`/review`)** — Claude auto-generates 8–12 cards per completed chapter; Again / Hard / Good / Easy (keyboard 1–4); a backfill tool regenerates missing decks
- **Adaptive practice (`/practice`)** — AI picks questions from your *weak* topics; difficulty ramps with your rolling average score
- Intervals update via the SM-2 algorithm — cards you ace move weeks out, cards you miss come back tomorrow

---

## SLIDE 10 — Immersive Learning (5 extra modes)
**Headline:** Five extra ways to absorb a chapter
| Mode | What it does |
|---|---|
| 📖 Story (`/story/[chapterId]`) | Claude narrates the chapter as a 5-scene story with a moral |
| 🎧 Podcast (`/podcast/[chapterId]`) | On-demand MP3, 6 voice options, streamable with download (OpenAI TTS) |
| 💼 Career (`/career/[chapterId]`) | One-paragraph "what people do with this in the real world" |
| 🔍 Doubt scanner (`/scan`) | Upload a photo of a problem — Claude Vision returns step-by-step reasoning + the underlying concept |
| 🎯 Physics sim (`/sim/projectile`) | Live canvas simulation with angle/speed sliders + analytical predictions |

Icon shortcuts for story / podcast / career are injected into the lesson chat panel for one-tap switching.

---

## SLIDE 11 — Wellness + AI Project Mode
**Headline:** Learning isn't just cognitive — it's emotional
- **🧘 Mood + Pomodoro (`/focus`)** — 6-mood grid + 1-5 energy slider; coach response per mood (e.g. *stuck* → "step away for 5 minutes"); SVG-ring Pomodoro timer (25/15/50 min); completions grant XP
- **🛠️ AI Project Mode (`/project`)** — pick a subject, chapters, and a theme; Claude proposes a multi-day project with title, motivation, 4–6 milestones, daily tasks, required skills, and a stretch goal; milestone checklist persists to `localStorage`

---

## SLIDE 12 — Analytics + Next-Best-Action Coach
**Headline:** Know exactly where you stand — and what to do next
- **📊 Analytics (`/analytics`)** — bar chart (avg score per subject), stacked area (emotion timeline), donut (emotion distribution), chapter-progress bars, AI-identified strengths & areas to improve; live-updating via Supabase Realtime
- **🎯 Next-best-action coach** — aggregates streak-at-risk, due flashcards, recent mood, rolling quiz average, missing check-ins, inactive subjects into up to **3 prioritised cards** on the dashboard (top pick gets a "Top pick" badge)

---

## SLIDE 13 — Gamification
**Headline:** Learning feels like levelling up a game
| Mechanic | Detail |
|---|---|
| ⭐ XP | Earned from lessons, quizzes, reviews, Pomodoros, chapter completions |
| 🏆 Levels | Gated on cumulative XP |
| 🔥 Streaks | Consecutive active days |
| 🛡️ Streak freezes | Auto-applied when a day is missed (up to your freeze balance) |
| 🎯 Daily challenges | 3 rotating quests a day with XP rewards |
| 🥇 Leaderboard (`/leaderboard`) | Global + friends rankings |
| 🤖 Study buddy (`/buddy`) | Companion that cheers progress, nudges on inactivity |

---

## SLIDE 14 — Parent Dashboard, Learning Path, Courses
**Headline:** Views beyond the student's day-to-day
- **👨‍👩‍👧 Parent dashboard (`/parent`)** — read-only weekly digest: subjects touched, quiz scores, mood trends, streak days, suggested talking points
- **🧭 Learning path (`/path`)** — visual tree: mastered green, in-progress yellow, upcoming grey, with the AI-chosen next chapter highlighted
- **🎓 Courses (`/courses`)** — curated external course recommendations grouped by the student's subjects (Khan Academy, Coursera, edX, selected YouTube channels)

---

## SLIDE 15 — User Journey + The Dashboard
**Headline:** From signup to a live lesson in under 5 minutes
1. **Sign up** — email/password or Google OAuth
2. **Onboard** — grade, board, subjects, optional marksheet
3. **Roadmap generated** — Claude builds 8-12 chapters/subject
4. **Open a lesson** — voice tutor auto-connects; visuals render as it talks
5. **Chat or speak** — answer; webcam sentiment adjusts pace
6. **Take the quiz** — AI grades and explains
7. **Mark complete** — +25 XP, chapter turns green
8. **See progress** — dashboard shows mastery, streak, next-best-action

**Dashboard contents:** Continue-learning hero · subject cards · stat cells (Subjects / Level / Streak / XP) · daily challenges strip · next-best-action cards · arcade cabinet grid (Curriculum · Practice · Flashcards · AI Tutor · Progress · Focus & Mood · Projects · Doubt Scanner)

---

## SLIDE 16 — Behind the Scenes: AI Services
**Headline:** Multiple AI services working in concert
| Service | Job |
|---|---|
| Curriculum Generator | Personalised K-12 curriculum from onboarding + board + syllabus data |
| Teaching Engine | Streams Socratic chat (SSE), adapts to detected emotion |
| Adaptive Engine | Re-orders chapters + tunes difficulty from concept-level mastery |
| Activity Evaluator | Grades quizzes with detailed, targeted feedback |
| Sentiment Analyzer | Classifies webcam frames via Claude Vision |
| Voice Proxy (`voice_gemini.py`) | Browser ↔ Gemini Live; keeps key server-side, overlaps dial with JWT verification |
| YouTube Search (`youtube.py`) | Backend proxy for `show_video`; safe-search strict, short clips, 1 h cache |
| Flashcards Engine | SM-2 generation + due-card scheduling |
| Gamification | XP, levels, streaks, freezes, daily challenges |
| Immersive Content | Story / podcast / career / doubt scanner / physics sim |
| Project Builder | Multi-day projects with milestone checklists |
| Next-Best-Action Coach | Aggregates signals into 3 prioritised cards |
| Parent Digest | Weekly read-only progress summary |

---

## SLIDE 17 — Technology Stack
**Headline:** What powers LearnOS
| Layer | What it does | Technology |
|---|---|---|
| Frontend | What you see and click | Next.js 14 (App Router) + React 18 + TypeScript + Tailwind |
| Backend | Brains of the operation | Python 3.11+ · FastAPI · Pydantic v2 · SQLAlchemy async |
| AI — Content | Curriculum, teaching, evaluation, story, podcast scripts | Claude (Anthropic) |
| AI — Voice | Speaking, listening, drawing visuals mid-sentence | Google Gemini Live (native-audio) |
| AI — Vision | Webcam frames + doubt-scanner photos | Claude Vision |
| Video search | Safe embeddable short clips | YouTube Data API v3 |
| Text-to-speech | Audio podcast tracks | OpenAI TTS |
| Diagrams / Math | In-browser rendering | Mermaid.js + KaTeX |
| Database · Auth · Storage · Realtime | One BaaS layer | Supabase PostgreSQL / Auth / Storage / Realtime |
| Cache / rate-limit / migrations | Infra | Redis + slowapi · Alembic |

---

## SLIDE 18 — Privacy & Safety
**Headline:** Your data is yours
- 📷 Webcam frames are analysed and **immediately deleted** — never stored
- 🔒 Supabase Row-Level Security on every table — students only see their own data
- 🛡️ Every FastAPI route validates the Supabase JWT before processing
- 🗝️ AI keys live server-side behind the FastAPI proxy — never exposed to the browser
- 📄 Marksheets stored in a private Supabase Storage bucket with signed URLs
- ✅ Designed with COPPA principles in mind

---

## SLIDE 19 — Who It's For + Getting Started
**Primary audience:** K-12 students (ages 6–18) — strugglers who need pacing, fast learners who need challenge, self-learners who want structure, exam-prep students (CBSE · ICSE · Cambridge · IB · Common Core), parents supplementing school.

**Run it locally (~15 min):**
```bash
cd backend && python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt && alembic upgrade head
uvicorn app.main:app --reload --port 8000

cd ../frontend && npm install && npm run dev
# → http://localhost:3000
```

**Keys in `backend/.env`:** `ANTHROPIC_API_KEY` (required) · `GEMINI_API_KEY` (required) · `OPENAI_API_KEY` (podcast) · `YOUTUBE_DATA_API_KEY` (optional, unlocks `show_video`). Full guide: [QUICKSTART.md](../QUICKSTART.md).

---

## SLIDE 20 — Project Roadmap
**Headline:** Shipped so far, and what's coming next

### ✅ Already live
| Wave | Highlights |
|---|---|
| Core | Auth, onboarding, dashboard, subjects, chapters, activities |
| Wave 1 · Gamification | XP, levels, streaks, freezes, daily challenges, leaderboard, study buddy |
| Wave 2 · Spaced repetition | SM-2 flashcards, `/review`, backfill tool |
| Wave 3 · Adaptive engine | Concept mastery, auto chapter re-ordering, difficulty tuning |
| Wave 4 · Parent & Path | Parent dashboard, learning-path tree, courses |
| Wave 5 · Immersive | Story, podcast (TTS), career glimpse, doubt scanner, physics sim |
| Wave 6 · Wellness & Projects | Mood check-in, Pomodoro, multi-day AI project builder |
| Wave 7 · Coach | Next-best-action cards on the dashboard |
| Theme refresh | Parchment palette, glossy gradient tiles, adventure hero, kid-friendly doodles |
| Wave 8 · Voice + Visuals | **Gemini Live** migration, tool-call visuals (diagrams · Wikipedia images · YouTube clips), **chapter completion** endpoint + UI, **YouTube Data API** integration, Devanagari filter, VAD tuning, parallel Gemini dial |

### 🛣️ On the roadmap
- 📱 Mobile app (iOS & Android)
- 🌍 Multi-language UI (Hindi, Tamil, Spanish…); tutor keeps replying in English or student's choice
- 🏫 School admin panel — classroom deployment, cohort dashboards
- 📖 BYOB — "bring your own book" uploads for Claude to teach from
- 🤝 Peer learning rooms — study with friends, AI moderator
- 🎓 Exam mode — timed mock papers scored to rubric
- 🧠 Smarter coach — forecast which chapter to review before tomorrow's school test via calendar + syllabus signals

**The mission:** Every student on Earth deserves a personal tutor. LearnOS makes that possible.

*LearnOS — AI-Powered Personalized Learning OS · Built with Claude · Gemini Live · Next.js · FastAPI · Supabase*
