"use client";

import { useDataContext } from "../providers/DataProvider";
import { AggregationPeriod, METRIC_CATEGORIES, METRIC_COLORS } from "@/lib/types";

const PERIODS: { value: AggregationPeriod; label: string }[] = [
  { value: "raw", label: "Raw" },
  { value: "1min", label: "1 min" },
  { value: "5min", label: "5 min" },
  { value: "1hour", label: "1 hour" },
];

export default function FilterPanel() {
  const { visibleCategories, toggleCategory, aggregationPeriod, setAggregationPeriod } = useDataContext();

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <div className="flex gap-1.5">
        {METRIC_CATEGORIES.map((category) => {
          const active = visibleCategories[category];
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className="flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono capitalize transition-colors"
              style={{
                borderColor: active ? METRIC_COLORS[category] : "#262B33",
                color: active ? METRIC_COLORS[category] : "#8B909A",
                backgroundColor: active ? `${METRIC_COLORS[category]}1A` : "transparent",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: active ? METRIC_COLORS[category] : "#8B909A" }}
              />
              {category}
            </button>
          );
        })}
      </div>

      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setAggregationPeriod(p.value)}
            className={`rounded-sm border px-2.5 py-1 font-mono transition-colors ${
              aggregationPeriod === p.value
                ? "border-amber/50 bg-amber/10 text-amber"
                : "border-hairline text-text-dim hover:text-text"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
