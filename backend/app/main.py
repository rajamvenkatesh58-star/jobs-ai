from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api import applications, interview, jobs, profile
from app.auth.router import router as auth_router
from app.config import get_settings

settings = get_settings()

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Jobs AI",
    description="AI-powered job application co-pilot and interview coach for Australia",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [settings.frontend_origin, "http://localhost:5173"]
# Allow all Vercel preview deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(interview.router, prefix="/api")


@app.get("/api/health")
@limiter.limit("60/minute")
async def health(request: Request):
    return {"status": "ok", "app": settings.app_name}
