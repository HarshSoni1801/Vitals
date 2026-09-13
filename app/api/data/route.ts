import { NextRequest, NextResponse } from "next/server";
import { generateInitialDataset, getOrderedView } from "@/lib/dataGenerator";
import { METRIC_CATEGORIES } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pointsPerCategory = Math.min(
    50_000,
    Math.max(100, Number(searchParams.get("pointsPerCategory")) || 2_500)
  );
  const intervalMs = Math.max(10, Number(searchParams.get("intervalMs")) || 100);

  const dataset = generateInitialDataset(pointsPerCategory, intervalMs);

  const series = Object.fromEntries(
    METRIC_CATEGORIES.map((category) => {
      const { timestamps, values } = getOrderedView(dataset[category]);
      return [category, { timestamps: Array.from(timestamps), values: Array.from(values) }];
    })
  );

  return NextResponse.json({ pointsPerCategory, intervalMs, series });
}
