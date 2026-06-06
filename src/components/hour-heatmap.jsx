/**
 * Day-of-week × hour activity heatmap. `grid` is [weekday(0=Sun)][hour(0-23)] of summed
 * steps; cells are shaded with the brand color by intensity. Server component.
 */
const WEEKDAYS = [
  { index: 1, label: 'Mon' },
  { index: 2, label: 'Tue' },
  { index: 3, label: 'Wed' },
  { index: 4, label: 'Thu' },
  { index: 5, label: 'Fri' },
  { index: 6, label: 'Sat' },
  { index: 0, label: 'Sun' },
]

export function HourHeatmap({ grid, max }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[34rem] space-y-1">
        {WEEKDAYS.map(({ index, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-muted-foreground w-8 shrink-0 text-xs">{label}</span>
            <div className="flex flex-1 gap-0.5">
              {Array.from({ length: 24 }, (_, hour) => {
                const value = grid[index]?.[hour] ?? 0
                return (
                  <div
                    key={hour}
                    title={`${label} ${formatHour(hour)} · ${value.toLocaleString()} steps`}
                    className="bg-muted/40 h-3.5 flex-1 rounded-[2px]"
                    style={
                      value
                        ? { backgroundColor: 'var(--brand)', opacity: 0.15 + 0.85 * (value / max) }
                        : undefined
                    }
                  />
                )
              })}
            </div>
          </div>
        ))}
        <div className="text-muted-foreground flex gap-0.5 pl-10 text-[0.65rem]">
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour} className="flex-1 text-center">
              {hour % 6 === 0 ? hour : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatHour(hour) {
  const period = hour < 12 ? 'AM' : 'PM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display} ${period}`
}
