import { describe, it, expect } from 'vitest'
import { buildHeatmap } from './heatmap'

const WEEKDAY_NAMES = [
  'Sundays',
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
]
const dow = (day) => new Date(day + 'T00:00:00Z').getUTCDay()

describe('buildHeatmap', () => {
  it('aggregates steps by weekday × hour and finds the peak', () => {
    const rows = [
      { day: '2026-06-01', hour: 18, steps: 1000 }, // a Monday-ish weekday, 18:00
      { day: '2026-06-08', hour: 18, steps: 500 }, // same weekday a week later, 18:00
      { day: '2026-06-06', hour: 9, steps: 2000 }, // different weekday, 09:00
    ]
    const { grid, max, has, insight } = buildHeatmap(rows)

    expect(has).toBe(true)
    expect(grid[dow('2026-06-01')][18]).toBe(1500) // same weekday-hour summed
    expect(grid[dow('2026-06-06')][9]).toBe(2000)
    expect(max).toBe(2000)
    // hour 9 total (2000) beats hour 18 (1500) → peak 9 AM; busiest weekday is 2026-06-06's.
    expect(insight).toBe(`Most active around 9 AM · busiest on ${WEEKDAY_NAMES[dow('2026-06-06')]}`)
  })

  it('returns an empty/no-data result for no rows', () => {
    const { has, max, insight } = buildHeatmap([])
    expect(has).toBe(false)
    expect(max).toBe(0)
    expect(insight).toBeNull()
  })
})
