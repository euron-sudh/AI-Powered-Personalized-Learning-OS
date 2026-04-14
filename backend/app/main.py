from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIASGIMiddleware

from app.config import settings
from app.learning_os.service import learning_os_service
from app.learning_os.router import router as learning_os_router

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
    video,
    voice,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — seed the adaptive learning OS engine
    learning_os_service.initialize()
    yield
    # Shutdown


app = FastAPI(
    title="LearnOS API",
    description="AI-Powered Personalized Learning OS",
    version="0.1.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIASGIMiddleware)

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

# Adaptive Learning OS — multi-agent engine routes (/api/system/*)
app.include_router(learning_os_router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "default_learner_id": settings.default_learner_id,
    }
