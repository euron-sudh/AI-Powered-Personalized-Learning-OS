**Last Updated:** 2026-04-17 16:00

# 🧪 Testing AI Tutor Module

Complete guide to test the AI-powered tutoring engine.

---

## Prerequisites

Before testing, ensure:

✅ **Backend running** on http://localhost:8000
✅ **Frontend running** on http://localhost:3000
✅ **Logged in** with valid credentials
✅ **Profile created** (name, grade, subjects)
✅ **Supabase keys** in `.env` files

---

## 🎯 Test Plan Overview

```
1. Basic Flow Test          (5 min)
2. Voice Chat Test          (5 min)
3. Sentiment Analysis Test  (5 min)
4. Tool Calling Test        (5 min)
5. Adaptive Routing Test    (5 min)
6. Full End-to-End Test     (10 min)
```

**Total: ~30 minutes**

---

## Test 1️⃣: Basic Flow Test

**Goal:** Verify AI tutor initializes and greets the student

### Steps:

1. **Login** to http://localhost:3000
2. **Go to Dashboard** → Pick any subject
3. **Pick any chapter** to enter lesson
4. **Wait 3-5 seconds**

### Expected Results:

- ✅ Lesson page loads
- ✅ Session feed appears (left side)
- ✅ VideoFeed appears (right side)
- ✅ AI **speaks automatically** (you hear audio)
- ✅ **Transcript appears** in session feed
- ✅ **Status bar shows** "🎙️ Live"

### If Failed:

**Issue:** No audio, no transcript
- ✓ Check browser console (F12 → Console)
- ✓ Check if `OPENAI_API_KEY` is in `backend/.env`
- ✓ Check if WebSocket connects (Network tab → WS)

**Issue:** Page doesn't load
- ✓ Refresh page (Ctrl+R)
- ✓ Check backend is running (`http://localhost:8000/api/health`)

---

## Test 2️⃣: Voice Chat Test

**Goal:** Verify student can speak and AI responds

### Steps:

1. **From previous test**, wait for AI to finish speaking
2. **Click the mic button** 🎤 at bottom
3. **Speak clearly:** "Hello, explain this to me"
4. **Wait for response**

### Expected Results:

- ✅ Mic button **turns red** with "🔴"
- ✅ Status shows **"Listening… speak now"**
- ✅ After speaking, status shows **"AI is speaking…"**
- ✅ Your transcript appears as **speech bubble** (right aligned)
- ✅ AI response appears as **speech bubble** (left aligned)
- ✅ Audio plays for AI response

### If Failed:

**Issue:** Mic doesn't work
- ✓ Check browser permissions (🔒 icon in address bar)
- ✓ Verify microphone is plugged in/working
- ✓ Check browser console for WebSocket errors

**Issue:** Student speaks but AI doesn't respond
- ✓ Check backend logs for errors
- ✓ Verify `OPENAI_API_KEY` in backend/.env
- ✓ Check network tab for failed requests

---

## Test 3️⃣: Sentiment Analysis Test

**Goal:** Verify webcam detects emotions

### Steps:

1. **From previous test**, look at VideoFeed (top-right)
2. **Click "Start Camera"** button
3. **Allow camera permission** when browser asks
4. **Make different facial expressions:**
   - Normal face → should show 🎯 (engaged)
   - Confused face → should show 🤔 (confused)
   - Yawn/tired → should show 😴 (drowsy)
   - Happy face → should show 😊 (happy)

### Expected Results:

- ✅ Webcam **shows your video** in VideoFeed
- ✅ **Emotion indicator** shows current detected emotion
- ✅ **Confidence percentage** shows (e.g., 82%)
- ✅ **Sentiment history** (small colored dots) accumulates at bottom
- ✅ **Top bar** shows emoji of detected emotion (e.g., 🤔)

### If Failed:

**Issue:** Camera doesn't start
- ✓ Check browser camera permission
- ✓ Try a different browser
- ✓ Restart browser

**Issue:** Emotion not detected (shows "neutral")
- ✓ Make more pronounced expressions
- ✓ Check lighting (needs good light)
- ✓ Check `ANTHROPIC_API_KEY` in backend/.env

---

## Test 4️⃣: Tool Calling Test

**Goal:** Verify AI calls tools (YouTube, diagrams, questions)

### Steps:

1. **From Test 1**, after AI greets
2. **Look at session feed** (left side)
3. **Wait for AI to mention showing a video or diagram**
4. Or **speak:** "Show me a video about this"

### Expected Results - YouTube Video:

- ✅ **Card appears in feed** with:
  - 📺 YouTube icon
  - Title (e.g., "Newton's First Law")
  - **YouTube iframe embed**
  - Concept description
