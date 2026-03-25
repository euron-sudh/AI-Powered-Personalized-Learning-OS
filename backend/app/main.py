from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIASGIMiddleware

from app.config import settings
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
    # Startup
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"http://localhost:\d+",  # allow any localhost port in dev
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


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
