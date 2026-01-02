"use client";

import { useState } from "react";

interface HorizontalStatBarsProps {
  stats: Record<string, number>;
  maxStats?: Record<string, number>;
  maxValue?: number;
  className?: string;
  statLabels?: Record<string, string>;
  statDescriptions?: Record<string, string>;
}

export function HorizontalStatBars({
  stats,
  maxStats,
  maxValue = 10,
  className = "",
  statLabels = {},
  statDescriptions = {},
}: HorizontalStatBarsProps) {
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  const statKeys = Object.keys(stats);

  return (
    <div className={`relative ${className}`}>
      <div className="space-y-2">
        {statKeys.map((key) => {
          const currentValue = stats[key];
          const maxStatValue = maxStats?.[key];
          const label = statLabels[key] || key.toUpperCase();
          const description = statDescriptions[key];
          const isHovered = hoveredStat === key;

          // Calculate percentages for bar widths
          const currentPercent = (currentValue / maxValue) * 100;
          const maxPercent = maxStatValue ? (maxStatValue / maxValue) * 100 : 0;

          return (
            <div
              key={key}
              className="relative"
              onMouseEnter={() => setHoveredStat(key)}
              onMouseLeave={() => setHoveredStat(null)}
            >
              {/* Stat row */}
              <div className="flex gap-1">
                {/* Stat label */}
                <div className="w-12 text-sm font-bold th-label text-right">
                  {label}
                </div>

                {/* Bar container */}
                <div className="flex-1 relative h-6 bg-[var(--bg-secondary)] rounded overflow-hidden border border-[var(--outline)]">
                  {/* Genetic max background (lighter color) */}
                  {maxStatValue !== undefined &&
                    maxPercent > currentPercent && (
                      <div
                        className="absolute inset-y-0 left-0 bg-blue-400/30 transition-all"
                        style={{ width: `${maxPercent}%` }}
                      />
                    )}

                  {/* Current value bar */}
                  <div
                    className={`absolute inset-y-0 left-0 bg-green-500 transition-all ${
                      isHovered ? "bg-green-400" : ""
                    }`}
                    style={{ width: `${currentPercent}%` }}
                  />
                </div>

                {/* Value text to the right */}
                <div className="text-base font-bold th-label min-w-[1rem] text-left">
                  {currentValue}
                  {maxStatValue !== undefined && ` / ${maxStatValue}`}
                </div>
              </div>

              {/* Hover tooltip */}
              {isHovered && description && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-gray-900/95 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-700 text-xs">
                  <div className="font-bold text-green-400 mb-1">{label}</div>
                  <div className="text-gray-300">{description}</div>
                  <div className="mt-1 text-gray-400">
                    Current: {currentValue}
                    {maxStatValue !== undefined && ` • Max: ${maxStatValue}`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {maxStats && (
        <div className="flex gap-3 justify-center text-xs font-semibold mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-green-400">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-400/30 rounded"></div>
            <span className="text-blue-300">Max</span>
          </div>
        </div>
      )}
    </div>
  );
}
