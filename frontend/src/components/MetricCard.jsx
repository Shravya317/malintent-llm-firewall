/**
 * frontend/src/components/MetricCard.jsx — Reusable UI card for displaying individual KPI metrics.
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const trendConfig = {
  up: { icon: TrendingUp, color: "text-secure-400", bg: "bg-secure-500/10" },
  down: {
    icon: TrendingDown,
    color: "text-threat-400",
    bg: "bg-threat-500/10",
  },
  neutral: { icon: Minus, color: "text-slate-400", bg: "bg-white/5" },
};

const glowConfig = {
  red: "glow-red",
  teal: "glow-teal",
  amber: "glow-amber",
  blue: "glow-blue",
};

/**
 * MetricCard
 *
 * Reusable UI component for displaying numerical KPIs (like total requests, blocked prompts) alongside trend indicators.
 *
 * @returns {JSX.Element} The rendered MetricCard component.
 */
export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = "neutral",
  trendValue = "",
  accent = "teal",
}) {
  const {
    icon: TrendIcon,
    color: trendColor,
    bg: trendBg,
  } = trendConfig[trend];
  const glowClass = glowConfig[accent] || "";

  const accentColorMap = {
    red: "text-threat-400",
    teal: "text-secure-400",
    amber: "text-warn-400",
    blue: "text-info-400",
  };

  const accentBgMap = {
    red: "bg-threat-500/10",
    teal: "bg-secure-500/10",
    amber: "bg-warn-500/10",
    blue: "bg-info-500/10",
  };

  return (
    <div
      className={`
        glass glass-hover relative overflow-hidden rounded-2xl p-5
        transition-all duration-300 hover:scale-[1.02]
        hover:${glowClass} animate-fade-in-up group
      `}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl ${accentBgMap[accent]}`}
          >
            <Icon className={`w-5 h-5 ${accentColorMap[accent]}`} />
          </div>
          {trendValue && (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendBg} ${trendColor}`}
            >
              <TrendIcon className="w-3 h-3" />
              {trendValue}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-1">
          <p className="text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        {/* Title & subtitle */}
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>

      {/* Bottom accent bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] ${
          accent === "red"
            ? "bg-gradient-to-r from-transparent via-threat-500/40 to-transparent"
            : accent === "teal"
              ? "bg-gradient-to-r from-transparent via-secure-500/40 to-transparent"
              : accent === "amber"
                ? "bg-gradient-to-r from-transparent via-warn-500/40 to-transparent"
                : "bg-gradient-to-r from-transparent via-info-500/40 to-transparent"
        } opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />
    </div>
  );
}
