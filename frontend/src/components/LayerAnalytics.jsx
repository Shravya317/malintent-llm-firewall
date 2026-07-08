/**
 * frontend/src/components/LayerAnalytics.jsx — Charts breaking down detections across the 3-layer firewall.
 */

import React from "react";

/**
 * LayerAnalytics
 *
 * Statistical charts component that breaks down the percentage of threats caught by Pattern matching, ML scoring, and Semantic similarity.
 *
 * @returns {JSX.Element} The rendered LayerAnalytics component.
 */
export default function LayerAnalytics() {
  // Mock data representing proportion of threats caught by each layer
  const data = [
    { id: "Layer A", name: "Pattern Engine", value: 35, color: "#ff5f56" },
    { id: "Layer B", name: "ML Classifier", value: 45, color: "#ffbd2e" },
    { id: "Layer C", name: "Semantic Similarity", value: 20, color: "#27c93f" },
  ];

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        padding: 32,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: "0 0 4px",
              fontWeight: 600,
            }}
          >
            Layer Analytics
          </h3>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              color: "var(--text-faint)",
              margin: 0,
            }}
          >
            Threats intercepted by layer
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            height: 24,
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          {data.map((item) => (
            <div
              key={item.id}
              style={{
                width: `${item.value}%`,
                background: item.color,
                transition: "width 1s ease-in-out",
              }}
              title={`${item.name}: ${item.value}%`}
            />
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {data.map((item) => (
            <div
              key={item.id}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: item.color,
                }}
              />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.65rem",
                    color: "var(--text-faint)",
                    textTransform: "uppercase",
                  }}
                >
                  {item.id}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "0.75rem",
                    color: "var(--text-primary)",
                    fontWeight: 500,
                  }}
                >
                  {item.value}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
