# =============================================================================
# backend/Dockerfile
# =============================================================================
# Multi-stage build for MalIntent FastAPI backend.
#
# Stage 1 (builder):  install Python deps + download PromptGuard-86M weights.
# Stage 2 (runtime):  copy only what's needed — lean final image.
#
# Key design choices
# ------------------
# * PromptGuard-86M weights are baked in at build time (not downloaded at
#   container startup).  This makes Render's cold start fast (~5s vs ~60s).
# * psycopg2-binary is used — no libpq compilation needed at runtime.
# * NO sqlcipher3 / libsqlcipher — the entire SQLite/SQLCipher stack is gone.
# * The HuggingFace model download in the builder stage requires HUGGINGFACE_TOKEN
#   if the model is behind a gated access wall (Meta's PromptGuard-86M requires
#   accepting the licence on HuggingFace).  Pass it as a build arg — never embed
#   it in the image.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: builder
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /app

# Install pip dependencies into a separate prefix so we can copy them cleanly.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir --target=/install -r requirements.txt

# Make the packages just installed into /install importable by THIS
# builder-stage Python interpreter too (pip --target does not add /install
# to the default search path, which is why `python -c "import transformers"`
# below was failing with ModuleNotFoundError even though pip succeeded).
ENV PYTHONPATH=/install

# ---------------------------------------------------------------------------
# Download PromptGuard-86M weights at build time.
# The HUGGINGFACE_TOKEN build arg is injected by your CI/CD or local build
# command — it is NOT baked into the image layer.
#
# Build command example:
#   docker build \
#     --build-arg HUGGINGFACE_TOKEN=$(cat ~/.hf_token) \
#     -t malintent-backend ./backend
# ---------------------------------------------------------------------------
ARG HUGGINGFACE_TOKEN=""
ENV HUGGING_FACE_HUB_TOKEN=${HUGGINGFACE_TOKEN}

RUN python -c "\
from transformers import AutoTokenizer, AutoModelForSequenceClassification; \
AutoTokenizer.from_pretrained('meta-llama/Prompt-Guard-86M', cache_dir='/model-cache'); \
AutoModelForSequenceClassification.from_pretrained('meta-llama/Prompt-Guard-86M', cache_dir='/model-cache')"

# ---------------------------------------------------------------------------
# Stage 2: runtime
# ---------------------------------------------------------------------------
FROM python:3.11-slim

WORKDIR /app

# Only libpq-dev is needed at runtime for psycopg2-binary.
# No libsqlcipher, no libsqlite3 (beyond the stdlib SQLite which we never use).
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq-dev curl \
 && rm -rf /var/lib/apt/lists/*

# Copy installed packages from the builder stage.
COPY --from=builder /install /usr/local/lib/python3.11/site-packages

# Copy baked-in model weights.
COPY --from=builder /model-cache /model-cache

# Copy the application source.
COPY . .

# ---------------------------------------------------------------------------
# Runtime environment
# ---------------------------------------------------------------------------
# Tell HuggingFace Transformers where to find the pre-downloaded weights.
ENV TRANSFORMERS_CACHE=/model-cache
# Prevent Transformers from phoning home for updates.
ENV TRANSFORMERS_OFFLINE=1
# Disable tokenizers parallelism warning inside a subprocess context.
ENV TOKENIZERS_PARALLELISM=false
# Uvicorn will use PORT if set (Render injects this automatically).
ENV PORT=8000

# ---------------------------------------------------------------------------
# Health check — Render uses this to determine when the service is healthy.
# ---------------------------------------------------------------------------
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE ${PORT}

# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
# NOTE: main.py lives directly in backend/ (repo root of this build context),
# NOT inside an app/ subfolder. The original "app.main:app" would fail with
# ModuleNotFoundError: No module named 'app' immediately after container start.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]