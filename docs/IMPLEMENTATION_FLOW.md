**Last Updated:** 2026-04-24

# 🔄 Implementation Flow Diagrams

Visual representation of how the AI Tutor OS works end-to-end.

---

## 1️⃣ Student's Journey (Happy Path)

```
┌─────────────────────────────────────────────────────────────┐
│  STUDENT ENTERS LESSON PAGE                                 │
│  http://localhost:3000/learn/[subject]/[chapter]            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ FRONTEND LOADS                │
        │ - useSentiment()   ✓ LIFTED  │
        │ - useTutorSession()✓ NEW     │
        │ - useVoiceChat()   ✓ ENHANCED│
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ POST /api/tutor-session/start │
        │ (backend creates session)      │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ BACKEND INITIALIZES           │
        │ - TutorSessionEngine starts   │
        │ - LangGraph state machine     │
        │ - Creates learning_sessions   │
        │   row in Supabase             │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ VOICE AUTO-CONNECTS           │
        │ (useVoiceChat.connect())      │
        │ - Gemini Live WebSocket proxy │
        │ - Sends system prompt         │
        │ - Triggers response.create    │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ AI GREETS STUDENT             │
        │ ⏱️ Within 3 seconds            │
        │ 🎙️ Audio plays + transcript   │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ WEBCAM SENTIMENT STARTS       │
        │ connectSentiment() runs       │
        │ - Frame capture every 5s      │
        │ - Claude Vision analysis      │
        │ - Updates currentSentiment    │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ SESSION FEED POPULATES        │
        │ - AI content appears in feed  │
        │   • 📺 YouTube videos         │
        │   • 📊 Diagrams               │
        │   • ❓ Questions              │
        │   • 🎯 Stage changes          │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ STUDENT EXPERIENCE            │
        │ ✅ Never bored                │
        │ ✅ AI adapts to emotion       │
        │ ✅ Content flows naturally    │
        │ ✅ Can speak anytime          │
        └──────────────────────────────┘
```

---

## 2️⃣ AI Decision Flow (LangGraph State Machine)

```
┌─────────────────────────────────────────────────────────────┐
│  STUDENT INPUT (emotion, answer, silence)                   │
│  Detected via sentiment or voice transcript                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ POST /api/tutor-session/emotion
        │ (send: emotion, confidence)   │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ LANGGRAPH STATE MACHINE       │
        │ Current state: {              │
        │   emotion, mastery,           │
        │   stage, confusion_count      │
        │ }                             │
        └────────────┬─────────────────┘
                     │
        ┌────────────┴────────────────────────────┐
        │                                         │
        ▼                                         ▼
    ┌─────────────────────┐          ┌──────────────────────┐
    │ EMOTION CHECK NODE  │          │  MASTERY CHECK NODE  │
    │ Is emotion strong?  │          │ Level: HIGH/MID/LOW? │
    │                     │          │                      │
    │ • high? → route     │          │ • >0.7 → CHALLENGE   │
    │ • low? → continue   │          │ • 0.3-0.7 → TEACH    │
    └────────┬────────────┘          │ • <0.3 → SIMPLIFY    │
             │                       └──────────┬───────────┘
             │                                  │
        ┌────┴──────────────────────────────────┴─────┐
        │                                             │
        ▼ CONFUSED (0.8+)    BORED (0.7+)   FRUSTRATED  DROWSY
        │
        │                                    │
        ▼                                    ▼
    ┌──────────────────┐             ┌─────────────────┐
    │ SIMPLIFY NODE    │             │ ENGAGE NODE     │
    ├──────────────────┤             ├─────────────────┤
    │ ✓ Slow down      │             │ ✓ Ask question  │
    │ ✓ Use analogy    │             │ ✓ Show video    │
    │ ✓ Repeat concept │             │ ✓ More examples │
    │ ✓ Check again    │             │ ✓ Interactive   │
    └────────┬─────────┘             └────────┬────────┘
             │                               │
             └───────────────┬───────────────┘
                             │
                             ▼
        ┌──────────────────────────────┐
        │ LOG EVENT TO SUPABASE         │
        │ INSERT INTO tutor_events {    │
        │   session_id,                 │
        │   event_type: 'SIMPLIFY',     │
        │   payload: {...}              │
        │ }                             │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ STREAM RESPONSE TO FRONTEND   │
        │ - Audio + transcript          │
        │ - Tool calls (video, diagram) │
        │ - Events via WebSocket        │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ FRONTEND UPDATES SESSION FEED │
        │ - New content cards           │
        │ - Stage change pill           │
        │ - Auto-scroll to bottom       │
        └──────────────────────────────┘
```

