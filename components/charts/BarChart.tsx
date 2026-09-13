"use client";

import { useEffect, useMemo } from "react";
import { useDataContext } from "../providers/DataProvider";
import { useChartRenderer } from "@/hooks/useChartRenderer";
import { getOrderedView } from "@/lib/dataGenerator";
import { linearScale, withAlpha } from "@/lib/canvasUtils";
import { MetricCategory, METRIC_CATEGORIES, METRIC_COLORS } from "@/lib/types";

export default function BarChart() {
  const { buffers, version, visibleCategories } = useDataContext();
  const { canvasRef, containerRef, size, renderFrame } = useChartRenderer("bar-chart");

  const current = useMemo(() => {
    const result: Partial<Record<MetricCategory, number>> = {};
    for (const category of METRIC_CATEGORIES) {
      if (!visibleCategories[category]) continue;
      const { values } = getOrderedView(buffers[category]);
      result[category] = values.length ? values[values.length - 1] : 0;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, visibleCategories]);

  useEffect(() => {
    renderFrame(
      (ctx, width, height) => {
        const keys = Object.keys(current) as MetricCategory[];
        if (keys.length === 0) return;

        const maxVal = Math.max(1, ...keys.map((k) => current[k]!));
        const yScale = linearScale([0, maxVal * 1.15], [height - 24, 10]);

        const gap = 16;
        const barWidth = (width - gap * (keys.length + 1)) / keys.length;

        keys.forEach((key, i) => {
          const value = current[key]!;
          const x = gap + i * (barWidth + gap);
          const yTop = yScale(value);
          const barHeight = height - 24 - yTop;
          const color = METRIC_COLORS[key];

          ctx.fillStyle = withAlpha(color, 0.85);
          ctx.fillRect(x, yTop, barWidth, barHeight);

          ctx.fillStyle = "#8B909A";
          ctx.font = "11px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText(key, x + barWidth / 2, height - 8);
          ctx.fillStyle = "#E8E6E1";
          ctx.fillText(value.toFixed(1), x + barWidth / 2, Math.max(12, yTop - 6));
        });
      },
      size.width,
      size.height
    );
  }, [current, size, renderFrame]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
