"use client";

import { useEffect, useRef, useState } from "react";
import { FpsTracker, getMemoryUsageMB } from "@/lib/performanceUtils";
import { PerformanceMetrics } from "@/lib/types";

export function usePerformanceMonitor(pointCount: number, dataProcessingTimeMs: number): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsageMB: null,
    renderTimeMs: 0,
    dataProcessingTimeMs: 0,
    pointCount,
  });

  const fpsTrackerRef = useRef(new FpsTracker());
  const renderTimeRef = useRef(0);

  // Charts mark/measure their own draw calls under one shared name; this
  // observer aggregates the latest reading instead of every chart having to
  // thread a render-time callback up through props.
  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntriesByName("chart-render");
      if (entries.length > 0) {
        renderTimeRef.current = entries[entries.length - 1].duration;
      }
    });
    observer.observe({ entryTypes: ["measure"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    let lastMemorySample = 0;

    function loop(now: number) {
      const fps = fpsTrackerRef.current.tick(now);

      setMetrics((prev) => {
        let memoryUsageMB = prev.memoryUsageMB;
        if (now - lastMemorySample > 1000) {
          memoryUsageMB = getMemoryUsageMB();
          lastMemorySample = now;
        }
        return {
          fps,
          memoryUsageMB,
          renderTimeMs: renderTimeRef.current,
          dataProcessingTimeMs,
          pointCount,
        };
      });

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [dataProcessingTimeMs, pointCount]);

  return metrics;
}
