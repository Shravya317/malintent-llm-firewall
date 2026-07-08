/**
 * frontend/src/components/MetricBlob.jsx — Fluid, animated background blob indicating system risk state.
 */

import { useEffect, useState } from "react";

const accentMap = {
  threat: "var(--accent-threat)",
  secure: "var(--accent-secure)",
  warn: "var(--accent-warn)",
  neutral: "var(--text-secondary)",
};

/**
 * MetricBlob
 *
 * Animated fluid background blob that shifts color (green/yellow/red) based on the aggregate risk state of the firewall.
 *
 * @returns {JSX.Element} The rendered MetricBlob component.
 */
export default function MetricBlob({
  title,
  value,
  subtitle,
  accent = "neutral",
  delay = 0,
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay * 120);
    return () => clearTimeout(t);
  }, [delay]);

  const color = accentMap[accent] || accentMap.neutral;

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div
        style={{
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          cursor: "default",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.transform = "translateY(-4px)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.transform = "translateY(0)")
        }
      >
        {/* Label */}
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.65rem",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-faint)",
            margin: "0 0 8px",
          }}
        >
          {title}
        </p>

        {/* Massive number — THE structural element */}
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.8rem, 5vw, 4.5rem)",
            fontWeight: 700,
            lineHeight: 0.9,
            letterSpacing: "-0.04em",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {value}
        </p>

        {/* Accent line + subtitle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
          }}
        >
          <div
            style={{
              width: 16,
              height: 2,
              background: color,
              borderRadius: 1,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--text-muted)",
            }}
          >
            {subtitle}
          </span>
        </div>
      </div>
    </div>
  );
}
