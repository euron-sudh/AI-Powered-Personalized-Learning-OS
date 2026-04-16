from contextlib import asynccontextmanager
import traceback
import sys
import logging

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIASGIMiddleware

from app.config import settings
from app.learning_os.service import learning_os_service
from app.learning_os.router import router as learning_os_router

logging.basicConfig(filename="debug.log", level=logging.DEBUG, format="%(asctime)s - %(message)s")
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
    curriculum,
    lessons,
    notes,
    onboarding,
    progress,
    tutor_session,
    video,
    voice,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — seed the adaptive learning OS engine
    logger.info("=== APP STARTUP ===")
    try:
        learning_os_service.initialize()
        logger.info("Learning OS service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize learning OS service: {e}")
    yield
    logger.info("=== APP SHUTDOWN ===")
    # Shutdown


app = FastAPI(
    title="LearnOS API",
    description="AI-Powered Personalized Learning OS",
    version="0.1.0",
    lifespan=lifespan,
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import sys
    print(f">>> MIDDLEWARE: {request.method} {request.url.path}", file=sys.stderr)
    sys.stderr.flush()
    logger.info(f">>> {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        print(f"<<< MIDDLEWARE: {response.status_code}", file=sys.stderr)
        sys.stderr.flush()
        logger.info(f"<<< {response.status_code}")
        return response
    except Exception as e:
        print(f"!!! MIDDLEWARE EXCEPTION: {type(e).__name__}: {e}", file=sys.stderr)
        sys.stderr.flush()
        logger.error(f"!!! EXCEPTION: {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())
        raise

# Global exception handler for debugging
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_detail = f"[GLOBAL HANDLER] {request.method} {request.url.path}\n[GLOBAL HANDLER] {type(exc).__name__}: {exc}\n[GLOBAL HANDLER] Traceback: {traceback.format_exc()}"
    logger.error(error_detail)
    with open("debug.log", "a") as f:
        f.write(error_detail + "\n")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )

# Rate limiting — DISABLED: SlowAPI middleware corrupts ASGI message sequence
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
app.include_router(video.router, prefix="/api/video", tags=["video"])
app.include_router(activities.router, prefix="/api/activities", tags=["activities"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
app.include_router(tutor_session.router, prefix="/api/tutor-session", tags=["tutor-session"])

# Adaptive Learning OS — multi-agent engine routes (/api/system/*)
app.include_router(learning_os_router)


@app.get("/api/health")
async def health_check():
    with open("debug.log", "a") as f:
        f.write("[HEALTH] Health check called\n")
    return {
        "status": "healthy",
        "default_learner_id": settings.default_learner_id,
    }

@app.post("/api/test-endpoint")
async def test_endpoint():
    """Simple test endpoint to verify requests reach the backend."""
    with open("debug.log", "a") as f:
        f.write("[TEST] Test endpoint called\n")
    return {"message": "Test endpoint works"}

@app.post("/test-simple")
async def test_simple():
    """Ultra-simple test - no prefix, no dependencies."""
    return {"status": "ok"}

