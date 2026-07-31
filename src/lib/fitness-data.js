/**
 * Shared read accessors for fitness data.
 *
 * Takes the service-role client + a userId and returns plain JSON-serialisable data.
 * Only the cross-user leaderboard lives here now — it's read by the push helpers in
 * `@/lib/notify-leaderboard`.
 */
import { dkey, istMonthStart } from '@/lib/date-utils'

// Leaderboard windows, expressed as an inclusive [since, until] IST date range so the
// cross-user RPC matches the /leaderboard page exactly.
const PERIODS = {
  today: () => ({ since: dkey(0), until: dkey(0) }),
  yesterday: () => ({ since: dkey(1), until: dkey(1) }),
  '7d': () => ({ since: dkey(6), until: dkey(0) }),
  month: () => ({ since: istMonthStart(), until: dkey(0) }),
}

/**
 * Cross-user step leaderboard for a period (today/yesterday/7d/month, default 7d).
 * Returns only leaderboard-safe fields; the requesting user's row is flagged isYou.
 */
export async function getLeaderboard(service, userId, { period } = {}) {
  const key = PERIODS[period] ? period : '7d'
  const { since, until } = PERIODS[key]()
  const { data } = await service.rpc('leaderboard_between', {
    since_date: since,
    until_date: until,
  })
  const ranking = (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.full_name,
    totalSteps: row.total_steps,
    isYou: row.id === userId,
  }))
  return { period: key, since, until, ranking }
}
