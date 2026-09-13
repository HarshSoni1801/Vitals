export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-hairline border-t-amber" />
        <p className="font-mono text-sm text-text-dim">Generating initial dataset…</p>
      </div>
    </div>
  );
}
