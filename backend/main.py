"""
main.py — FastAPI application entry point for the MalIntent API.

This file:
  - Loads .env before anything reads environment variables
  - Initialises the database (creates tables on startup)
  - Warms the three-layer detection pipeline — including PromptGuard-86M —
    BEFORE accepting traffic (Week 5)
  - Registers all middleware: CORS, rate limiting, request logging
  - Mounts all four routers under the /api/v1 prefix

To start the server (from the backend/ directory):
    uvicorn main:app --reload

Custom API Docs at: http://localhost:8000/docs  (replaces default Swagger UI)

CORS: Shravya's Vite React dev server runs on localhost:5173 by default.
Both :5173 and :3000 are allowed.  Confirm her port at Sunday's sync and add
it to allow_origins if different — a CORS misconfiguration is the #1 cause of
silent integration failures.

Rate limit: 200/minute for development (raised from the 60/minute production
default).  Lower it to 60/minute before the demo.

Week 5 change — model warm-up at startup
-----------------------------------------
Before Week 5, RiskScorer (and therefore the PromptGuard-86M model inside it)
was lazily constructed by routers/scan.py on the FIRST call to /api/v1/scan/input.
That meant whichever user happened to send the first prompt after a server
restart paid the full cold-load cost (hundreds of milliseconds to a few
seconds, depending on hardware) on top of the actual inference time — directly
visible to Shravya as a one-off slow request while she's testing live.

The lifespan handler below now explicitly warms the pipeline during startup,
so "server is ready" genuinely means "every layer, including the ML model, is
already resident in memory."  Restart the server and watch the logs: you
should see the model-load line and a single warm-up confirmation BEFORE the
"Database tables created / verified. Server is ready." line, and you should
never see a second model-load line no matter how many requests follow.

Week 8 change — custom API docs page
--------------------------------------
Default Swagger UI replaced with a custom branded docs page served from
static/docs.html.  The page uses Space Grotesk + Syne + JetBrains Mono fonts,
matches the dashboard dark theme, and pulls live stats from /api/v1/stats
automatically on load.  docs_url and redoc_url are set to None to disable
FastAPI's auto-generated pages; /docs is now a custom FileResponse route.
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
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from database import init_db
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
    """
    Startup sequence (order matters):
      1. Create / verify database tables.
      2. Warm the full three-layer detection pipeline (Pattern + ML + FAISS),
         which as a side effect loads PromptGuard-86M into memory exactly once.
      3. Yield — server now accepts traffic with everything already warm.
    """
    init_db()
    logger.info("Database tables created / verified.")

    warmup_start = time.perf_counter()
    try:
        # scan.warm_up() triggers routers/scan.py's cached scorer accessor,
        # which in turn calls malintent.ml_classifier.get_classifier() — the
        # Week 5 singleton.  This is the ONLY place in the request lifecycle
        # where the model should ever be loaded from disk.
        scan.warm_up()
        warmup_ms = (time.perf_counter() - warmup_start) * 1000
        logger.info("Detection pipeline warm and ready (%.0fms).", warmup_ms)
    except Exception:
        # Don't crash the whole server if the ML model isn't available yet
        # (e.g. local dev before the model checkpoint has been downloaded) —
        # routers/scan.py falls back to _StubScorer in that case, and we want
        # the rest of the API (logs, stats, config) to stay usable.
        logger.exception(
            "Pipeline warm-up failed — server is starting anyway. "
            "Scan requests will fall back to the stub scorer until this is fixed."
        )

    logger.info("Server is ready.")
    yield
    # Nothing to clean up in development; connection pool closes automatically.


# ── APP INSTANCE ─────────────────────────────────────────────────────────────
# docs_url and redoc_url are disabled — /docs is served as a custom
# FileResponse from static/docs.html (see route below).

app = FastAPI(
    title="MalIntent API",
    description=(
        "LLM Prompt Injection Firewall — REST API.  "
        "Three-layer detection engine (Pattern + ML + Semantic), "
        "PII-scrubbed logging, Fernet-encrypted configuration, "
        "and a Secure Execution Layer with permission validation, tool "
        "whitelisting, dynamic PII masking, and secret redaction."
    ),
    version="0.5.0",
    lifespan=lifespan,
    docs_url="/swagger",
    redoc_url=None,
)


# ── STATIC FILES + CUSTOM DOCS ────────────────────────────────────────────────
# Serves backend/static/ at /static — required for any assets the docs page
# references.  The /docs route returns the custom HTML page directly.

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/docs", include_in_schema=False)
async def custom_docs():
    """
    Custom branded API documentation page.
    Replaces FastAPI's default Swagger UI with a dark-themed, font-rich
    page served from static/docs.html.
    """
    return FileResponse("static/docs.html")


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
    return {"service": "MalIntent API", "version": "0.5.0", "status": "operational"}


@app.get("/health", tags=["health"])
async def health():
    """
    Explicit health endpoint — useful for Docker health checks and uptime monitors.

    Week 5: also reports whether the ML classifier singleton is warm, so a
    monitoring dashboard (or Shravya, mid-debugging) can distinguish "server up
    but model still cold/stub" from "fully warm and ready for live traffic."
    """
    from malintent.ml_classifier import is_classifier_loaded

    return {
        "status": "ok",
        "ml_classifier_warm": is_classifier_loaded(),
    }