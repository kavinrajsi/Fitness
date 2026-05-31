export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 bg-muted rounded-lg w-44 mb-2" />
      <div className="h-4 bg-muted rounded w-56 mb-6" />

      <div className="flex gap-2 mb-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-24 bg-muted rounded-full" />
        ))}
      </div>
      <div className="h-3 bg-muted rounded w-32 mb-6" />

      <div className="flex flex-col gap-3 max-w-[600px]">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
}