---

## 3️⃣ System Architecture (Frontend ↔ Backend)

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│              (Next.js React App on :3000)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │ HOOKS (State Management)                         │     │
│  ├──────────────────────────────────────────────────┤     │
│  │ • useSentiment()           ← Lifted to page      │     │
│  │   ├─ Webcam capture                             │     │
│  │   ├─ Claude Vision analysis                     │     │
│  │   └─ currentSentiment state                     │     │
│  │                                                  │     │
│  │ • useTutorSession()        ← NEW                │     │
│  │   ├─ POST /tutor-session/start                  │     │
│  │   ├─ Supabase Realtime subscribe                │     │
│  │   └─ pushEmotion() function                     │     │
│  │                                                  │     │
│  │ • useVoiceChat()           ← ENHANCED           │     │
│  │   ├─ WebSocket to Gemini Live (via /api/voice/gemini proxy) │
│  │   ├─ Auto-initiates on connect()                │     │
│  │   ├─ Tool call handling                         │     │
│  │   └─ injectSentimentContext()                   │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │ COMPONENTS                                       │     │
│  ├──────────────────────────────────────────────────┤     │
│  │ • VideoFeed                                      │     │
│  │   └─ Receives externalSentiment prop             │     │
│  │                                                  │     │
│  │ • AIContentCard       ← NEW                      │     │
│  │   ├─ YouTube embed (type='youtube')             │     │
│  │   ├─ Diagram render (type='diagram')            │     │
│  │   ├─ Question card (type='question')            │     │
│  │   └─ Stage pill (type='stage_change')           │     │
│  │                                                  │     │
│  │ • Session Feed (unified)                        │     │
│  │   └─ Displays AIContentItem[] array             │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
        │                                              │
        │ HTTP + WebSocket                           │
        │                                            │
        ▼                                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│            (FastAPI Python App on :8000)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │ ROUTERS (API Endpoints)                          │     │
│  ├──────────────────────────────────────────────────┤     │
│  │ POST /api/tutor-session/start                    │     │
│  │   └─ Returns session_id                          │     │
│  │                                                  │     │
│  │ POST /api/tutor-session/emotion                  │     │
│  │   └─ Triggers LangGraph step                     │     │
│  │                                                  │     │
│  │ GET /api/tutor-session/{session_id}              │     │
│  │   └─ Returns current state                       │     │
│  │                                                  │     │
│  │ WS /api/tutor-session/ws/{session_id}            │     │
│  │   └─ Streams tutor_events in real-time          │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │ SERVICES (Business Logic)                        │     │
│  ├──────────────────────────────────────────────────┤     │
│  │ TutorSessionEngine         ← NEW (LangGraph)     │     │
│  │   ├─ teach_node()                                │     │
│  │   ├─ emotion_check_node()                        │     │
│  │   ├─ simplify_node()                             │     │
│  │   ├─ engage_node()                               │     │
│  │   ├─ challenge_node()                            │     │
│  │   ├─ encourage_node()                            │     │
│  │   └─ break_node()                                │     │
│  │                                                  │     │
│  │ TeachingEngine (reused)                          │     │
│  │   └─ stream_teaching_response()                  │     │
│  │                                                  │     │
│  │ SentimentAnalyzer (reused)                       │     │
│  │   └─ determine_adaptive_action()                 │     │
│  │                                                  │     │
│  │ VoiceManager (reused)                            │     │
│  │   └─ Gemini Live integration with tool calls     │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │ DATABASE (Supabase PostgreSQL)                   │     │
│  ├──────────────────────────────────────────────────┤     │
│  │ learning_sessions table ← NEW                    │     │
│  │   ├─ session_id (PK)                             │     │
│  │   ├─ student_id (FK)                             │     │
│  │   ├─ chapter_id (FK)                             │     │
│  │   ├─ stage (TEACH/SIMPLIFY/ENGAGE/etc)          │     │
│  │   ├─ emotion                                     │     │
│  │   ├─ mastery (float 0-1)                         │     │
│  │   └─ created_at                                  │     │
│  │                                                  │     │
│  │ tutor_events table ← NEW                         │     │
│  │   ├─ id (PK)                                     │     │
│  │   ├─ session_id (FK)                             │     │
│  │   ├─ event_type (TEACH/SIMPLIFY/etc)            │     │
│  │   ├─ payload (JSONB)                             │     │
│  │   └─ created_at                                  │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
        │                                              │
        │ Realtime subscription (Supabase)           │
        │ WebSocket to frontend                      │
        │                                            │
        └────────────────────────────────────────────┘
