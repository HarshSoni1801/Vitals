"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import FilterPanel from "../controls/FilterPanel";
import TimeRangeSelector from "../controls/TimeRangeSelector";
import LineChart from "../charts/LineChart";
import BarChart from "../charts/BarChart";
import ScatterPlot from "../charts/ScatterPlot";
import Heatmap from "../charts/Heatmap";
import PerformanceMonitor from "./PerformanceMonitor";

// DataTable renders locale-formatted timestamps (toLocaleTimeString) and is
// only ever meaningful once live/scrolling on the client — rather than
// pinning a locale and hoping server/client ICU data agrees on AM/PM
// casing, it's simplest and most robust to just not server-render it at
// all. ssr:false guarantees no hydration mismatch is possible here, by
// construction, rather than by coincidence of matching environments.
const DataTable = dynamic(() => import("./DataTable"), {
  ssr: false,
  loading: () => (
    <div className="border-t border-hairline px-4 py-6 text-center font-mono text-xs text-text-dim">
      Loading tick table…
    </div>
  ),
});

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-sm border border-hairline bg-panel">
      <div className="border-b border-hairline px-3 py-2 font-mono text-xs text-text-dim">{title}</div>
      <div className="h-56 p-2">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-void text-text">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <span className="font-sans text-base font-semibold tracking-tight">Vitals</span>
        <span className="font-mono text-xs text-text-dim">system metrics · live</span>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <FilterPanel />
        <TimeRangeSelector />
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <Panel title="Line — time series">
          <LineChart />
        </Panel>
        <Panel title="Bar — current values">
          <BarChart />
        </Panel>
        <Panel title="Scatter — CPU vs memory">
          <ScatterPlot categoryX="cpu" categoryY="memory" />
        </Panel>
        <Panel title="Heatmap — recent activity">
          <Heatmap />
        </Panel>
      </div>

      <PerformanceMonitor />
      <DataTable />
    </div>
  );
}
