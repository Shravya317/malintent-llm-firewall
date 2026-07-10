/**
 * types.ts — TypeScript interface definitions for the MalIntent API contract.
 *
 * Designed for the Sunday Sync (Jul 6) integration checkpoint.
 * These interfaces mirror Tushar's Pydantic schemas in backend/schemas.py exactly.
 */

// ── SCAN / INPUT ──────────────────────────────────────────────────────────────

export interface LayerCMatch {
  /** One semantically similar attack phrase returned by the FAISS layer */
  phrase: string;
  category: string;
  similarity: number;
}

export interface ScanInputResponse {
  /** Response body for POST /api/v1/scan/input */
  decision: string; // ALLOW / FLAG / BLOCK
  risk_score: number; // 0.0 – 100.0
  attack_category: string | null; // primary attack type, or null if safe
  layers_triggered: string[]; // e.g. ["A", "B"] or ["A", "B", "C"]
  layer_a_matched: boolean;
  layer_b_confidence: number; // 0.0 – 1.0
  layer_c_top_matches: LayerCMatch[]; // top 3 semantically similar phrases
  latency_ms: number; // total detection time in milliseconds
  log_id: number; // ThreatLog row ID for frontend to reference
  scrubbed_prompt?: string;
}

// ── LOGS ──────────────────────────────────────────────────────────────────────

export interface ThreatLogEntry {
  /**
   * Single row from ThreatLog serialized for the frontend (GET /api/v1/logs).
   * Note: scrubbed_text is excluded — it is for forensic use only, never sent to
   * the frontend in the standard logs list.
   */
  id: number;
  timestamp: string; // ISO-8601 datetime string
  payload_hash: string;
  payload_length: number;
  risk_score: number;
  decision: string;
  attack_category: string | null;
  layers_triggered: string | null; // comma-separated, e.g. "A,B"
  layer_a_matched: boolean;
  layer_b_confidence: number;
  session_role: string | null;
  latency_ms: number | null;
  privacy_mode: string;
}

// ── STATS ─────────────────────────────────────────────────────────────────────

export interface HourlyBucket {
  /** One hourly data point for the trend sparkline on the dashboard */
  hour: string; // ISO-8601 hour string, e.g. "2026-06-29T14:00:00"
  total: number;
  blocked: number;
}

export interface StatsResponse {
  /** Response body for GET /api/v1/stats */
  total_requests: number;
  total_blocked: number;
  total_flagged: number;
  total_allowed: number;
  avg_risk_score: number;
  avg_latency_ms: number;
  hourly_trend: HourlyBucket[];
}

// ── CONFIG ────────────────────────────────────────────────────────────────────

export interface ConfigSetRequest {
  key: string;
  value: string; // plaintext — config_encryption.encrypt() is applied before storage
}

export interface ConfigSetResponse {
  status: string;
  key: string;
}

export interface ConfigGetResponse {
  key: string;
  value: string; // decrypted plaintext — ciphertext is never returned to callers
}