```

---

## 4️⃣ Sentiment Injection Flow

```
┌─────────────────────────────────────────────────────────────┐
│ WEBCAM DETECTS EMOTION                                      │
│ useSentiment() captures frame every 5s                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ CLAUDE VISION ANALYSIS       │
        │ Emotion: 'confused'          │
        │ Confidence: 0.82             │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ USEEFFECT WATCHES            │
        │ currentSentiment changes     │
        │ → triggers injection logic   │
        └────────────┬─────────────────┘
                     │
        ┌────────────┴────────────────────────────┐
        │ CHECKS:                                 │
        │ • confidence >= 0.65? ✓                 │
        │ • emotion != 'engaged'? ✓               │
        │ • 60s debounce passed? ✓                │
        └────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────────────────────┐
        │                                         │
        ▼                                         ▼
    ┌──────────────────┐          ┌──────────────────────┐
    │ INJECT CONTEXT   │          │ PUSH TO SESSION      │
    │ INTO VOICE       │          │ pushEmotion()        │
    ├──────────────────┤          ├──────────────────────┤
    │ voiceChat.       │          │ POST /tutor-session/ │
    │ injectSentiment  │          │ emotion              │
    │ Context()        │          │                      │
    │                  │          │ Payload: {           │
    │ Sends hidden     │          │   emotion,           │
    │ system message   │          │   confidence         │
    │ to OpenAI        │          │ }                    │
    │ Realtime:        │          └──────────┬───────────┘
    │                  │                     │
    │ "[Context:       │                     ▼
    │  Student         │          ┌──────────────────────┐
    │  appears         │          │ LANGGRAPH STEP       │
    │  confused        │          │ (emotion_check_node) │
    │  (0.82).         │          │                      │
    │  Please          │          │ Routes to:           │
    │  simplify...]"   │          │ • SIMPLIFY node      │
    │                  │          │ • Updates stage      │
    │                  │          │ • Logs event         │
    └──────────┬───────┘          └──────────┬───────────┘
               │                            │
               └────────────┬───────────────┘
                            │
                            ▼
        ┌──────────────────────────────┐
        │ AI RESPONDS NATURALLY         │
        │ • Slows down explanation      │
        │ • Uses simpler words          │
        │ • Asks "does this make sense?"│
        │ • May trigger show_diagram    │
        │   tool call                   │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ FRONTEND UPDATES             │
        │ • New tutor response appears  │
        │ • Diagram card renders       │
        │ • Sentiment indicator shows  │
        │   adapted response           │
        └──────────────────────────────┘
