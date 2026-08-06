export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between gap-4">
        <div className="h-8 w-40 rounded-[var(--radius-control)] bg-chip" />
        <div className="h-9 w-24 rounded-[var(--radius-control)] bg-chip" />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="h-9 w-48 rounded-[var(--radius-control)] bg-chip" />
        <div className="h-9 w-32 rounded-[var(--radius-control)] bg-chip" />
      </div>
      <div className="ui-card overflow-hidden">
        <div className="border-b border-border bg-chip/60 px-4 py-3">
          <div className="flex gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 w-16 rounded bg-chip" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-8 border-b border-border/60 px-4 py-3 last:border-0">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="h-4 w-20 rounded bg-chip" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
