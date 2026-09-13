import {
  AggregatedBucket,
  MetricCategory,
  METRIC_CATEGORIES,
  SeriesBuffer,
} from "./types";

// --- Seeded PRNG (mulberry32), so demo runs are reproducible ---
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MetricParams {
  mean: number;
  vol: number;
  min: number;
  max: number;
}

export const METRIC_PARAMS: Record<MetricCategory, MetricParams> = {
  cpu: { mean: 45, vol: 6, min: 0, max: 100 },
  memory: { mean: 60, vol: 3, min: 0, max: 100 },
  network: { mean: 150, vol: 40, min: 0, max: 1000 },
  disk: { mean: 80, vol: 15, min: 0, max: 500 },
};

/** Mean-reverting random walk with an occasional spike — bounded, so a
 * dashboard left running for hours never drifts somewhere nonsensical. */
export function nextMetricValue(category: MetricCategory, prev: number, rng: () => number): number {
  const p = METRIC_PARAMS[category];
  const revert = 0.05 * (p.mean - prev);
  const noise = (rng() - 0.5) * 2 * p.vol;
  let next = prev + revert + noise;
  if (rng() < 0.01) next += (rng() - 0.5) * p.vol * 6;
  return Math.min(p.max, Math.max(p.min, next));
}

// --- Ring buffer: fixed capacity, O(1) append, bounded memory forever ---
export function createSeriesBuffer(capacity: number): SeriesBuffer {
  return {
    timestamps: new Float64Array(capacity),
    values: new Float32Array(capacity),
    length: 0,
    capacity,
    writeIndex: 0,
  };
}

export function pushToBuffer(buf: SeriesBuffer, timestamp: number, value: number): void {
  buf.timestamps[buf.writeIndex] = timestamp;
  buf.values[buf.writeIndex] = value;
  buf.writeIndex = (buf.writeIndex + 1) % buf.capacity;
  if (buf.length < buf.capacity) buf.length++;
}

/** Chronological view of the buffer's contents. Once the ring has wrapped,
 * the physical array order no longer matches time order, so this stitches
 * [writeIndex..capacity) + [0..writeIndex) back into one ascending run. */
export function getOrderedView(buf: SeriesBuffer): { timestamps: Float64Array; values: Float32Array } {
  if (buf.length < buf.capacity) {
    return {
      timestamps: buf.timestamps.subarray(0, buf.length),
      values: buf.values.subarray(0, buf.length),
    };
  }
  const timestamps = new Float64Array(buf.capacity);
  const values = new Float32Array(buf.capacity);
  const tailLen = buf.capacity - buf.writeIndex;
  timestamps.set(buf.timestamps.subarray(buf.writeIndex), 0);
  values.set(buf.values.subarray(buf.writeIndex), 0);
  timestamps.set(buf.timestamps.subarray(0, buf.writeIndex), tailLen);
  values.set(buf.values.subarray(0, buf.writeIndex), tailLen);
  return { timestamps, values };
}

export function resizeBuffer(buf: SeriesBuffer, newCapacity: number): SeriesBuffer {
  const { timestamps, values } = getOrderedView(buf);
  const next = createSeriesBuffer(newCapacity);
  const keep = Math.min(timestamps.length, newCapacity);
  const start = timestamps.length - keep;
  for (let i = 0; i < keep; i++) pushToBuffer(next, timestamps[start + i], values[start + i]);
  return next;
}

/**
 * Growing capacity via resizeBuffer alone keeps every existing point but
 * leaves the rest of the new capacity empty — it would then take
 * (newCapacity - oldLength) x intervalMs of real time to actually fill up
 * (e.g. 40,000 points at 100ms/tick is over an hour), which defeats the
 * point of a "load preset" meant to stress-test rendering *right now*.
 * This instead synthesizes the extra history immediately, same generator
 * as the initial seed, so a load-preset click has an immediate effect.
 */
export function growBufferWithSyntheticHistory(
  buf: SeriesBuffer,
  newCapacity: number,
  category: MetricCategory,
  intervalMs: number,
  rng: () => number
): SeriesBuffer {
  const current = getOrderedView(buf);
  const keepCount = current.timestamps.length;

  if (newCapacity <= keepCount) return resizeBuffer(buf, newCapacity);

  const backfillCount = newCapacity - keepCount;
  const earliestTs = keepCount > 0 ? current.timestamps[0] : Date.now();
  const backfillStart = earliestTs - backfillCount * intervalMs;

  const next = createSeriesBuffer(newCapacity);
  let value = keepCount > 0 ? current.values[0] : METRIC_PARAMS[category].mean;

  // Walk forward in time from backfillStart up to (but not including) the
  // real data's first point, then append the real points unchanged.
  for (let i = 0; i < backfillCount; i++) {
    value = nextMetricValue(category, value, rng);
    pushToBuffer(next, backfillStart + i * intervalMs, value);
  }
  for (let i = 0; i < keepCount; i++) {
    pushToBuffer(next, current.timestamps[i], current.values[i]);
  }

  return next;
}

// --- Aggregation: group into fixed-width time buckets ---
export function aggregateByPeriod(
  timestamps: Float64Array,
  values: Float32Array,
  category: MetricCategory,
  periodMs: number
): AggregatedBucket[] {
  const buckets = new Map<number, { sum: number; min: number; max: number; count: number }>();
  for (let i = 0; i < timestamps.length; i++) {
    const bucketTs = Math.floor(timestamps[i] / periodMs) * periodMs;
    let b = buckets.get(bucketTs);
    if (!b) {
      b = { sum: 0, min: Infinity, max: -Infinity, count: 0 };
      buckets.set(bucketTs, b);
    }
    const v = values[i];
    b.sum += v;
    if (v < b.min) b.min = v;
    if (v > b.max) b.max = v;
    b.count++;
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, b]) => ({
      timestamp,
      category,
      avg: b.sum / b.count,
      min: b.min,
      max: b.max,
      count: b.count,
    }));
}

/** Server-side initial dataset — called from the dashboard's Server
 * Component so the first paint already has data, before the client takes
 * over with live simulated updates. */
export function generateInitialDataset(
  pointsPerCategory: number,
  intervalMs: number,
  seed = 20260912
): Record<MetricCategory, SeriesBuffer> {
  const rng = createRng(seed);
  const now = Date.now();
  const startTs = now - pointsPerCategory * intervalMs;

  const result = {} as Record<MetricCategory, SeriesBuffer>;
  for (const category of METRIC_CATEGORIES) {
    const buf = createSeriesBuffer(pointsPerCategory);
    let value = METRIC_PARAMS[category].mean;
    for (let i = 0; i < pointsPerCategory; i++) {
      value = nextMetricValue(category, value, rng);
      pushToBuffer(buf, startTs + i * intervalMs, value);
    }
    result[category] = buf;
  }
  return result;
}
