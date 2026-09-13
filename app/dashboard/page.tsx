import { generateInitialDataset } from "@/lib/dataGenerator";
import { DataProvider } from "@/components/providers/DataProvider";
import Dashboard from "@/components/ui/Dashboard";

// Without this, Next.js would statically prerender this page once at build
// time — since generateInitialDataset() anchors its timestamps to
// Date.now(), that would freeze the "historical" seed data to whenever the
// build ran, not whenever someone actually opens the page. A visitor
// arriving even an hour after build would see charts that look nearly
// empty (the default 5-minute window would exclude all the now-stale seed
// data) until enough live ticks accumulate in front of them.
export const dynamic = "force-dynamic";

const POINTS_PER_CATEGORY = 2_500; // 4 categories x 2,500 = 10,000 points baseline
const INTERVAL_MS = 100;

// Generation is cheap (10k points, well under a millisecond) but wrapped in
// an async function anyway: this is the seam where a real deployment would
// swap in a database/API read without touching the page component's shape.
async function loadInitialDataset() {
  return generateInitialDataset(POINTS_PER_CATEGORY, INTERVAL_MS);
}

export default async function DashboardPage() {
  const initialData = await loadInitialDataset();

  return (
    <DataProvider initialData={initialData}>
      <Dashboard />
    </DataProvider>
  );
}
