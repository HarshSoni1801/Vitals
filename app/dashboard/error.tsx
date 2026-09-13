"use client";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <p className="font-sans text-sm text-text">The dashboard failed to load.</p>
        <p className="font-mono text-xs text-text-dim">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-sm border border-hairline px-3 py-1.5 font-mono text-xs text-text transition-colors hover:border-amber/50"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
