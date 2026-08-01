export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading impact analytics</span>

      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      </div>

      <div className="h-28 animate-pulse rounded-lg border bg-muted/40" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-[360px] animate-pulse rounded-lg border bg-muted/40" />
      ))}
    </div>
  )
}