- ✅ **Feed auto-scrolls** to show new card
- ✅ **Video plays** in the card (you can watch it)

### Expected Results - Diagram:

- ✅ **Card appears in feed** with:
  - 📊 Diagram icon
  - Title (e.g., "Force vs Acceleration")
  - **Mermaid diagram rendered** (flowchart, graph, etc.)
  - Professional looking visualization

### Expected Results - Question:

- ✅ **Card appears in feed** with:
  - ❓ Question icon
  - Question text (e.g., "What is momentum?")
  - **Text input field** (placeholder: "Type your answer...")
  - "Submit" and "Answer verbally" buttons
  - Optional: 💡 Hint

### Expected Results - Stage Change:

- ✅ **Colored pill appears** showing:
  - 🎯 Current stage (TEACH, SIMPLIFY, ENGAGE, CHALLENGE, etc.)
  - Detected emotion in parentheses (e.g., "confused")

### If Failed:

**Issue:** No tool calls (no YouTube/diagram/question cards)
- ✓ Speak more and give AI chances to call tools
- ✓ Ask: "Can you show me a diagram?"
- ✓ Check backend logs for tool call errors
- ✓ Verify Mermaid is loaded (check console)

**Issue:** Card appears but content doesn't render
- ✓ YouTube: Check if videoId is valid (starts with 11 chars)
- ✓ Diagram: Check if mermaidCode is valid syntax
- ✓ Check browser console for JavaScript errors

---

## Test 5️⃣: Adaptive Routing Test

**Goal:** Verify AI adapts based on emotion

### Steps:

1. **Enable camera** (Test 3)
2. **Make confused face** (furrowed brow, squinting)
3. **Hold it for 2-3 seconds**
4. **Watch AI response**

### Expected Results - Confused:

- ✅ **Emotion detected:** 🤔 confused (0.7+)
- ✅ **Top bar updates** to show 🤔
- ✅ **Stage pill appears:** "SIMPLIFY (confused)"
- ✅ **AI speaks again** with:
  - Slower explanation
  - Simpler words
  - More examples
  - May call show_diagram tool
- ✅ **Confidence increases** in next response

### Expected Results - Bored:

- ✅ **Emotion detected:** 😐 bored (0.7+)
- ✅ **Stage pill appears:** "ENGAGE (bored)"
- ✅ **AI responds** with:
  - More interactive tone
  - Questions to engage
  - Video or diagram
  - More enthusiasm

### Expected Results - Drowsy:

- ✅ **Emotion detected:** 😴 drowsy (0.7+)
- ✅ **Stage pill appears:** "BREAK (drowsy)"
- ✅ **AI suggests:**
  - Taking a break
  - Physical activity
  - Come back later

### If Failed:

**Issue:** Emotion not detected
- ✓ Make more exaggerated expression
- ✓ Ensure good lighting
- ✓ Check camera is actually capturing your face

**Issue:** Emotion detected but AI doesn't adapt
- ✓ Check backend logs for emotion routing
- ✓ Verify LangGraph state machine is working
- ✓ Check if `injectSentimentContext()` is being called

---

## Test 6️⃣: Full End-to-End Test

**Goal:** Complete lesson flow with all features

### Flow:

```
1. Student enters lesson page
   ↓
2. AI greets (speak detection + sentiment)
   ↓
3. AI explains concept + shows video
   ↓
4. Student says "I don't understand"
   ↓
5. AI detects confusion + adapts
   ↓
6. AI re-explains with diagram
   ↓
7. AI asks comprehension question
   ↓
8. Student answers (verbal or typed)
   ↓
9. AI evaluates and provides feedback
   ↓
10. Continue or suggest break based on sentiment
```

### Steps:

