from contextlib import asynccontextmanager
import traceback
import sys
import logging
import asyncio

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIASGIMiddleware

from app.config import settings

# Windows event loop policy fix - must be before any async operations
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.2,
        profiles_sample_rate=0.1,
    )
from app.core.rate_limiter import limiter
from app.routers import (
    activities,
    auth,
    buddy,
    challenges,
    curriculum,
    flashcards,
    immersive,
    leaderboard,
    lessons,
    notes,
    onboarding,
    parent,
    practice,
    progress,
    projects,
    suggest,
    sessions,
    tutor_session,
    video,
    voice,
    voice_gemini,
    wellness,
    learning,
    youtube,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=== APP STARTUP ===")
    yield
    logger.info("=== APP SHUTDOWN ===")
    # Shutdown


app = FastAPI(
    title="LearnOS API",
    description="AI-Powered Personalized Learning OS",
    version="0.1.0",
    lifespan=lifespan,
)

# Request logging middleware (Windows-safe - no stderr)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        logger.info(f">>> {request.method} {request.url.path}")
    except Exception:
        pass
        
    try:
        response = await call_next(request)
        try:
            logger.info(f"<<< {response.status_code}")
        except Exception:
            pass
        return response
    except Exception as e:
        try:
            logger.error(f"!!! EXCEPTION: {type(e).__name__}: {e}")
            logger.error(traceback.format_exc())
        except Exception:
            pass
        raise

from fastapi import HTTPException

# Global exception handler for debugging
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    try:
        logger.exception(f"{request.method} {request.url.path}")
    except Exception:
        pass

    status_code = exc.status_code if isinstance(exc, HTTPException) else 500
    detail = exc.detail if isinstance(exc, HTTPException) else str(exc)

    return JSONResponse(
        status_code=status_code,
        content={"error": "Error" if isinstance(exc, HTTPException) else "Internal server error", "detail": detail},
    )


# DISABLED: SlowAPI middleware corrupts ASGI message sequence (sends http.response.start twice)
# Rate limiting non-functional but app stability is critical
# app.state.limiter = limiter
# app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# app.add_middleware(SlowAPIASGIMiddleware)

_is_dev = any("localhost" in o for o in settings.cors_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"http://localhost:\d+" if _is_dev else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["onboarding"])
app.include_router(curriculum.router, prefix="/api/curriculum", tags=["curriculum"])
app.include_router(lessons.router, prefix="/api/lessons", tags=["lessons"])
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
app.include_router(voice_gemini.router, prefix="/api/voice", tags=["voice-gemini"])
app.include_router(video.router, prefix="/api/video", tags=["video"])
app.include_router(activities.router, prefix="/api/activities", tags=["activities"])
app.include_router(practice.router, prefix="/api/practice", tags=["practice"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(sessions.router, prefix="/api", tags=["sessions"])
app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
app.include_router(tutor_session.router, prefix="/api/tutor-session", tags=["tutor-session"])
app.include_router(learning.router, prefix="/api/learning", tags=["learning"])
app.include_router(challenges.router, prefix="/api/challenges", tags=["challenges"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["flashcards"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])
app.include_router(parent.router, prefix="/api/parent", tags=["parent"])
app.include_router(buddy.router, prefix="/api/buddy", tags=["buddy"])
app.include_router(immersive.router, prefix="/api/immersive", tags=["immersive"])
app.include_router(wellness.router, prefix="/api/wellness", tags=["wellness"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(suggest.router, prefix="/api/suggest", tags=["suggest"])
app.include_router(youtube.router, prefix="/api/youtube", tags=["youtube"])

# Adaptive Learning OS — multi-agent engine routes (/api/system/*)


@app.get("/api/health")
async def health_check():
    logger.info("Health check called")
    return {
        "status": "healthy",
        "default_learner_id": settings.default_learner_id,
    }

@app.post("/api/test-endpoint")
async def test_endpoint():
    """Simple test endpoint to verify requests reach the backend."""
    logger.info("Test endpoint called")
    return {"message": "Test endpoint works"}

@app.post("/test-simple")
async def test_simple():
    """Ultra-simple test - no prefix, no dependencies."""
    return {"status": "ok"}

