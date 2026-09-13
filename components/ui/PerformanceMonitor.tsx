"use client";

import { useState } from "react";
import { useDataContext } from "../providers/DataProvider";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { METRIC_CATEGORIES } from "@/lib/types";

const LOAD_PRESETS = [
  { label: "2.5k", pointsPerCategory: 625 },
  { label: "10k", pointsPerCategory: 2_500 },
  { label: "50k", pointsPerCategory: 12_500 },
  { label: "100k", pointsPerCategory: 25_000 },
];

const STRESS_POINTS_PER_CATEGORY = 25_000; // 100k total

function fpsTone(fps: number) {
  if (fps >= 50) return "text-up";
  if (fps >= 25) return "text-amber";
  return "text-down";
}

export default function PerformanceMonitor() {
  const { buffers, dataProcessingMs, setCapacity, isRunning, pause, resume, isPending } = useDataContext();
  const [stressMode, setStressMode] = useState(false);

  const totalPoints = METRIC_CATEGORIES.reduce((sum, c) => sum + buffers[c].length, 0);
  const metrics = usePerformanceMonitor(totalPoints, dataProcessingMs);

  function applyPreset(pointsPerCategory: number) {
    setCapacity(pointsPerCategory);
    setStressMode(false);
  }

  function toggleStress() {
    if (stressMode) {
      setCapacity(LOAD_PRESETS[1].pointsPerCategory); // back to 10k baseline
      setStressMode(false);
    } else {
      setCapacity(STRESS_POINTS_PER_CATEGORY);
      setStressMode(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hairline bg-panel px-4 py-2.5 font-mono text-xs text-text-dim">
      <button
        type="button"
        onClick={isRunning ? pause : resume}
        className="rounded-sm border border-hairline px-2.5 py-1 font-sans text-xs text-text transition-colors hover:border-amber/50"
      >
        {isRunning ? "Pause stream" : "Resume stream"}
      </button>

      <span>
        fps <span className={`font-semibold ${fpsTone(metrics.fps)}`}>{metrics.fps}</span>
      </span>
      <span>
        render <span className="text-text">{metrics.renderTimeMs.toFixed(2)}ms</span>
      </span>
      <span>
        process <span className="text-text">{metrics.dataProcessingTimeMs.toFixed(2)}ms</span>
      </span>
      <span>
        mem{" "}
        <span className="text-text">
          {metrics.memoryUsageMB != null ? `${metrics.memoryUsageMB.toFixed(1)}MB` : "n/a"}
        </span>
      </span>
      <span>
        points <span className="text-text">{metrics.pointCount.toLocaleString("en-US")}</span>
      </span>
      {isPending && <span className="text-amber">applying…</span>}

      <div className="ml-auto flex items-center gap-1">
        <span className="mr-1 text-text-dim">load</span>
        {LOAD_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.pointsPerCategory)}
            className="rounded-sm border border-hairline px-2 py-1 transition-colors hover:border-amber/50 hover:text-text"
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleStress}
          className={`rounded-sm border px-2.5 py-1 font-sans transition-colors ${
            stressMode ? "border-down/50 bg-down/10 text-down" : "border-hairline text-text-dim hover:text-text"
          }`}
        >
          {stressMode ? "Exit stress test" : "Stress test (100k)"}
        </button>
      </div>
    </div>
  );
}
