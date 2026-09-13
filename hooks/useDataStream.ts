"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MetricCategory, METRIC_CATEGORIES, SeriesBuffer } from "@/lib/types";
import { createRng, growBufferWithSyntheticHistory, nextMetricValue, pushToBuffer } from "@/lib/dataGenerator";
import { measure } from "@/lib/performanceUtils";

const DEFAULT_INTERVAL_MS = 100;

export interface UseDataStreamOptions {
  initialBuffers: Record<MetricCategory, SeriesBuffer>;
  intervalMs?: number;
}

function tailValue(buf: SeriesBuffer): number {
  if (buf.length === 0) return 50;
  const idx = (buf.writeIndex - 1 + buf.capacity) % buf.capacity;
  return buf.values[idx];
}

export function useDataStream({ initialBuffers, intervalMs = DEFAULT_INTERVAL_MS }: UseDataStreamOptions) {
  const buffersRef = useRef<Record<MetricCategory, SeriesBuffer>>(initialBuffers);
  const lastValueRef = useRef<Record<MetricCategory, number>>(
    Object.fromEntries(METRIC_CATEGORIES.map((c) => [c, tailValue(initialBuffers[c])])) as Record<
      MetricCategory,
      number
    >
  );
  const rngRef = useRef(createRng((Date.now() % 2147483647) || 1));

  const [version, setVersion] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [dataProcessingMs, setDataProcessingMs] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      const { ms } = measure(() => {
        const now = Date.now();
        for (const category of METRIC_CATEGORIES) {
          const next = nextMetricValue(category, lastValueRef.current[category], rngRef.current);
          lastValueRef.current[category] = next;
          pushToBuffer(buffersRef.current[category], now, next);
        }
      });
      setDataProcessingMs(ms);

      // Marking this a transition lets React deprioritize the (expensive)
      // chart re-render behind anything more urgent happening at the same
      // instant — e.g. the user dragging a control — without dropping the
      // update, just delaying it slightly.
      startTransition(() => setVersion((v) => v + 1));
    }, intervalMs);
    return () => clearInterval(id);
  }, [isRunning, intervalMs]);

  const setCapacity = useCallback((pointsPerCategory: number) => {
    for (const category of METRIC_CATEGORIES) {
      buffersRef.current[category] = growBufferWithSyntheticHistory(
        buffersRef.current[category],
        pointsPerCategory,
        category,
        intervalMs,
        rngRef.current
      );
      lastValueRef.current[category] = tailValue(buffersRef.current[category]);
    }
    setVersion((v) => v + 1);
  }, [intervalMs]);

  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => setIsRunning(true), []);

  return {
    buffers: buffersRef.current,
    version,
    isRunning,
    isPending,
    dataProcessingMs,
    pause,
    resume,
    setCapacity,
  };
}
