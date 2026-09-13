/** Rolling 1-second window of frame timestamps -> current FPS. */
export class FpsTracker {
  private frames: number[] = [];

  tick(now: number): number {
    this.frames.push(now);
    while (this.frames.length && now - this.frames[0] > 1000) this.frames.shift();
    return this.frames.length;
  }
}

/** `performance.memory` is Chromium-only and not in the standard TS lib,
 * hence the narrow cast — returns null everywhere else rather than throwing. */
export function getMemoryUsageMB(): number | null {
  if (typeof performance === "undefined") return null;
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  if (!mem) return null;
  return mem.usedJSHeapSize / (1024 * 1024);
}

export function measure<T>(fn: () => T): { result: T; ms: number } {
  const t0 = performance.now();
  const result = fn();
  const ms = performance.now() - t0;
  return { result, ms };
}
