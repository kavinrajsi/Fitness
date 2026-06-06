/**
 * Aggregate steps_hourly rows ({ day: 'YYYY-MM-DD', hour, steps }) into a
 * weekday(0=Sun) × hour grid of summed steps, plus a "most active time" insight.
 */
const WEEKDAY_NAMES = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
]

export function buildHeatmap(rows) {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0))
  const byHour = new Array(24).fill(0)
  const byWeekday = new Array(7).fill(0)
  let max = 0

  for (const row of rows ?? []) {
    const weekday = new Date(row.day + 'T00:00:00Z').getUTCDay()
    const steps = row.steps ?? 0
    grid[weekday][row.hour] += steps
    byHour[row.hour] += steps
    byWeekday[weekday] += steps
    if (grid[weekday][row.hour] > max) max = grid[weekday][row.hour]
  }

  const has = max > 0
  const peakHour = byHour.indexOf(Math.max(...byHour))
  const peakWeekday = byWeekday.indexOf(Math.max(...byWeekday))
  const peakHourLabel = `${peakHour % 12 === 0 ? 12 : peakHour % 12} ${peakHour < 12 ? 'AM' : 'PM'}`
  const insight = has
    ? `Most active around ${peakHourLabel} · busiest on ${WEEKDAY_NAMES[peakWeekday]}`
    : null

  return { grid, max, has, insight }
}
