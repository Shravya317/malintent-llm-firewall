"""
backend/scripts/seed_demo_events.py
=====================================
Week 7 — Day 6.

Seeds the Supabase production database (or any configured DATABASE_URL) with
200 realistic simulated threat events so that Shravya's dashboard charts look
populated from the first demo run.

Design
------
• Idempotent: counts existing seed rows first; only inserts the delta needed
  to reach 200.  Safe to re-run accidentally.
• Realistic distribution: ~70% ALLOW, ~17% FLAG, ~13% BLOCK — matches what
  you'd expect in a real deployment with mostly legitimate traffic and a
  meaningful number of detected threats.
• Time-distributed: events are spread across the last 7 days (168 hours) so
  the Live Threat Feed shows activity across the chart's time axis, not a
  single burst at seeding time.
• All 7 OWASP LLM Top-10 attack categories represented proportionally.
• Includes plausible layer scores, latency values, and user role distribution.

Usage
-----
# Against the LOCAL docker-compose database:
python backend/scripts/seed_demo_events.py

# Against SUPABASE PRODUCTION — set DATABASE_URL first:
DATABASE_URL="$SUPABASE_DATABASE_URL" \
PG_CRYPTO_KEY="$PROD_PG_CRYPTO_KEY" \
python backend/scripts/seed_demo_events.py

# Specify a target count (default 200):
python backend/scripts/seed_demo_events.py --count 200

# Dry-run (print what would be inserted without writing):
python backend/scripts/seed_demo_events.py --dry-run

Verification
------------
psql $DATABASE_URL -c "
SELECT decision, COUNT(*) as n
FROM   threat_logs
GROUP BY decision
ORDER BY n DESC;
"
# Expected: ~140 ALLOW, ~35 FLAG, ~25 BLOCK (plus any real traffic)
"""

from __future__ import annotations

import argparse
import hashlib
import logging
import os
import random
from datetime import datetime, timedelta

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Realistic data distributions
# ---------------------------------------------------------------------------

ATTACK_CATEGORIES = [
    "direct_injection",
    "indirect_injection",
    "jailbreak_persona",
    "data_exfiltration",
    "rag_poisoning",
    "prompt_leaking",
    "role_confusion",
]

# Weighted to produce ~140 ALLOW, ~35 FLAG, ~25 BLOCK out of 200
DECISIONS_WEIGHTED = (
    ["ALLOW"] * 140
    + ["FLAG"] * 35
    + ["BLOCK"] * 25
)

USER_ROLES = ["Customer"] * 60 + ["Employee"] * 30 + ["Admin"] * 10

# Realistic prompt lengths in characters
PROMPT_LENGTH_RANGES = {
    "ALLOW": (8, 180),
    "FLAG":  (25, 350),
    "BLOCK": (40, 500),
}

# Latency ranges per decision (ms) — malicious prompts take longer due to
# deeper analysis by layers B and C.
LATENCY_RANGES = {
    "ALLOW": (48, 72),
    "FLAG":  (65, 90),
    "BLOCK": (70, 100),
}

# Plausible layer score ranges per decision
LAYER_SCORES = {
    "ALLOW": {
        "a": (0.00, 0.15),
        "b": (0.00, 0.20),
        "c": (0.00, 0.18),
    },
    "FLAG": {
        "a": (0.20, 0.60),
        "b": (0.25, 0.65),
        "c": (0.15, 0.55),
    },
    "BLOCK": {
        "a": (0.60, 1.00),
        "b": (0.70, 1.00),
        "c": (0.55, 0.99),
    },
}


def _rand_float(lo: float, hi: float, decimals: int = 4) -> float:
    return round(random.uniform(lo, hi), decimals)


def _make_payload_hash(seed_index: int) -> str:
    """
    Generate a unique, deterministic-looking SHA-256-format hash for a seed
    event.  Prefixed with 'seed-' so the idempotent guard can find them.
    Uses a random suffix so the hash is unique even if the script is called
    multiple times with the same index range.
    """
    raw = f"seed-{seed_index}-{random.random()}-{os.urandom(8).hex()}"
    return "seed-" + hashlib.sha256(raw.encode()).hexdigest()[:59]  # 64 chars total


def _build_triggered_layers(decision: str) -> list:
    if decision == "ALLOW":
        return []
    elif decision == "FLAG":
        # FLAG prompts are often caught by one or two layers
        return random.sample(["A", "B", "C"], k=random.randint(1, 2))
    else:
        # BLOCK prompts usually trigger multiple layers
        return random.sample(["A", "B", "C"], k=random.randint(2, 3))


