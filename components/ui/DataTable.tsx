"use client";

import { useMemo, useState } from "react";
import { useDataContext } from "../providers/DataProvider";
import { useVirtualization } from "@/hooks/useVirtualization";
import { getOrderedView } from "@/lib/dataGenerator";
import { METRIC_CATEGORIES, METRIC_COLORS, MetricCategory } from "@/lib/types";

const ROW_HEIGHT = 26;
const VIEWPORT_HEIGHT = 260;

export default function DataTable() {
  const { buffers, version } = useDataContext();
  const [category, setCategory] = useState<MetricCategory>("cpu");

  const { timestamps, values, count } = useMemo(() => {
    const view = getOrderedView(buffers[category]);
    return { timestamps: view.timestamps, values: view.values, count: view.timestamps.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, category]);

  const { startIndex, endIndex, totalHeight, onScroll } = useVirtualization({
    itemCount: count,
    itemHeight: ROW_HEIGHT,
    viewportHeight: VIEWPORT_HEIGHT,
  });

  const visibleRows = [];
  for (let i = startIndex; i < endIndex; i++) {
    const dataIdx = count - 1 - i; // newest first
    if (dataIdx < 0) continue;
    visibleRows.push({ row: i, ts: timestamps[dataIdx], value: values[dataIdx] });
  }

  return (
    <div className="border-t border-hairline">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <h2 className="font-sans text-sm font-medium text-text">
          Raw ticks <span className="font-mono text-xs font-normal text-text-dim">({count.toLocaleString("en-US")})</span>
        </h2>
        <div className="flex gap-1">
          {METRIC_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className="rounded-sm border px-2.5 py-1 font-mono text-xs capitalize transition-colors"
              style={{
                borderColor: category === c ? METRIC_COLORS[c] : "#262B33",
                color: category === c ? METRIC_COLORS[c] : "#8B909A",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 border-y border-hairline bg-panel px-4 py-2 font-mono text-xs text-text-dim">
        <span>Time</span>
        <span className="text-right">Value</span>
      </div>

      <div className="overflow-y-auto" style={{ height: VIEWPORT_HEIGHT }} onScroll={onScroll}>
        <div style={{ height: totalHeight, position: "relative" }}>
          {visibleRows.map(({ row, ts, value }) => (
            <div
              key={row}
              className="absolute left-0 right-0 grid grid-cols-2 items-center px-4 font-mono text-xs"
              style={{ top: row * ROW_HEIGHT, height: ROW_HEIGHT }}
            >
              <span className="text-text-dim">{new Date(ts).toLocaleTimeString()}</span>
              <span className="text-right text-text">{value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
