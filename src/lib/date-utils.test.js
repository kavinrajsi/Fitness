import { describe, it, expect } from 'vitest'
import { isoDate, dkey, civil, addDays, civilKey, istMonthStart, istLastMonthStart, istLastMonthEnd } from './date-utils'

describe('date-utils', () => {
  it('dkey(daysAgo) equals isoDate(-daysAgo)', () => {
    expect(dkey(0)).toBe(isoDate(0))
    expect(dkey(7)).toBe(isoDate(-7))
  })

  it('dkey produces descending, valid YYYY-MM-DD strings', () => {
    expect(dkey(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(dkey(1) < dkey(0)).toBe(true)
  })

  it('civil() builds a CivilDateTime', () => {
    expect(civil('2026-06-05')).toEqual({
      date: { year: 2026, month: 6, day: 5 },
      time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 },
    })
  })

  it('addDays() crosses month and year boundaries', () => {
    expect(addDays('2026-06-05', 1)).toBe('2026-06-06')
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('civilKey() formats and guards bogus/sentinel years', () => {
    expect(civilKey({ year: 2026, month: 6, day: 5 })).toBe('2026-06-05')
    expect(civilKey({ year: 9998, month: 12, day: 31 })).toBe('9998-12-31')
    expect(civilKey({ year: 1970, month: 1, day: 1 })).toBeNull()
    expect(civilKey(undefined)).toBeNull()
  })

  it('istMonthStart() returns the 1st of a month', () => {
    expect(istMonthStart()).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('istLastMonthStart() returns the 1st of the previous month', () => {
    const start = istLastMonthStart()
    expect(start).toMatch(/^\d{4}-\d{2}-01$/)
    // The start of last month should be before the start of this month.
    expect(start < istMonthStart()).toBe(true)
  })

  it('istLastMonthEnd() returns the last day of the previous month', () => {
    const end = istLastMonthEnd()
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // The end of last month should be before the start of this month.
    expect(end < istMonthStart()).toBe(true)
    // The end of last month + 1 day should equal the start of this month.
    expect(addDays(end, 1)).toBe(istMonthStart())
  })

  it('istLastMonthStart() and istLastMonthEnd() form a coherent month range', () => {
    const start = istLastMonthStart()
    const end = istLastMonthEnd()
    // End should be >= start (they're in the same month).
    expect(end >= start).toBe(true)
    // Both should end in valid day ranges for their respective months.
    expect(start).toMatch(/^\d{4}-\d{2}-01$/)
    const dayOfEnd = parseInt(end.split('-')[2], 10)
    expect(dayOfEnd >= 28 && dayOfEnd <= 31).toBe(true)
  })
})
