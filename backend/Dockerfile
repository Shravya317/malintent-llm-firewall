# =============================================================================
# backend/Dockerfile
# =============================================================================
# Multi-stage build for the MalIntent FastAPI backend.
#
# This version is designed for Google Cloud Run.
#
# Key design decisions
# --------------------
# ✓ No HuggingFace download during build.
# ✓ Uses the locally stored PromptGuard model.
# ✓ Faster and deterministic builds.
# ✓ Smaller final image.
# ✓ Compatible with Cloud Run.
# =============================================================================



# =============================================================================
# Stage 1 — Builder
# =============================================================================

FROM python:3.11-slim AS builder

WORKDIR /app

# Install Python dependencies into a separate directory
COPY requirements.txt .

RUN pip install --upgrade pip \
 && pip install --no-cache-dir \
    --target=/install \
    -r requirements.txt

# Make installed packages importable during build
ENV PYTHONPATH=/install

# Copy the locally trained PromptGuard model
#
# This folder already exists:
#
# backend/
# └── malintent_model_local/
#
# It contains:
#   config.json
#   model.safetensors
#   tokenizer.json
#   tokenizer_config.json
#   special_tokens_map.json
#   training_args.bin
#
COPY malintent_model_local /model-cache

COPY sentence_transformer_local /app/sentence_transformer_local


# =============================================================================
# Stage 2 — Runtime
# =============================================================================

FROM python:3.11-slim

WORKDIR /app

# Runtime packages
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        curl \
        libpq-dev \
 && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages
COPY --from=builder /install /usr/local/lib/python3.11/site-packages

# Copy PromptGuard model
COPY --from=builder /model-cache /model-cache

# Copy application source
COPY . .



# =============================================================================
# Runtime Environment
# =============================================================================

ENV PORT=8000

ENV TOKENIZERS_PARALLELISM=false

ENV TRANSFORMERS_OFFLINE=1

ENV TRANSFORMERS_CACHE=/model-cache

ENV HF_HOME=/model-cache

ENV PYTHONUNBUFFERED=1



# =============================================================================
# Health Check
# =============================================================================

HEALTHCHECK \
    --interval=30s \
    --timeout=10s \
    --start-period=60s \
    --retries=3 \
CMD curl -f http://localhost:${PORT}/health || exit 1



# =============================================================================
# Expose
# =============================================================================

EXPOSE 8000



# =============================================================================
# Start FastAPI
# =============================================================================

CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT}"]