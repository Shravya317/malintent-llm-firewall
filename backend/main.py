"""
main.py — FastAPI application entry point for the MalIntent API.

This file:
  - Loads .env before anything reads environment variables
  - Initialises the database (creates tables on startup)
  - Registers all middleware: CORS, rate limiting, request logging
  - Mounts all four routers under the /api/v1 prefix

To start the server (from the backend/ directory):
    uvicorn main:app --reload

Swagger UI is auto-generated at: http://localhost:8000/docs
ReDoc UI is available at:        http://localhost:8000/redoc

CORS: Shravya's Vite React dev server runs on localhost:5173 by default.
Both :5173 and :3000 are allowed.  Confirm her port at Sunday's sync and add
it to allow_origins if different — a CORS misconfiguration is the #1 cause of
silent integration failures.

Rate limit: 200/minute for development (raised from the 60/minute production
default).  Lower it to 60/minute before the demo.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

# Load .env BEFORE anything else reads os.getenv — order is critical here.
from dotenv import load_dotenv
load_dotenv()  # looks for backend/.env by default when run from backend/

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from database import Base, engine
from routers import scan, logs, stats, config as config_router

# ── LOGGING ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("malintent")


# ── RATE LIMITER ─────────────────────────────────────────────────────────────
# 200/minute for development — Shravya's React StrictMode fires hooks twice per
# render, which can hit 60/minute quickly during active development.
# Change to "60/minute" before deploying to production / demo.

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


# ── LIFESPAN ─────────────────────────────────────────────────────────────────
# Using the modern lifespan context manager instead of the deprecated @on_event
# decorator.  Base.metadata.create_all is idempotent — safe to run on every
# startup whether or not the tables already exist.

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables on startup, yield, then clean up on shutdown."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created / verified.  Server is ready.")
    yield
    # Nothing to clean up in development; connection pool closes automatically.


# ── APP INSTANCE ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="MalIntent API",
    description=(
        "LLM Prompt Injection Firewall — REST API.  "
        "Three-layer detection engine (Pattern + ML + Semantic), "
        "PII-scrubbed logging, Fernet-encrypted configuration, "
        "and a Secure Execution Layer skeleton."
    ),
    version="0.4.0",    # bumped each week
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ── MIDDLEWARE: CORS ──────────────────────────────────────────────────────────
# Allow both the default Vite port (:5173) and CRA/Next default (:3000).
# If Shravya uses a different port, add it here before Sunday's sync.

ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite default (Shravya's dev server)
    "http://localhost:3000",   # CRA / Next.js fallback
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── MIDDLEWARE: RATE LIMITING ─────────────────────────────────────────────────
# slowapi reads app.state.limiter to apply limits on decorated endpoints.

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── MIDDLEWARE: REQUEST LOGGING ───────────────────────────────────────────────
# Logs METHOD PATH → STATUS_CODE (latency_ms) for every request.
# The prompt payload is NOT logged here — it is PII-scrubbed separately in the
# scan router before any storage.

@app.middleware("http")
async def log_requests(request: Request, call_next) -> Response:
    """
    Structured request logger.  Attaches the observed latency to every log line
    so you can spot slow endpoints at a glance in the dev console.
    """
    t0 = time.perf_counter()
    response: Response = await call_next(request)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    logger.info(
        "%s %s → %d  (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


# ── ROUTERS ───────────────────────────────────────────────────────────────────

app.include_router(scan.router,          prefix="/api/v1", tags=["scan"])
app.include_router(logs.router,          prefix="/api/v1", tags=["logs"])
app.include_router(stats.router,         prefix="/api/v1", tags=["stats"])
app.include_router(config_router.router, prefix="/api/v1", tags=["config"])


# ── ROOT HEALTH CHECK ────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
async def root():
    """
    Root health check.  Shravya's 'Test Connection' button can hit this endpoint
    as a lightweight ping before the full /api/v1/scan/input call.
    """
    return {"service": "MalIntent API", "version": "0.4.0", "status": "operational"}


@app.get("/health", tags=["health"])
async def health():
    """Explicit health endpoint — useful for Docker health checks and uptime monitors."""
    return {"status": "ok"}