def _build_event(index: int, decision: str, now: datetime) -> dict:
    scores = LAYER_SCORES[decision]
    la = _rand_float(*scores["a"])
    lb = _rand_float(*scores["b"])
    lc = _rand_float(*scores["c"])

    # Composite score mirrors risk_scorer.py weighting (A=0.25, B=0.55, C=0.20)
    composite = la * 0.25 + lb * 0.55 + lc * 0.20
    risk_score = int(composite * 100)

    # Clamp to expected ranges
    if decision == "ALLOW" and risk_score >= 30:
        risk_score = random.randint(0, 29)
    elif decision == "FLAG" and not (30 <= risk_score <= 70):
        risk_score = random.randint(30, 70)
    elif decision == "BLOCK" and risk_score <= 70:
        risk_score = random.randint(71, 100)

    category = (
        random.choice(ATTACK_CATEGORIES) if decision != "ALLOW" else None
    )
    length_lo, length_hi = PROMPT_LENGTH_RANGES[decision]
    lat_lo, lat_hi = LATENCY_RANGES[decision]

    return {
        "timestamp":        now - timedelta(hours=random.uniform(0, 168)),
        "payload_hash":     _make_payload_hash(index),
        "risk_score":       risk_score,
        "decision":         decision,
        "attack_category":  category,
        "triggered_layers": _build_triggered_layers(decision),
        "layer_a_score":    la,
        "layer_b_score":    lb,
        "layer_c_score":    lc,
        "user_role":        random.choice(USER_ROLES),
        "payload_length":   random.randint(length_lo, length_hi),
        "prompt_summary":   None,  # Tokenized Logging mode: no summary stored
        "latency_ms":       random.randint(lat_lo, lat_hi),
    }


# ---------------------------------------------------------------------------
# Main seeding logic
# ---------------------------------------------------------------------------

def seed_events(target_count: int = 200, dry_run: bool = False) -> int:
    """
    Seed the database with up to `target_count` threat events.

    Returns the number of events inserted.
    """
    from database import SessionLocal
    from models import ThreatLog

    session = SessionLocal()
    try:
        existing_count = (
            session.query(ThreatLog)
            .filter(ThreatLog.payload_hash.like("seed-%"))
            .count()
        )
        logger.info("Existing seed events: %d / %d target", existing_count, target_count)

        if existing_count >= target_count:
            logger.info(
                "Seed data already present (%d events). Nothing to insert.",
                existing_count,
            )
            return 0

        to_insert = target_count - existing_count
        logger.info("Inserting %d new seed events...", to_insert)

        now = datetime.utcnow()
        # Shuffle the decision pool so the time-ordered events have a realistic
        # random mix rather than all ALLOWs first.
        decision_pool = DECISIONS_WEIGHTED * ((to_insert // len(DECISIONS_WEIGHTED)) + 1)
        random.shuffle(decision_pool)

        inserted = 0
        for i in range(to_insert):
            decision = decision_pool[i]
            event_data = _build_event(existing_count + i, decision, now)

            if dry_run:
                logger.debug("DRY RUN — would insert: %s", event_data)
            else:
                event = ThreatLog(**event_data)
                session.add(event)

            inserted += 1

            # Batch commits every 50 rows to avoid large transaction timeouts
            # on Supabase's free connection pooler.
            if not dry_run and inserted % 50 == 0:
                session.commit()
                logger.info("  Committed batch — %d / %d inserted", inserted, to_insert)

        if not dry_run:
            session.commit()

        action = "Would insert" if dry_run else "Inserted"
        logger.info("%s %d seed events successfully.", action, inserted)
        return inserted

    except Exception:
        session.rollback()
        logger.exception("Seeding failed — transaction rolled back.")
        raise
    finally:
        session.close()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Seed the MalIntent database with realistic simulated threat events "
            "for dashboard demonstration. Idempotent — safe to re-run."
        )
    )
    parser.add_argument(
        "--count",
        type=int,
        default=200,
        help="Target total number of seed events in the database (default: 200).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be inserted without writing to the database.",
    )
    args = parser.parse_args()

    logger.info("=== MalIntent Demo Seed Script ===")
    logger.info(
        "Target: %d events | Dry-run: %s | DATABASE_URL: %s",
        args.count,
        args.dry_run,
        os.environ.get("DATABASE_URL", "(not set — check .env)")[:40] + "...",
    )

    inserted = seed_events(target_count=args.count, dry_run=args.dry_run)

    if not args.dry_run:
        logger.info(
            "Done. Run this to verify:\n"
            "  psql $DATABASE_URL -c "
            "\"SELECT decision, COUNT(*) FROM threat_logs GROUP BY decision;\""
        )


if __name__ == "__main__":
    main()