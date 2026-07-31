/**
 * IST (UTC+5:30) date helpers. The server runs UTC; readings are attributed to the
 * IST calendar date they were recorded against. Centralized here so the dashboard,
 * leaderboard, gamification, and Google Health client all agree.
 */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

// YYYY-MM-DD for today shifted by offsetDays (negative = past).
export function isoDate(offsetDays = 0) {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  if (offsetDays) ist.setUTCDate(ist.getUTCDate() + offsetDays)
  return ist.toISOString().slice(0, 10)
}

// YYYY-MM-DD for `daysAgo` days before today (IST). dkey(0) = today.
export function dkey(daysAgo = 0) {
  return isoDate(-daysAgo)
}

// CivilDateTime object for a YYYY-MM-DD (Google Health dailyRollUp range).
export function civil(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return {
    date: { year, month, day },
    time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 },
  }
}

// Add n days to a YYYY-MM-DD string (UTC-safe).
export function addDays(dateStr, n) {
  const date = new Date(dateStr + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + n)
  return date.toISOString().slice(0, 10)
}

// YYYY-MM-DD from a Google Health civil { year, month, day }, guarding bogus years.
export function civilKey(date) {
  return date?.year && Number(date.year) >= 2000
    ? `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
    : null
}

// True for a real YYYY-MM-DD calendar date (rejects shapes like 2026-02-31).
export function isDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

// Longest custom window we'll hand to leaderboard_between(), in days (inclusive).
export const MAX_RANGE_DAYS = 366

/**
 * Normalize a user-supplied [from, to] pair into a safe inclusive IST window:
 * swaps a reversed pair, clamps the end at today, and caps the span at
 * MAX_RANGE_DAYS. Returns null unless both dates are real YYYY-MM-DD values.
 */
export function clampRange(from, to) {
  if (!isDateKey(from) || !isDateKey(to)) return null
  let [since, until] = from <= to ? [from, to] : [to, from]

  const today = dkey(0)
  if (until > today) until = today
  if (since > until) since = until

  const span = Math.round(
    (new Date(until + 'T00:00:00Z') - new Date(since + 'T00:00:00Z')) / 86400000
  )
  if (span >= MAX_RANGE_DAYS) since = addDays(until, -(MAX_RANGE_DAYS - 1))

  return { since, until }
}

// YYYY-MM-DD of the first day of the current IST calendar month.
export function istMonthStart() {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-01`
}

// YYYY-MM-DD of the first day of the previous IST calendar month.
export function istLastMonthStart() {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  const year = ist.getUTCFullYear()
  const month = ist.getUTCMonth() // 0-11; January is 0
  // Going back one month: if current is Jan (0), new month is 11 (Dec of prior year).
  // JS Date normalizes automatically when we set a month < 0.
  const lastMonth = new Date(Date.UTC(year, month - 1, 1))
  return `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, '0')}-01`
}

// YYYY-MM-DD of the last day of the previous IST calendar month.
export function istLastMonthEnd() {
  return addDays(istMonthStart(), -1)
}
