"use client";

import { useEffect, useMemo } from "react";
import { useDataContext } from "../providers/DataProvider";
import { useChartRenderer } from "@/hooks/useChartRenderer";
import { getOrderedView } from "@/lib/dataGenerator";
import { linearScale, extent, lowerBound } from "@/lib/canvasUtils";
import { MetricCategory, METRIC_COLORS } from "@/lib/types";

export default function ScatterPlot({
  categoryX = "cpu",
  categoryY = "memory",
}: {
  categoryX?: MetricCategory;
  categoryY?: MetricCategory;
}) {
  const { buffers, version, windowMs } = useDataContext();
  const { canvasRef, containerRef, size, renderFrame } = useChartRenderer("scatter-plot");

  const points = useMemo(() => {
    const now = Date.now();
    const rangeStart = now - windowMs;

    const bufX = getOrderedView(buffers[categoryX]);
    const bufY = getOrderedView(buffers[categoryY]);
    // Both categories tick in lockstep (same interval, same loop), so their
    // ordered views stay index-aligned — no timestamp matching needed.
    const n = Math.min(bufX.timestamps.length, bufY.timestamps.length);
    const startIdx = lowerBound(bufX.timestamps.subarray(0, n), rangeStart);

    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = startIdx; i < n; i++) {
      xs.push(bufX.values[i]);
      ys.push(bufY.values[i]);
    }
    return { xs, ys };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, categoryX, categoryY, windowMs]);

  useEffect(() => {
    renderFrame(
      (ctx, width, height) => {
        if (points.xs.length === 0) return;
        const [xMin, xMax] = extent(points.xs);
        const [yMin, yMax] = extent(points.ys);
        const xPad = (xMax - xMin) * 0.1 || 1;
        const yPad = (yMax - yMin) * 0.1 || 1;

        const xScale = linearScale([xMin - xPad, xMax + xPad], [24, width - 10]);
        const yScale = linearScale([yMin - yPad, yMax + yPad], [height - 20, 10]);

        const n = points.xs.length;
        for (let i = 0; i < n; i++) {
          const recency = i / n; // 0 = oldest, 1 = newest
          const px = xScale(points.xs[i]);
          const py = yScale(points.ys[i]);
          ctx.beginPath();
          ctx.arc(px, py, 2 + recency * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 176, 0, ${0.15 + recency * 0.6})`;
          ctx.fill();
        }

        ctx.fillStyle = METRIC_COLORS[categoryY];
        ctx.font = "10px ui-monospace, monospace";
        ctx.save();
        ctx.translate(10, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.fillText(categoryY, 0, 0);
        ctx.restore();

        ctx.fillStyle = METRIC_COLORS[categoryX];
        ctx.textAlign = "center";
        ctx.fillText(categoryX, width / 2, height - 6);
      },
      size.width,
      size.height
    );
  }, [points, size, renderFrame, categoryX, categoryY]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
