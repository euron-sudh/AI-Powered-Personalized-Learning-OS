**Last Updated:** 2026-04-21

You are a senior QA engineer and system tester.

Your task is to perform a COMPLETE end-to-end test of the LearnOS application from a real student perspective.

You must simulate real user behavior, validate backend data integrity, and identify UX, logic, and system failures.

> **Note:** Steps 0–12 below cover the core learning loop. For the post-MVP waves (flashcards, story mode, podcast, doubt scanner, projectile sim, mood + Pomodoro, project mode, next-best-action, parent dashboard, leaderboard/buddy), also walk the routes listed in [QUICKSTART.md](../QUICKSTART.md#key-features-to-try) — each should load without errors, persist state correctly, and surface XP/streak updates on the dashboard where applicable.

---

## 🔁 GLOBAL RULES

1. Think like a real student, not a developer
2. Do NOT skip steps
3. Validate BOTH UI and backend behavior
4. Flag ANY friction, confusion, or inconsistency
5. Assume this is a production release candidate

---

# 🟦 STEP 0 — RESET STATE

* Delete all existing users and sessions
* Clear cache (if any)
* Ensure system starts in a clean state

VALIDATE:

* No previous progress exists
* No residual sessions are loaded

---

# 🟪 STEP 1 — USER ONBOARDING

Create a new user:

Name: "ramesh s"

Select subjects:

* Mathematics
* Physics
* Chemistry
* Biology

VALIDATE:

* User is created successfully
* Subjects are saved correctly
* No duplicate or missing entries

BACKEND CHECK:

* user_subject_stats has 4 entries
* No NULL or incorrect values

---

# 🟨 STEP 2 — CURRICULUM GENERATION

Observe system behavior after onboarding.

VALIDATE:

* A loading/processing screen appears
* No empty state or error message is shown

BACKEND CHECK:

* Chapters are generated
* Concepts are generated
* Proper ordering exists

FAIL IF:

* "No chapters available"
* Empty curriculum
* User must manually trigger generation

---

# 🟥 STEP 3 — AUTO SESSION START

VALIDATE CRITICAL BEHAVIOR:

* System MUST automatically start the first session
* User MUST NOT see dashboard, coach, or path first
* User MUST NOT be asked to choose subject or chapter

SCREEN SHOULD SHOW:

* Subject (e.g., Mathematics)
* Chapter
* Concept explanation
* One MCQ question

FAIL IF:

* User sees "Select a chapter"
* User sees blank screen
* User sees chat-style interface

---

# 🟩 STEP 4 — SESSION INTERACTION

Perform full interaction:

1. Read concept
2. Click audio (🔊)
3. Answer question
4. Observe feedback
5. Click Continue
6. Repeat for 5–8 steps

VALIDATE:

AUDIO:

* Plays within 1 second
* No lag or failure

QUESTION FLOW:

* Only one question at a time
* Options selectable
* Feedback appears immediately

FEEDBACK:

* Shows correct/incorrect
* Includes explanation

CONTINUE:

* Loads next step smoothly

BACKEND CHECK:

* session_steps table stores:

  * user_answer
  * is_correct
  * time_taken

FAIL IF:

* Multiple questions shown
* No feedback
* Page reloads incorrectly
* Audio delay > 3 seconds

---

# 🎥 STEP 5 — VIDEO TEST (IF ENABLED)

Trigger video playback.

VALIDATE:

* Video loads within 2 seconds
* Does not block UI
* Can continue session without waiting

FAIL IF:

* Infinite loading
* UI freezes
* Video is required to proceed

---

# 💬 STEP 6 — AI ASSIST TEST

Click "Ask AI"

VALIDATE:

* Response is short and relevant
* Only explains current concept
* Does NOT change topic

FAIL IF:

* Long paragraphs
* Irrelevant answers
* Starts new lesson

---

# 🟦 STEP 7 — SESSION COMPLETION

Complete the session.

VALIDATE:

* XP is awarded
* Streak is updated
* Summary is shown

SCREEN SHOULD SHOW:

* XP gained
* Streak
* Continue button

BACKEND CHECK:

* sessions table updated
* user_stats updated

FAIL IF:

* XP not updated
* Streak incorrect
* No completion screen

---

# 🟪 STEP 8 — COACH SCREEN

After completion, system should land on Coach.

VALIDATE:

* Shows "Continue Learning"
* Shows ONE recommended subject + chapter
* Has a single "Resume Session" button

FAIL IF:

* Multiple choices
* Empty state
* Same subject repeats incorrectly

---

# 🟨 STEP 9 — INSIGHTS VALIDATION

Open Insights tab.

VALIDATE:

* XP is realistic
* Streak is correct
* Mastery is between 0–100%

FAIL IF:

* Values like 4890% or 6300%
* Missing data
* Load errors

---

# 🟩 STEP 10 — PATH VALIDATION

Open Path tab.

VALIDATE:

* Subjects visible
* Chapters listed
* Lock/unlock logic correct

ACTION:

* Click unlocked chapter → should start session

FAIL IF:

* Empty path
* Wrong ordering
* Cannot start session

---

# 🟦 STEP 11 — LIBRARY VALIDATION

Open Library.

VALIDATE:

* Session transcript exists
* Concept + question + explanation stored

FAIL IF:

* Empty library after session
* Missing transcript data

---

# 🔁 STEP 12 — DAILY LOOP SIMULATION

Simulate returning user:

* Close app
* Reopen app

VALIDATE:

* Lands on Coach
* Shows next recommended session
* Resume works instantly

---

# 🚨 FINAL FAILURE CONDITIONS

Mark system as NOT production-ready if ANY occur:

* User must choose what to study
* Session does not auto-start
* Audio/video delays
* Mastery > 100%
* Empty states in core flow
* Chat-like uncontrolled AI behavior

---

# ✅ SUCCESS CRITERIA

System passes ONLY if:

* User can start learning within 2 seconds
* No decision friction exists
* Session loop is smooth and continuous
* Data is accurate and consistent
* AI remains structured and controlled

---

# 📊 OUTPUT FORMAT

Return:

1. Pass/Fail per step
2. Critical issues (must fix)
3. Minor issues
4. UX friction points
5. Final verdict: Production Ready / Not Ready

---

# 🌊 ADDITIONAL WAVE COVERAGE

Beyond the core loop above, also validate each post-MVP wave:

**Wave 1 — Gamification**
* `/api/challenges/today` returns 3 quests; completing one grants XP + streak update
* `/leaderboard` renders global + friends board with accurate XP values
* `/buddy` lets the student send/receive messages with the AI study buddy

**Wave 2 — SM-2 Flashcards**
* Completing a chapter auto-generates 8–12 cards
* `/review` surfaces due cards; Again/Hard/Good/Easy grading persists intervals correctly
* Backfill via `POST /api/flashcards/generate-missing` covers chapters without decks

**Wave 3 — Adaptive engine**
* Low scores on a chapter re-order subsequent chapters toward weakness
* Concept-level mastery persists in `mastery` table

**Wave 4 — Parent & Path**
* `/parent` shows read-only progress digest
* `/path` shows subject-ordered learning path with lock/unlock state

**Wave 5 — Immersive**
* `/story/[chapterId]` renders 5 narrative scenes
* `/podcast/[chapterId]` streams OpenAI TTS audio (6 voices selectable)
* `/career/[chapterId]` shows career glimpse paragraph
* `/scan` accepts a doubt photo and returns step-by-step solution via Claude Vision
* `/sim/projectile` canvas sim launches projectiles with correct analytical predictions

**Wave 6 — Wellness & Projects**
* `/focus` logs mood with coach-line response; Pomodoro completion grants XP
* `/project` generates a multi-day project plan; milestone checklist persists across reloads

**Wave 7 — Next-best-action**
* Dashboard "For you, right now" widget shows up to 3 NBA cards based on signals (streak risk, due flashcards, recent mood, rolling quiz average, missing check-in)

---
