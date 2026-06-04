/**
 * Gamification metrics derived from a user's daily step rows + their goal:
 * today's progress, current/best goal streaks, and earned achievements.
 *
 * `rows` is an array of { date: 'YYYY-MM-DD', steps } (IST civil dates, any order).
 */

const DAY_MS = 86400000
const IST_MS = 5.5 * 3600 * 1000

function istToday() {
  return new Date(Date.now() + IST_MS).toISOString().slice(0, 10)
}

function addDay(ymd, n = 1) {
  return new Date(new Date(ymd + 'T00:00:00Z').getTime() + n * DAY_MS).toISOString().slice(0, 10)
}

const ACHIEVEMENTS = [
  { id: 'first', name: 'First Steps', icon: '👟', test: (g) => g.total > 0 },
  { id: '10k', name: '10k Day', icon: '⚡', test: (g) => g.bestDay >= 10000 },
  { id: '15k', name: '15k Day', icon: '🚀', test: (g) => g.bestDay >= 15000 },
  { id: 'goal', name: 'Goal Hit', icon: '🎯', test: (g) => g.goalDays >= 1 },
  { id: 'streak7', name: '7-Day Streak', icon: '🔥', test: (g) => g.bestStreak >= 7 },
  { id: 'streak30', name: '30-Day Streak', icon: '🏆', test: (g) => g.bestStreak >= 30 },
  { id: 'week100k', name: '100k Week', icon: '📅', test: (g) => g.bestWeek >= 100000 },
  { id: 'half', name: '500k Club', icon: '🥈', test: (g) => g.total >= 500000 },
  { id: 'million', name: 'Million Steps', icon: '🥇', test: (g) => g.total >= 1000000 },
]

export function computeGamification(rows, goal = 10000) {
  const byDate = {}
  for (const r of rows ?? []) byDate[r.date] = r.steps ?? 0

  const todayKey = istToday()
  const today = byDate[todayKey] ?? 0
  const pct = goal ? Math.min(today / goal, 1) : 0

  const keys = Object.keys(byDate)
  let total = 0
  let bestDay = 0
  let goalDays = 0
  for (const k of keys) {
    const s = byDate[k]
    total += s
    if (s > bestDay) bestDay = s
    if (s >= goal) goalDays++
  }

  // Current streak: consecutive goal-met days ending today (or yesterday if today
  // isn't done yet, so an in-progress day doesn't break the streak).
  let currentStreak = 0
  let startOffset = today >= goal ? 0 : 1
  for (let i = startOffset; ; i++) {
    const d = new Date(Date.now() + IST_MS - i * DAY_MS).toISOString().slice(0, 10)
    if ((byDate[d] ?? 0) >= goal) currentStreak++
    else break
  }

  // Best streak + best 7-day rolling total, walking the calendar from first day.
  let bestStreak = 0
  let bestWeek = 0
  if (keys.length) {
    const start = keys.reduce((a, b) => (a < b ? a : b))
    let run = 0
    const window = []
    let windowSum = 0
    for (let d = start; d <= todayKey; d = addDay(d)) {
      const s = byDate[d] ?? 0
      run = s >= goal ? run + 1 : 0
      if (run > bestStreak) bestStreak = run
      window.push(s)
      windowSum += s
      if (window.length > 7) windowSum -= window.shift()
      if (windowSum > bestWeek) bestWeek = windowSum
    }
  }

  const g = { today, goal, pct, total, bestDay, goalDays, currentStreak, bestStreak, bestWeek }
  const achievements = ACHIEVEMENTS.map((a) => ({
    id: a.id,
    name: a.name,
    icon: a.icon,
    earned: a.test(g),
  }))

  return { ...g, achievements }
}
