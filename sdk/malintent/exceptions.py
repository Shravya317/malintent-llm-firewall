"""
exceptions.py — Exception hierarchy for the MalIntent SDK.

All exceptions inherit from MalIntentError so callers can catch broadly
(`except MalIntentError`) or narrowly (`except BlockedPromptException`).
"""

from __future__ import annotations

from typing import Any, Optional


class MalIntentError(Exception):
    """Base class for every exception raised by this SDK."""


class MalIntentConnectionError(MalIntentError):
    """Raised when the SDK cannot reach the MalIntent API at all
    (DNS failure, timeout, connection refused, etc.) — i.e. the request
    never got a response from the server.
    """


class MalIntentAPIError(MalIntentError):
    """Raised when the API responds, but with a non-2xx status code.

    Attributes
    ----------
    status_code : int
        The HTTP status code returned by the server.
    detail : Any
        The parsed JSON body of the error response, if available
        (FastAPI validation errors, custom detail messages, etc.).
    """

    def __init__(
        self, status_code: int, detail: Any = None, message: Optional[str] = None
    ):
        self.status_code = status_code
        self.detail = detail
        super().__init__(
            message or f"MalIntent API returned HTTP {status_code}: {detail}"
        )


class BlockedPromptException(MalIntentError):
    """Raised by Client.scan_input() ONLY when raise_on_block=True is passed
    and the firewall's decision was "BLOCK".

    This is opt-in — by default scan_input() returns a ScanInputResponse
    regardless of decision, and it is the caller's responsibility to check
    `.decision`. Pass raise_on_block=True if you'd rather branch with
    try/except at the call site.
    """

    def __init__(self, risk_score: float, attack_category: Optional[str], log_id: int):
        self.risk_score = risk_score
        self.attack_category = attack_category
        self.log_id = log_id
        super().__init__(
            f"Prompt blocked by MalIntent firewall — risk_score={risk_score}, "
            f"attack_category={attack_category!r}, log_id={log_id}"
        )