```

---

## 5️⃣ Tool Calling Flow (YouTube/Diagram/Question)

```
┌─────────────────────────────────────────────────────────────┐
│ AI DECIDES: "Let me show you a video"                       │
│ (during voice streaming)                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ GEMINI LIVE API              │
        │ Returns:                     │
        │ {                            │
        │   type: 'function_call',     │
        │   name: 'show_youtube_video',│
        │   arguments: {               │
        │     video_id: 'kosggg5uXFo', │
        │     title: 'Newton...',      │
        │     concept: 'Forces'        │
        │   }                          │
        │ }                            │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ USEVC HOOKonmessage HANDLER  │
        │ Detects function_call        │
        │ Calls onToolCall callback:   │
        │ onToolCall('show_youtube_...,│
        │            { video_id, ... })│
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ PAGE TOOL HANDLER            │
        │ handleToolCall() in lesson   │
        │ [chapterId]/page.tsx         │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ CREATE CONTENT ITEM          │
        │ {                            │
        │   id: 'tool-1713135600',     │
        │   type: 'youtube',           │
        │   videoId: 'kosggg5uXFo',    │
        │   title: 'Newton's Laws...',│
        │   concept: 'Forces'          │
        │ }                            │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ ADD TO aiContent STATE       │
        │ setAiContent(prev =>         │
        │   [...prev, contentItem]     │
        │ )                            │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ REACT RE-RENDERS             │
        │ Session feed updates         │
        │ Ref scrolls to bottom        │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ AICONTENTCARD RENDERS        │
        │ <AIContentCard                │
        │   type="youtube"              │
        │   videoId="kosggg5uXFo"       │
        │   title="Newton's Laws..."    │
        │ />                            │
        │                               │
        │ Output:                       │
        │ ┌─────────────────────────┐  │
        │ │ 📺 Newton's Laws        │  │
        │ │ [YouTube iframe embed]   │  │
        │ │ Concept: Forces         │  │
        │ └─────────────────────────┘  │
        └──────────────────────────────┘
```

---

## 6️⃣ Data Flow: Request → Processing → Response

```
FRONTEND                          BACKEND                    DATABASE
┌──────────────────┐             ┌──────────────┐           ┌─────────┐
│ Page Load        │─────────────▶│ tutor-session│           │Supabase │
│ useTutorSession  │ POST /start  │ /start route │──────────▶│ Create  │
│ Calls connect()  │ {chapterId}  │              │           │ Session │
└──────────────────┘             └──────────────┘           └─────────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │ TutorSession │
                                 │ Engine init  │
                                 │ LangGraph    │
                                 │ compile()    │
                                 └──────────────┘

┌──────────────────┐             ┌──────────────┐
│ useVoiceChat     │─────────────▶│ /voice/ws    │
│ Connect WebSocket│ WebSocket    │ OpenAI Stream│
└──────────────────┘             │ Start voice  │
        │                         └──────────────┘
        │                                │
        ▼                                ▼
┌──────────────────┐             ┌──────────────┐           ┌─────────┐
│ Receive: Audio   │◀────────────│ Stream chunks│◀──────────│ Claude  │
│ + Transcript     │ Function    │ + tool calls │           │ API     │
│ + Tool calls     │ Response    │ + events     │           └─────────┘
└──────────────────┘             └──────────────┘

        │
        │ Call: onToolCall()
        ▼
┌──────────────────┐
│ handleToolCall() │
│ Update aiContent │
│ State updates    │
└──────────────────┘
        │
        │ setAiContent()
        ▼
┌──────────────────┐
│ React re-renders │
│ Session feed     │
│ New card appears │
└──────────────────┘

┌──────────────────┐             ┌──────────────┐           ┌─────────┐
│ useSentiment     │─────────────▶│ /video/      │──────────▶│ Claude  │
│ Detects emotion  │ POST /analyze│ analyze      │ Vision    │ Vision  │
└──────────────────┘             │              │ Analysis  └─────────┘
        │                         └──────────────┘
        │
        ▼
┌──────────────────┐
│ currentSentiment │
│ Updated          │
└──────────────────┘
        │
        │ useEffect triggers
        ▼
┌──────────────────┐             ┌──────────────┐           ┌─────────┐
│ Inject context   │─────────────▶│ /tutor-      │──────────▶│Supabase │
│ + pushEmotion()  │ POST /emotion│ session/     │ Log event │ Log     │
└──────────────────┘             │ emotion      │           │ Event   │
                                 └──────────────┘           └─────────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │ LangGraph    │
                                 │ Routes step  │
                                 │ (SIMPLIFY/   │
                                 │  ENGAGE/etc) │
                                 └──────────────┘
```

---

## 7️⃣ Complete End-to-End Timeline

```
TIME    FRONTEND                  BACKEND                   USER SEES
─────────────────────────────────────────────────────────────────────

0s      Student opens lesson page
        Page.tsx mounts
        ├─ useSentiment()
        ├─ useTutorSession() → POST /start
        └─ useVoiceChat() ready to connect

0.5s                              Backend initializes
                                  TutorSessionEngine
                                  Creates session in DB

1s      useVoiceChat.connect()    Gemini Live (proxy)
        starts WebSocket          session created

