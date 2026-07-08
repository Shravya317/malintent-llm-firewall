/**
 * frontend/src/components/ThreatFeed.jsx — Real-time feed of recent firewall detections and blocks.
 */

import { useState, useEffect } from "react";
import { getLogs } from "../api/client";

const severityColor = {
  critical: "var(--accent-threat)",
  high: "#F97316",
  medium: "var(--accent-warn)",
  low: "var(--text-faint)",
};

const statusLabel = {
  blocked: { text: "Blocked", color: "var(--accent-threat)" },
  flagged: { text: "Flagged", color: "var(--accent-warn)" },
  block: { text: "Blocked", color: "var(--accent-threat)" },
  flag: { text: "Flagged", color: "var(--accent-warn)" },
  monitored: { text: "Monitored", color: "var(--text-muted)" },
};

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Pattern prefix → full display name
const PATTERN_PREFIXES = {
  DI: "Direct Injection",
  PO: "Persona Override",
  DE: "Data Exfiltration",
  EO: "Encoding Obfuscation",
  II: "Indirect Injection",
  CM: "Context Manipulation",
  PE: "Privilege Escalation",
  HE: "Harmful Elicitation",
};

function parsePatternId(id) {
  if (!id) return "Suspicious Query";
  const prefix = id.substring(0, 2);
  return PATTERN_PREFIXES[prefix] || id.replace(/_/g, " ");
}

/**
 * ThreatFeed
 *
 * Real-time scrolling feed displaying the most recent firewall blocks and flags as they happen.
 *
 * @returns {JSX.Element} The rendered ThreatFeed component.
 */
export default function ThreatFeed() {
  const [threats, setThreats] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      try {
        const rawLogs = await getLogs();
        if (isMounted) {
          const mapped = rawLogs.map((log) => ({
            id: `THR-${String(log.id).padStart(4, "0")}`,
            timestamp: log.timestamp,
            severity:
              log.risk_score >= 70
                ? "critical"
                : log.risk_score >= 50
                  ? "high"
                  : log.risk_score >= 25
                    ? "medium"
                    : "low",
            type: parsePatternId(log.attack_category),
            source: log.source_ip || "N/A",
            model: log.target_model || "Unknown",
            payload:
              log.prompt_full || log.payload_hash || "No payload available",
            status:
              log.decision === "ALLOW"
                ? "monitored"
                : log.decision.toLowerCase(),
          }));
          // Assuming backend returns them in descending order; if not, sort here.
          setThreats(mapped);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to fetch logs");
          setLoading(false);
        }
      }
    };

    fetchLogs();
    const intervalId = setInterval(fetchLogs, 3000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const filtered =
    filter === "all" ? threats : threats.filter((t) => t.severity === filter);
  const filters = ["all", "critical", "high", "medium"];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.2rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Threat Feed
          </h2>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.6rem",
              color: "var(--text-faint)",
            }}
          >
            {threats.length} events
          </span>
        </div>

        {/* Filters — pure text toggles, no background boxes */}
        <div style={{ display: "flex", gap: 16 }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: 0,
                border: "none",
                background: "none",
                color:
                  filter === f ? "var(--text-primary)" : "var(--text-faint)",
                fontSize: "0.65rem",
                fontWeight: filter === f ? 600 : 400,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                transition: "color 0.15s ease",
                borderBottom:
                  filter === f
                    ? "1px solid var(--text-primary)"
                    : "1px solid transparent",
                paddingBottom: 2,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "56px 72px 1fr 140px 2fr 80px 72px",
          padding: "0 0 8px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {["Sev", "ID", "Type", "Source", "Payload", "Status", "Time"].map(
          (h) => (
            <span
              key={h}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.52rem",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text-faint)",
              }}
            >
              {h}
            </span>
          ),
        )}
      </div>

      {/* Rows — no backgrounds, pure typographic structure */}
      <div>
        {loading && threats.length === 0 ? (
          [...Array(5)].map((_, i) => (
            <div
              key={`skel-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "56px 72px 1fr 140px 2fr 80px 72px",
                padding: "10px 0",
                borderBottom: "1px solid var(--border-faint)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--border-subtle)",
                  display: "inline-block",
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
              <div
                style={{
                  height: 10,
                  width: 40,
                  background: "var(--border-subtle)",
                  borderRadius: 2,
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
              <div
                style={{
                  height: 10,
                  width: "60%",
                  background: "var(--border-subtle)",
                  borderRadius: 2,
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
              <div
                style={{
                  height: 10,
                  width: "40%",
                  background: "var(--border-subtle)",
                  borderRadius: 2,
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
              <div
                style={{
                  height: 10,
                  width: "80%",
                  background: "var(--border-subtle)",
                  borderRadius: 2,
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
              <div
                style={{
                  height: 10,
                  width: 40,
                  background: "var(--border-subtle)",
                  borderRadius: 2,
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
              <div
                style={{
                  height: 10,
                  width: 40,
                  background: "var(--border-subtle)",
                  borderRadius: 2,
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
            </div>
          ))
        ) : error && threats.length === 0 ? (
          <div
            style={{
              padding: "32px 0",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "var(--accent-threat)",
            }}
          >
            Error: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: "32px 0",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              color: "var(--text-faint)",
            }}
          >
            No events match current filter.
          </div>
        ) : null}
        {filtered.map((threat) => {
          const sevColor = severityColor[threat.severity];
          const stat = statusLabel[threat.status];

          return (
            <div
              key={threat.id + threat.timestamp}
              style={{
                display: "grid",
                gridTemplateColumns: "56px 72px 1fr 140px 2fr 80px 72px",
                padding: "10px 0",
                borderBottom: "1px solid var(--border-faint)",
                alignItems: "center",
                transition: "opacity 0.15s ease",
              }}
            >
              {/* Severity dot */}
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: sevColor,
                  display: "inline-block",
                }}
              />

              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.65rem",
                  color: "var(--text-faint)",
                }}
              >
                {threat.id}
              </span>

              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {threat.type}
              </span>

              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.65rem",
                  color: "var(--text-faint)",
                }}
              >
                {threat.source}
              </span>

              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  paddingRight: 16,
                }}
              >
                {threat.payload}
              </span>

              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.55rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: stat.color,
                }}
              >
                {stat.text}
              </span>

              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.6rem",
                  color: "var(--text-faint)",
                }}
              >
                {formatTime(threat.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
