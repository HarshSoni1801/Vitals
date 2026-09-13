"use client";

import { useEffect, useMemo } from "react";
import { useDataContext } from "../providers/DataProvider";
import { useChartRenderer } from "@/hooks/useChartRenderer";
import { getOrderedView, aggregateByPeriod } from "@/lib/dataGenerator";
import { linearScale, extent, lowerBound } from "@/lib/canvasUtils";
import { MetricCategory, METRIC_CATEGORIES, METRIC_COLORS, AGGREGATION_PERIOD_MS } from "@/lib/types";

type Series = Partial<Record<MetricCategory, { xs: Float64Array; ys: Float32Array }>>;

export default function LineChart() {
  const { buffers, version, visibleCategories, aggregationPeriod, windowMs } = useDataContext();
  const { canvasRef, containerRef, size, renderFrame } = useChartRenderer("line-chart");

  const series = useMemo<Series>(() => {
    const now = Date.now();
    const rangeStart = now - windowMs;
    const result: Series = {};

    for (const category of METRIC_CATEGORIES) {
      if (!visibleCategories[category]) continue;
      const { timestamps, values } = getOrderedView(buffers[category]);
      const startIdx = lowerBound(timestamps, rangeStart);
      const ts = timestamps.subarray(startIdx);
      const vs = values.subarray(startIdx);

      if (aggregationPeriod === "raw") {
        result[category] = { xs: ts, ys: vs };
      } else {
        const periodMs = AGGREGATION_PERIOD_MS[aggregationPeriod];
        const buckets = aggregateByPeriod(ts, vs, category, periodMs);
        result[category] = {
          xs: Float64Array.from(buckets.map((b) => b.timestamp)),
          ys: Float32Array.from(buckets.map((b) => b.avg)),
        };
      }
    }
    return result;
    // version bumps on every tick — that's the real trigger for a refresh,
    // `buffers` itself is a stable ref so it wouldn't retrigger this alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, visibleCategories, aggregationPeriod, windowMs]);

  useEffect(() => {
    renderFrame(
      (ctx, width, height) => {
        const now = Date.now();
        const xScale = linearScale([now - windowMs, now], [8, width - 8]);

        const allValues: number[] = [];
        (Object.keys(series) as MetricCategory[]).forEach((k) => allValues.push(...Array.from(series[k]!.ys)));
        const [yMin, yMax] = extent(allValues.length ? allValues : [0, 100]);
        const pad = (yMax - yMin) * 0.1 || 1;
        const yScale = linearScale([yMin - pad, yMax + pad], [height - 18, 10]);

        (Object.keys(series) as MetricCategory[]).forEach((key) => {
          const s = series[key];
          if (!s || s.xs.length === 0) return;
          ctx.beginPath();
          for (let i = 0; i < s.xs.length; i++) {
            const px = xScale(s.xs[i]);
            const py = yScale(s.ys[i]);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = METRIC_COLORS[key];
          ctx.lineWidth = 1.5;
          ctx.lineJoin = "round";
          ctx.stroke();
        });
      },
      size.width,
      size.height
    );
  }, [series, size, renderFrame, windowMs]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
