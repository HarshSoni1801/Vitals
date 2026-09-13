"use client";

import { useEffect, useMemo } from "react";
import { useDataContext } from "../providers/DataProvider";
import { useChartRenderer } from "@/hooks/useChartRenderer";
import { getOrderedView, aggregateByPeriod } from "@/lib/dataGenerator";
import { extent, lowerBound } from "@/lib/canvasUtils";
import { MetricCategory, METRIC_CATEGORIES } from "@/lib/types";

const BUCKET_COUNT = 36;

export default function Heatmap() {
  const { buffers, version, visibleCategories, windowMs } = useDataContext();
  const { canvasRef, containerRef, size, renderFrame } = useChartRenderer("heatmap");

  const grid = useMemo(() => {
    const now = Date.now();
    const rangeStart = now - windowMs;
    const bucketMs = Math.max(1, Math.floor(windowMs / BUCKET_COUNT));

    const categories = METRIC_CATEGORIES.filter((c) => visibleCategories[c]);
    const rows = categories.map((category) => {
      const { timestamps, values } = getOrderedView(buffers[category]);
      const startIdx = lowerBound(timestamps, rangeStart);
      const buckets = aggregateByPeriod(
        timestamps.subarray(startIdx),
        values.subarray(startIdx),
        category,
        bucketMs
      );
      const cellByBucket = new Map(buckets.map((b) => [Math.floor(b.timestamp / bucketMs), b.avg]));
      const cells: number[] = [];
      const firstBucketIdx = Math.floor(rangeStart / bucketMs);
      for (let i = 0; i < BUCKET_COUNT; i++) {
        cells.push(cellByBucket.get(firstBucketIdx + i) ?? NaN);
      }
      const [min, max] = extent(cells.filter((v) => !Number.isNaN(v)));
      return { category, cells, min, max };
    });
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, visibleCategories, windowMs]);

  useEffect(() => {
    renderFrame(
      (ctx, width, height) => {
        if (grid.length === 0) return;
        const labelWidth = 56;
        const rowHeight = height / grid.length;
        const cellWidth = (width - labelWidth) / BUCKET_COUNT;

        grid.forEach((row, r) => {
          for (let c = 0; c < BUCKET_COUNT; c++) {
            const v = row.cells[c];
            const t = Number.isNaN(v) || row.max === row.min ? 0 : (v - row.min) / (row.max - row.min);
            ctx.fillStyle = Number.isNaN(v) ? "#12151B" : `rgba(255, 176, 0, ${0.08 + t * 0.85})`;
            ctx.fillRect(labelWidth + c * cellWidth, r * rowHeight, Math.ceil(cellWidth), rowHeight - 2);
          }
          ctx.fillStyle = "#8B909A";
          ctx.font = "10px ui-monospace, monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(row.category, 0, r * rowHeight + rowHeight / 2);
        });
      },
      size.width,
      size.height
    );
  }, [grid, size, renderFrame]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
