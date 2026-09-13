"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { sizeCanvasForDPR } from "@/lib/canvasUtils";

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

/**
 * Wraps a chart's draw call with `performance.mark`/`measure` under a shared
 * "chart-render" name, which `usePerformanceMonitor`'s `PerformanceObserver`
 * picks up. Marks/measures are cleared right after — an observer that has
 * already been notified keeps its own copy of the entry, so clearing here
 * doesn't lose the reading, but *not* clearing would let the performance
 * timeline buffer grow forever on a dashboard meant to run for hours.
 *
 * Also owns responsive sizing via ResizeObserver — every chart needs this,
 * so it lives here rather than as a fifth hook file.
 */
export function useChartRenderer(chartName: string) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderFrame = useCallback(
    (draw: DrawFn, width: number, height: number) => {
      const canvas = canvasRef.current;
      if (!canvas || width <= 0 || height <= 0) return;

      const hasPerf = typeof performance !== "undefined" && typeof performance.mark === "function";
      const startMark = `${chartName}-start`;
      const endMark = `${chartName}-end`;

      if (hasPerf) performance.mark(startMark);

      const ctx = sizeCanvasForDPR(canvas, width, height);
      ctx.clearRect(0, 0, width, height);
      draw(ctx, width, height);

      if (hasPerf) {
        performance.mark(endMark);
        performance.measure("chart-render", startMark, endMark);
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures("chart-render");
      }
    },
    [chartName]
  );

  return { canvasRef, containerRef, size, renderFrame };
}
