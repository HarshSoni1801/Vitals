"use client";

import { useDataContext } from "../providers/DataProvider";

const RANGES: { label: string; ms: number }[] = [
  { label: "1 min", ms: 60_000 },
  { label: "5 min", ms: 5 * 60_000 },
  { label: "15 min", ms: 15 * 60_000 },
  { label: "1 hour", ms: 60 * 60_000 },
];

export default function TimeRangeSelector() {
  const { windowMs, setWindowMs } = useDataContext();

  return (
    <div className="flex gap-1 text-xs">
      {RANGES.map((r) => (
        <button
          key={r.label}
          type="button"
          onClick={() => setWindowMs(r.ms)}
          className={`rounded-sm border px-2.5 py-1 font-mono transition-colors ${
            windowMs === r.ms
              ? "border-amber/50 bg-amber/10 text-amber"
              : "border-hairline text-text-dim hover:text-text"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
