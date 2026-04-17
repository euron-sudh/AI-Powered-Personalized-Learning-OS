**Last Updated:** 2026-04-17 16:00

# LearnOS — AI-Led Tutor OS (Reference Plan)

**Saved**: 2026-04-14  
**Status**: APPROVED FOR IMPLEMENTATION  
**Branch**: dev  

This document is a frozen reference copy of the implementation plan. Use this to revert if needed.

See: `C:\Users\mpedu\.claude\plans\elegant-enchanting-scott.md` for the active plan.

## Quick Summary

**Vision**: AI tutor auto-initiates when student opens a lesson page. Teaches with voice + YouTube videos + diagrams. Asks questions. Adapts to live emotion sentiment from webcam. Student never bored.

**Implementation**: 
- **Backend**: LangGraph state machine brain (`TEACH → check emotion → SIMPLIFY/ENGAGE/CHALLENGE/BREAK`)
- **Frontend**: Voice tool calling (YouTube, diagram, question) + unified session feed + sentiment injection
- **New services**: `TutorSessionEngine` + `tutor_session` router + `learning_sessions` + `tutor_events` Supabase tables
- **No disruption**: All other modules (curriculum, activities, learning_os, onboarding) untouched

**11 Implementation Steps**:
1. Fix env vars (CORS, BACKEND_URL)
2. Add langgraph to requirements
3. Alembic migration 0006 (tutor_events schema)
4. Build TutorSessionEngine (LangGraph)
5. Build tutor_session router
6. Register router in main.py
7. Enhance useVoiceChat.ts (tools + auto-init)
8. Build AIContentCard.tsx
9. Build useTutorSession.ts
10. Update VideoFeed.tsx
11. Redesign lesson page

**Key Files to Create**:
- `backend/app/services/tutor_session_engine.py`
- `backend/app/routers/tutor_session.py`
- `backend/alembic/versions/0006_tutor_events.py`
- `frontend/src/hooks/useTutorSession.ts`
- `frontend/src/app/learn/components/AIContentCard.tsx`

**Key Files to Modify**:
- `backend/requirements.txt` (add langgraph)
- `backend/app/main.py` (register router)
- `frontend/src/hooks/useVoiceChat.ts` (tools + auto-init + sentiment inject)
- `frontend/src/app/learn/[subjectId]/[chapterId]/page.tsx` (new layout)
- `frontend/src/app/learn/components/VideoFeed.tsx` (external sentiment props)

---

## To Revert All Changes

```bash
git checkout backend/ frontend/
# Or selective:
git checkout backend/app/main.py frontend/src/app/learn/[subjectId]/[chapterId]/page.tsx
```

Delete new files:
```bash
rm backend/app/services/tutor_session_engine.py
rm backend/app/routers/tutor_session.py
rm backend/alembic/versions/0006_tutor_events.py
rm frontend/src/hooks/useTutorSession.ts
rm frontend/src/app/learn/components/AIContentCard.tsx
```

Undo migration 0006:
```bash
alembic downgrade -1
```

---

For full details, see the active plan file.
