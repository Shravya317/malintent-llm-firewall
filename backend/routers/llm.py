"""
routers/llm.py — Raw LLM proxy endpoint for Comparison Mode.

This endpoint provides a direct, unprotected path to an external LLM (Google Gemini)
so the frontend Comparison Mode can show what happens when a prompt
bypasses the MalIntent firewall entirely.

Architecture note
-----------------
The Gemini API key lives ONLY on the backend (via GEMINI_API_KEY env var).
The frontend never sees the key — it sends the user's prompt here, and this
endpoint proxies the request to Gemini and returns the raw response.

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
import google.generativeai as genai

logger = logging.getLogger("malintent.llm")
router = APIRouter()

# Read the API key from environment
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)


class LLMRequest(BaseModel):
    """Request body for POST /api/v1/llm/raw."""
    prompt: str = Field(..., min_length=1, max_length=10_000)


class LLMResponse(BaseModel):
    """Response body for POST /api/v1/llm/raw."""
    response: str


@router.post("/llm/raw", response_model=LLMResponse, status_code=200)
async def generate_raw_response(req: LLMRequest):
    """
    Proxy a prompt directly to Google Gemini without any firewall filtering.

    Used exclusively by the frontend Comparison Mode to demonstrate the
    difference between a protected (firewall) and unprotected (raw) LLM path.

    Returns the model's response verbatim — no PII scrubbing, no risk scoring,
    no permission checks.
    """
    try:
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set. Please configure it in .env")

        # Initialize the model with a system instruction
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction="You are a helpful AI assistant."
        )
        
        # Generate the response
        response = model.generate_content(
            req.prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=300,
                temperature=0.7,
            )
        )
        
        answer = response.text
        logger.info("LLM raw response generated via Gemini (prompt_len=%d)", len(req.prompt))
        return LLMResponse(response=answer)

    except Exception as e:
        logger.exception("Gemini API call failed")
        raise HTTPException(status_code=500, detail=str(e))
