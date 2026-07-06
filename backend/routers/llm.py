"""
routers/llm.py — Raw LLM proxy endpoint for Comparison Mode.

This endpoint provides a direct, unprotected path to an external LLM (Groq)
so the frontend Comparison Mode can show what happens when a prompt
bypasses the MalIntent firewall entirely.

Architecture note
-----------------
The Groq API key lives ONLY on the backend (via GROQ_API_KEY env var).
The frontend never sees the key — it sends the user's prompt here, and this
endpoint proxies the request to Groq and returns the raw response.

This endpoint intentionally does NOT run through any of the firewall pipeline
(no PermissionValidator, no RiskScorer, no PII scrubbing).  That is the whole
point: the Comparison Mode left panel shows the firewall's analysis, and the
right panel shows this unfiltered response.
"""

from __future__ import annotations

import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from groq import Groq

logger = logging.getLogger("malintent.llm")
router = APIRouter()

# Read the API key from environment
api_key = os.environ.get("GROQ_API_KEY")
if api_key:
    client = Groq(api_key=api_key)


class LLMRequest(BaseModel):
    """Request body for POST /api/v1/llm/raw."""
    prompt: str = Field(..., min_length=1, max_length=10_000)


class LLMResponse(BaseModel):
    """Response body for POST /api/v1/llm/raw."""
    response: str


@router.post("/llm/raw", response_model=LLMResponse, status_code=200)
async def generate_raw_response(req: LLMRequest):
    """
    Proxy a prompt directly to Groq without any firewall filtering.

    Used exclusively by the frontend Comparison Mode to demonstrate the
    difference between a protected (firewall) and unprotected (raw) LLM path.

    Returns the model's response verbatim — no PII scrubbing, no risk scoring,
    no permission checks.
    """
    try:
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set. Please configure it in .env")

        # Generate the response
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful AI assistant."
                },
                {
                    "role": "user",
                    "content": req.prompt
                }
            ],
            model="llama3-8b-8192",
            temperature=0.7,
            max_tokens=300,
        )
        
        answer = response.choices[0].message.content
        logger.info("LLM raw response generated via Groq (prompt_len=%d)", len(req.prompt))
        return LLMResponse(response=answer)

    except Exception as e:
        logger.exception("Groq API call failed")
        raise HTTPException(status_code=500, detail=str(e))
