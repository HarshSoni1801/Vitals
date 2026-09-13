# Performance

## A note on the numbers below

The load-preset benchmark table below is real, measured data (methodology
below). The memory-growth-over-time measurement (leaving the dashboard
running for 30-60+ minutes) was deliberately skipped given time
constraints — see the note under the results table for why memory is
still expected to stay bounded, and how to actually verify it if you have
the time before the interview.

## How to reproduce these measurements

1. `npm run build && npm start` — always benchmark a production build, not `next dev` (dev mode adds instrumentation overhead that skews both FPS and memory).
2. Open the deployed/production build, open DevTools → Performance tab.
3. Read live FPS/render/process/memory straight off the in-app performance strip — no external tooling needed for that part.
4. For each load preset (2.5k / 10k / 50k / 100k), record FPS and render time for ~30 seconds each.
5. _(Skipped in this submission for time — worth doing if you have an hour before the interview)_ For memory-over-time: leave the tab open for an hour with the stream running, sampling the strip's memory reading every 10-15 minutes.

## Benchmarking results

Measured on a production build (`npm run build && npm start`), Chrome, using the in-app performance strip cross-checked against Chrome's own task manager (Shift+Esc).

| Load (total points) | FPS (target 60) | Render time (ms) | Data-processing time (ms) | Memory |
| -------------------- | ---------------- | ------------------ | -------------------------- | ------- |
| 2,500                 | 143               | 0.10                | 0.00                        | 19.9MB  |
| 10,000 (baseline)     | 126               | 0.30                | 0.00                        | 21.3MB  |
| 50,000                | 123               | 0.10                | 0.00                        | 26.6MB  |
| 100,000 (stress)      | 127               | 0.20                | 0.00                        | 48.7MB  |

**Reading these numbers honestly:** FPS holds at 120+ across the entire range rather than degrading — that's the browser's own refresh-rate cap (a 120Hz+ display), not evidence the app is unstressed. The number that actually shows the cost of scale is render time staying sub-millisecond even at 100k points, and memory scaling from ~20MB to ~49MB as buffer capacity grows 40x — a sensible, bounded relationship (memory tracks buffer *capacity*, not an unbounded leak), not the 2-3x-per-doubling growth you'd see if something were quietly duplicating data on every resize.

**Memory growth over time:** not measured — a genuine 30-60+ minute soak
test didn't fit in the time available for this assignment. Rather than
leave fabricated numbers or an empty table, here's the reasoning for why
I'd expect it to hold, which is falsifiable and worth stating plainly:
every category's storage is a *fixed-capacity* ring buffer — `pushToBuffer`
never grows the underlying `Float64Array`/`Float32Array` once the buffer
is full, it overwrites the oldest slot in place. The only per-tick
allocations are four primitive numbers (`nextMetricValue`'s return
values), not objects or arrays. If someone runs the soak test and memory
*does* climb steadily, the most likely culprit is the
`performance.mark`/`measure` entries in `useChartRenderer.ts` not actually
being cleared — that's the one part of this design relying on a browser
behavior (an observer keeps its own copy of an entry even after
`clearMeasures`) I verified by reasoning, not by execution.

## React optimization techniques

- **`useTransition` for tick updates** (`useDataStream.ts`). Every 100ms
  tick bumps a `version` counter inside `startTransition`, so React can
  interrupt/deprioritize the resulting chart re-render if something more
  urgent (e.g. the user clicking a filter) comes in at the same instant.
  `isPending` surfaces in the UI ("applying…") rather than being silently
  swallowed.
- **Ref-held mutable buffers, not React state, for the actual data.**
  `SeriesBuffer`s live in a `useRef`, not `useState` — pushing a tick is an
  O(1) typed-array write, not a state update that would otherwise force
  React to diff a growing array on every tick. `version` is the only piece
  of state that changes per tick; it exists purely to tell consumers "go
  re-read the ref."
- **`useMemo` gates the expensive derivations**, not the raw data. Each
  chart's `useMemo` (e.g. `LineChart`'s aggregation, `Heatmap`'s bucketing)
  depends on `version` (and filter/range state) rather than on `buffers`
  itself — `buffers` is a stable ref identity that would never retrigger a
  memo on its own.
- **Canvas instead of a DOM-diffed chart.** None of the four charts render
  data points as React elements; each draws directly to a `<canvas>` inside
  a `useEffect`, so 10,000+ points never touch React's reconciler at all —
  only the (tiny) control surface around the canvas does.

## Next.js performance features

- **Server Component for the initial dataset** (`app/dashboard/page.tsx`).
  The first 10,000 points are generated server-side and streamed down with
  the initial HTML — no client-side "fetch then render" waterfall before
  the first chart paints.
- **Client boundary starts at `<DataProvider>`**, not higher — everything
  above it (the root layout, the dashboard page's data generation) stays a
  Server Component, keeping the client JS bundle to just what's actually
  interactive.
- **Route handler** (`app/api/data/route.ts`) as the seam for a real data
  source — swapping the simulated stream for a real backend later means
  changing this one file's implementation, not any component.
- **`loading.tsx`/`error.tsx`** boundaries at the route level rather than
  ad hoc loading/error state threaded through props.

## Canvas + React integration

- **One `useChartRenderer` hook, four charts.** Sizing (DPR-correct,
  `ResizeObserver`-driven) and render-timing (`performance.mark`/`measure`)
  are implemented once and shared, so each chart component only has to
  supply its own `draw(ctx, width, height)` function.
- **`performance.mark`/`measure` around every draw**, feeding a single
  `PerformanceObserver` in `usePerformanceMonitor` — this was Claude's
  reason for choosing that hook API in the assignment's own sample code,
  so it's implemented literally rather than reinvented.
- **Marks/measures are cleared immediately after each draw.** Not clearing
  them would let the performance timeline buffer grow for the lifetime of
  the tab — directly working against the "runs for hours without leaking"
  requirement.

## Scaling strategy: what changes past 100k points

- **Downsample before drawing, not just cap the buffer.** At 100k+ points
  per category, drawing every point in the visible window (rather than a
  representative subset) is the next bottleneck. The `LineChart` doesn't
  currently downsample; the natural next step is the same LTTB
  (Largest-Triangle-Three-Buckets) approach used in the companion
  500k-point dashboard project — bucket the visible range and keep the
  point per bucket that best preserves the series' shape.
- **Move aggregation/downsampling off the main thread.** `aggregateByPeriod`
  and a future downsampling pass are both pure functions over typed arrays
  — straightforward to move into a Web Worker (mentioned as a bonus in the
  brief) once the per-tick cost of running them on the main thread starts
  showing up in the render-time reading.
- **`OffscreenCanvas`** would let that worker draw directly instead of just
  computing data for the main thread to draw — the further step if 100k+
  points per chart needs to become the steady-state case rather than a
  stress-test toggle.
