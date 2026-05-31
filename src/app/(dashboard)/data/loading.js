export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 bg-muted rounded-lg w-32 mb-2" />
      <div className="h-4 bg-muted rounded w-52 mb-8" />

      <div className="h-4 bg-muted rounded w-36 mb-3" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 mb-10">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>

      <div className="h-4 bg-muted rounded w-24 mb-3" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 mb-10">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl" />
        ))}
      </div>

      <div className="h-4 bg-muted rounded w-40 mb-3" />
      <div className="h-52 bg-muted rounded-xl mb-10" />

      <div className="h-4 bg-muted rounded w-44 mb-3" />
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  )
}
