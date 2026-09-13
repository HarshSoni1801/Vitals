export type MetricCategory = "cpu" | "memory" | "network" | "disk";

export const METRIC_CATEGORIES: MetricCategory[] = ["cpu", "memory", "network", "disk"];

export const METRIC_COLORS: Record<MetricCategory, string> = {
  cpu: "#FF6B6B",
  memory: "#4ECDC4",
  network: "#FFD166",
  disk: "#A78BFA",
};

export interface DataPoint {
  timestamp: number;
  value: number;
  category: MetricCategory;
  metadata?: Record<string, unknown>;
}

export type ChartType = "line" | "bar" | "scatter" | "heatmap";

export interface ChartConfig {
  type: ChartType;
  dataKey: MetricCategory;
  color: string;
  visible: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  memoryUsageMB: number | null; // null when performance.memory isn't available (non-Chromium browsers)
  renderTimeMs: number;
  dataProcessingTimeMs: number;
  pointCount: number;
}

export type AggregationPeriod = "raw" | "1min" | "5min" | "1hour";

export const AGGREGATION_PERIOD_MS: Record<Exclude<AggregationPeriod, "raw">, number> = {
  "1min": 60_000,
  "5min": 5 * 60_000,
  "1hour": 60 * 60_000,
};

export interface AggregatedBucket {
  timestamp: number; // bucket start
  category: MetricCategory;
  avg: number;
  min: number;
  max: number;
  count: number;
}

/** Parallel-typed-array storage for one category's series — far cheaper to
 * append to and scan than an array of {timestamp,value,category} objects. */
export interface SeriesBuffer {
  timestamps: Float64Array;
  values: Float32Array;
  length: number; // filled length (<= capacity)
  capacity: number;
  writeIndex: number; // for the ring-buffer wraparound once full
}
