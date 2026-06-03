export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Back link */}
      <div className="h-4 bg-muted rounded w-24 mb-6" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-16 w-16 bg-muted rounded-full flex-shrink-0" />
        <div>
          <div className="h-7 bg-muted rounded w-40 mb-2" />
          <div className="h-4 bg-muted rounded w-28" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-20 bg-muted rounded-xl" />
        ))}
      </div>

      {/* Best day */}
      <div className="h-14 bg-muted rounded-xl mb-8" />

      {/* Chart */}
      <div className="h-4 bg-muted rounded w-40 mb-3" />
      <div className="h-56 bg-muted rounded-xl mb-8" />

      {/* Table */}
      <div className="h-4 bg-muted rounded w-20 mb-3" />
      <div className="flex flex-col gap-1">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-12 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
}
