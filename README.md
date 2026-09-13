# Vitals

A real-time system-metrics dashboard (CPU / memory / network / disk) built
for the Flam Frontend R&D assignment: render and update 10,000+ points at
60fps using Next.js App Router + TypeScript, with every chart hand-rolled on
canvas — no D3, no Chart.js.

## Setup

```bash
npm install
npm run dev      # http://localhost:3000 (redirects to /dashboard)
```

```bash
npm run build && npm start   # production build
```

No environment variables, no database, no API keys — the data is a seeded
random walk simulated entirely in the app.

## Performance testing

- The **performance strip** at the bottom of the dashboard shows live FPS,
  render time, data-processing time, memory (Chromium only — `performance.memory`
  isn't standardized elsewhere), and current point count.
- Use the **load presets** (2.5k / 10k / 50k / 100k) to change how many
  points per category are kept in memory, or hit **"Stress test (100k)"**
  for the 100k-point stretch target in one click.
- See `PERFORMANCE.md` for methodology and results.

## Browser compatibility

Built and reasoned about against current Chrome/Edge/Firefox/Safari.
`performance.memory` (heap size reporting) is Chromium-only — the memory
reading shows "n/a" elsewhere, everything else is standard Web APIs
(`Canvas2D`, `ResizeObserver`, `PerformanceObserver`, `requestAnimationFrame`).

## Feature overview

- **Four chart types**, all canvas, all first-party code:
  - **Line** — live time series per category, with `raw` / `1min` / `5min`
    / `1hour` aggregation.
  - **Bar** — current value per category.
  - **Scatter** — CPU vs. memory correlation over the visible window, with
    a recency-based fade.
  - **Heatmap** — recent activity per category across time buckets.
- **Filter panel** — toggle categories on/off, pick the aggregation period.
- **Time range selector** — 1min / 5min / 15min / 1hour visible window.
- **Virtualized tick table** — every raw tick for a selected category,
  newest first, with only the visible rows ever touching the DOM.
- **Performance monitor** — FPS, render time, data-processing time, memory,
  point count, load presets, and a stress-test toggle, all visible in the UI
  (not hidden behind a debug flag).

## Next.js-specific choices

- **Server Component for the initial dataset.** `app/dashboard/page.tsx`
  generates the seed data server-side and hands it to a client
  `<DataProvider>` — the first paint already has data; the client then
  takes over with the live 100ms simulation.
- **Route handler** (`app/api/data/route.ts`) for generating a dataset
  chunk on demand — the seam where a real deployment would swap in an
  actual data source without touching any component.
- **`loading.tsx` / `error.tsx`** boundaries on the dashboard route.
- **`useTransition`** wraps every incoming tick's state update
  (`useDataStream.ts`), so a chart re-render never blocks a concurrent user
  interaction — it just lands a beat later instead of janking the UI thread.

See `PERFORMANCE.md` for the full architecture rationale.

## AI usage note

I used Claude (Anthropic) for this build. I directed the
architecture (ring buffers over growing arrays, `useTransition` for the
tick updates, canvas + PerformanceObserver for the render-timing pipeline,
Server Component for the initial dataset) and reviewed the implementation. Per the assignment's own note that
honesty about AI use counts in your favor: I've gone through this codebase
to understand each piece well enough to explain it, debug it, or extend it
live in an interview.

**Important caveat on testing:** this was built in an environment without
package-registry access, so `npm install`/`next build`/`tsc` could not be
run during development to catch compile errors. The core data-processing
logic (ring buffer, aggregation, the metric generator) was verified by
executing equivalent JavaScript directly in Node before being ported to
TypeScript, but the React/Next.js layer itself has not been compiled or
run in a browser yet as of this writing. **Run `npm install && npm run dev`
and fix forward from whatever errors come up** before treating this as
submission-ready.

## Known limitations

- The metric data is a seeded synthetic random walk, not real system
  telemetry — realistic-looking, not real.
- `performance.memory` is Chromium-only; Safari/Firefox show "n/a" for
  memory rather than a number.
- Pausing/resuming the stream doesn't back-fill the paused interval — the
  walk just continues from wherever it left off.
- The scatter plot's CPU-vs-memory pairing assumes both categories tick in
  lockstep (same interval, same loop iteration), which holds given how
  `useDataStream` generates all four categories per tick — but it's an
  assumption, not something enforced by a type.
- No automated tests, given the scope and time available — correctness of
  the core algorithms was checked by hand (see `PERFORMANCE.md`).
- The long-run memory-growth benchmark (running for an hour to confirm
  < 1MB/hour growth) wasn't performed given time constraints — see
  `PERFORMANCE.md` for the architectural reasoning on why it's still
  expected to hold, and what to check if it doesn't.

## Time spent

~8 hours (data model + ring buffer, four chart implementations,
Server/Client component split, performance monitor, docs).