1. **Login and enter lesson**
2. **Let AI speak** (don't interrupt)
3. **Speak:** "I'm confused, can you explain simpler?"
4. **Make confused face** on camera
5. **Wait for AI to adapt**
6. **Answer a comprehension question**
7. **Observe stage changes** in feed
8. **Note sentiment indicators** updating

### Success Criteria (All must pass):

- ✅ Auto-initiated voice (no button clicks)
- ✅ Sentiment detected from webcam
- ✅ Tool calls rendered (videos/diagrams/questions)
- ✅ AI adapts based on emotion
- ✅ Stage changes logged in feed
- ✅ Session feed populated with all content
- ✅ Real-time updates via WebSocket
- ✅ Notes auto-save in background
- ✅ No console errors
- ✅ Smooth user experience (no lag)

---

## 📊 Verification Checklist

```
BASIC FUNCTIONALITY
☐ AI greets within 3 seconds
☐ Sentiment indicator works
☐ VideoFeed shows webcam
☐ Session feed displays content

VOICE CHAT
☐ Microphone input works
☐ Transcript appears in feed
☐ AI speaks back
☐ Barge-in (interrupting) works

TOOL CALLING
☐ YouTube videos appear
☐ Diagrams render correctly
☐ Questions display with input
☐ Stage change pills show

SENTIMENT & ADAPTATION
☐ Emotions detected (🤔😴😊etc)
☐ Confidence scores show
☐ History timeline appears
☐ AI adapts to emotion changes

ADAPTIVE ROUTING
☐ Confused → SIMPLIFY
☐ Bored → ENGAGE
☐ Drowsy → BREAK
☐ Engaged → CHALLENGE

REALTIME & STATE
☐ Supabase events stream
☐ WebSocket updates live
☐ No polling delays
☐ Notes auto-save

PERFORMANCE
☐ < 3s first response
☐ < 500ms tool render
☐ No UI lag
☐ Smooth scrolling

UI/UX
☐ Unified feed (no tabs)
☐ Mobile responsive
☐ Dark theme applied
☐ All emojis render
```

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| No audio | `OPENAI_API_KEY` missing | Add to `backend/.env` |
| Mic doesn't work | Browser permission denied | Check 🔒 in address bar, click "Allow" |
| Emotion not detected | Poor lighting or wrong face | Use good lighting, make exaggerated expressions |
| Diagram doesn't render | Invalid Mermaid syntax | Check backend logs for syntax errors |
| YouTube card shows but no video | Invalid video ID | Check if video ID is correct (11 chars) |
| Stage doesn't change | Emotion not strong enough | Need confidence > 0.65 |
| Backend not responding | Server crashed | Check backend terminal, restart with `uvicorn...` |
| Frontend won't load | Port 3000 in use | Kill process: `lsof -i :3000; kill -9 <PID>` |
| CORS error | Backend CORS not configured | Check `main.py` CORS middleware |

---

## 📝 Test Results Template

Use this to document your testing:

```markdown
## Test Date: [DATE]
## Tester: [NAME]

### Test 1: Basic Flow
- [ ] AI greets automatically
- [ ] Transcript appears
- [ ] Status shows "Live"
Notes: ________________

### Test 2: Voice Chat
- [ ] Microphone works
- [ ] Student transcript appears
- [ ] AI responds
Notes: ________________

### Test 3: Sentiment
- [ ] Camera starts
- [ ] Emotion detected
- [ ] Confidence shows
Notes: ________________

### Test 4: Tool Calling
- [ ] Videos render
- [ ] Diagrams render
- [ ] Questions appear
Notes: ________________

### Test 5: Adaptive Routing
- [ ] Confused → SIMPLIFY
- [ ] Bored → ENGAGE
- [ ] AI adapts naturally
Notes: ________________

### Test 6: Full Flow
- [ ] All features work together
- [ ] No lag or errors
- [ ] Smooth experience
Notes: ________________

## Overall Status: [PASS/FAIL]
## Issues Found: [list any]
## Recommendation: [next steps]
```

---

## 🎥 What Good Output Looks Like

**Terminal Output (Backend):**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
[Requests log as you interact]
```

**Browser Console:**
```
[Minimal warnings, no red errors]
WebSocket connection established
Sentiment: confused (0.82)
Tool call: show_diagram
Content card rendered
```

**UI:**
- Clean, dark-themed lesson page
- Scrollable session feed with content
- Webcam showing your face
- Emotion indicator updating
- No lag when typing or speaking

---

## ✅ Success Criteria

**You'll know it's working when:**

1. ✅ AI speaks automatically (no button clicks)
2. ✅ You can see/hear the conversation in real-time
3. ✅ Webcam detects your emotions
4. ✅ Videos and diagrams appear inline
5. ✅ AI changes strategy when you look confused
6. ✅ Everything feels smooth (no lag)
7. ✅ Session feed shows the journey
8. ✅ Notes save automatically
9. ✅ No red errors in console
10. ✅ Student never gets bored (AI keeps adapting)

---

## 🚀 Next Steps If All Tests Pass

- [ ] Run load testing (multiple students)
- [ ] Test on mobile browser
- [ ] Test with poor internet
- [ ] Test with different emotions/expressions
- [ ] Record a demo video
- [ ] Gather user feedback
- [ ] Deploy to staging environment

---

**Happy testing! 🎉**

For more details, see:
- `IMPLEMENTATION_FLOW.md` — How it all works
- `CLAUDE.md` — Architecture details
- Backend API docs: http://localhost:8000/docs
