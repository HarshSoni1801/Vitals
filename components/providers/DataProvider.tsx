"use client";

import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import {
  AggregationPeriod,
  MetricCategory,
  METRIC_CATEGORIES,
  SeriesBuffer,
} from "@/lib/types";
import { useDataStream } from "@/hooks/useDataStream";

interface DataContextValue {
  buffers: Record<MetricCategory, SeriesBuffer>;
  version: number;
  isRunning: boolean;
  isPending: boolean;
  dataProcessingMs: number;
  pause: () => void;
  resume: () => void;
  setCapacity: (pointsPerCategory: number) => void;

  aggregationPeriod: AggregationPeriod;
  setAggregationPeriod: (p: AggregationPeriod) => void;

  visibleCategories: Record<MetricCategory, boolean>;
  toggleCategory: (c: MetricCategory) => void;

  windowMs: number;
  setWindowMs: (ms: number) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataContext must be used within <DataProvider>");
  return ctx;
}

export function DataProvider({
  initialData,
  children,
}: {
  initialData: Record<MetricCategory, SeriesBuffer>;
  children: ReactNode;
}) {
  const stream = useDataStream({ initialBuffers: initialData });

  const [aggregationPeriod, setAggregationPeriod] = useState<AggregationPeriod>("raw");
  const [visibleCategories, setVisibleCategories] = useState<Record<MetricCategory, boolean>>(
    () => Object.fromEntries(METRIC_CATEGORIES.map((c) => [c, true])) as Record<MetricCategory, boolean>
  );
  const [windowMs, setWindowMs] = useState(5 * 60_000); // last 5 minutes visible by default

  const toggleCategory = (c: MetricCategory) =>
    setVisibleCategories((prev) => ({ ...prev, [c]: !prev[c] }));

  const value = useMemo<DataContextValue>(
    () => ({
      ...stream,
      aggregationPeriod,
      setAggregationPeriod,
      visibleCategories,
      toggleCategory,
      windowMs,
      setWindowMs,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stream, aggregationPeriod, visibleCategories, windowMs]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
