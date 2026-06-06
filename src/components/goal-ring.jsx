/**
 * SVG progress ring for the daily step goal. Server component (pure SVG).
 */
export function GoalRing({ pct, label, sublabel, size = 148, stroke = 12 }) {
  const clamped = Math.min(Math.max(pct ?? 0, 0), 1)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped)
  const center = size / 2

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-semibold tabular-nums">{label}</span>
        {sublabel && <span className="text-muted-foreground text-xs">{sublabel}</span>}
      </div>
    </div>
  )
}