1.5s                              AI system prompt
                                  loaded

2s                                AI generates
                                  greeting response

2.5s    Audio chunk received      Streaming response    🎙️ AI SPEAKING
        Transcript updates        from OpenAI           Voice plays

3s      Tool call: show_youtube   Tool detection       🎙️ AI says:
                                                        "Let me show
                                                        you a video"

3.2s    handleToolCall fires      Log event to          📺 YouTube
        → setAiContent()          tutor_events          card appears

3.5s    Render YouTube card       Event streams via     in feed
        Feed auto-scrolls         WebSocket

4s      useSentiment detects      -                     Webcam
        emotion: confused (0.8)                         indicator
                                                        shows 🤔

4.5s    injectSentimentContext()  pushEmotion()         -
        + pushEmotion()           triggers

5s      -                         LangGraph emotion_    -
                                  check → SIMPLIFY
                                  node selected

5.5s    -                         AI re-explaining      🎙️ AI ADAPTS
                                  with simpler          Speaking
                                  language, calls       again
                                  show_diagram tool

6s      Tool call: show_diagram   Log SIMPLIFY event   📊 Diagram
        handleToolCall fires      to tutor_events       card appears

6.5s    Render diagram card      Event streams        -

7s      Student hears complete   -                    🎙️ AI: "Does
        new explanation                                this make
                                                       sense?"

8s+     Student interaction      Awaiting voice       💬 Student
        (speaks, types answer)    input or emotion     can speak
                                  change               anytime
```

---

## 8️⃣ Component Dependency Graph

```
┌───────────────────────────────────────────────────────────────┐
│                    page.tsx (Main Page)                        │
│         [subjectId]/[chapterId] - CENTRAL HUB                │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Hooks Used:                                                  │
│  ├─ useSentiment()          ◄── LIFTED (was internal)        │
│  ├─ useTutorSession()       ◄── NEW                          │
│  └─ useVoiceChat()          ◄── ENHANCED (tools + inject)    │
│                                                               │
│  State Managed:                                               │
│  ├─ aiContent[]             ◄── NEW (content feed)           │
│  ├─ notes (unchanged)                                         │
│  └─ notesOpen (collapsible)                                   │
│                                                               │
│  Callbacks:                                                   │
│  ├─ handleToolCall()        ◄── NEW (tool routing)           │
│  ├─ sentiment → inject      ◄── NEW (emotion wiring)         │
│  └─ sentiment → pushEmotion ◄── NEW (session routing)        │
│                                                               │
│  Children Rendered:                                           │
│  ├─ VideoFeed              ◄── ENHANCED (externalSentiment)  │
│  ├─ AIContentCard[]         ◄── NEW (dynamic cards)          │
│  └─ Notes textarea                                            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
        │                                              │
        ├──────────────────┬───────────────────────────┤
        │                  │                           │
        ▼                  ▼                           ▼
   ┌─────────┐      ┌──────────┐            ┌──────────────┐
   │VideoFeed│      │AIContent │            │ Notes Panel  │
   │         │      │Card      │            │              │
   │ Props:  │      │ Props:   │            │ Props:       │
   │ ├─camera│      │ ├─type   │            │ ├─value      │
   │ ├─sent  │      │ ├─content│            │ ├─onChange   │
   │ └─history       │ └─data   │            │ └─saveState  │
   └─────────┘      └──────────┘            └──────────────┘
```

---

## 📊 Summary

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  FLOW OVERVIEW:                                            │
│                                                             │
│  1. Student enters lesson page                             │
│  2. Frontend lifts sentiment, initializes tutor session    │
│  3. Backend LangGraph state machine starts                 │
│  4. Voice auto-connects, AI greets                         │
│  5. Sentiment injected into voice context                  │
│  6. LangGraph routes based on emotion + mastery            │
│  7. Tool calls create content cards in session feed        │
│  8. Supabase Realtime streams events                       │
│  9. Loop continues until complete or student exits         │
│                                                             │
│  RESULT: AI-led tutoring experience, never bored           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**For more details, see:**

- `CLAUDE.md` — Full architecture
- `PROJECT_TREE.md` — File structure
- `IMPLEMENTATION_REPORT.md` — What was built
