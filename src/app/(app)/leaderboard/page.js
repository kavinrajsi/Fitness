/**
 * /leaderboard — ranks all users and shows each one's steps for Today, the last 7
 * days, and the last 30 days side by side. Ranked by the 7-day total.
 *
 * daily_metrics + profiles are RLS "own-row only", so the ranking is built with the
 * service-role client server-side. Only leaderboard-safe fields are surfaced
 * (display name, avatar, step totals) — never emails or tokens.
 */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import styles from '../app.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Leaderboard — KyaReFitting aa' }

// Compact for readability on a phone: 5,028 stays full; 37,168 → 37.2K.
function fmt(n) {
  return n >= 10000
    ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : n.toLocaleString()
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const service = createServiceClient()
  const istNow = Date.now() + 5.5 * 3600 * 1000
  const day = (offset) => new Date(istNow - offset * 86400000).toISOString().slice(0, 10)
  const today = day(0)
  const since7 = day(6)
  const since30 = day(29)

  const [{ data: metrics }, { data: profiles }] = await Promise.all([
    service.from('daily_metrics').select('user_id, date, steps').gte('date', since30),
    service.from('profiles').select('id, full_name, avatar_url'),
  ])

  const agg = {}
  for (const m of metrics ?? []) {
    const a = (agg[m.user_id] ??= { today: 0, d7: 0, d30: 0 })
    const steps = m.steps ?? 0
    a.d30 += steps
    if (m.date >= since7) a.d7 += steps
    if (m.date === today) a.today += steps
  }

  const ranked = (profiles ?? [])
    .map((p) => ({
      id: p.id,
      name: p.full_name ?? 'Anonymous',
      avatar: p.avatar_url,
      ...(agg[p.id] ?? { today: 0, d7: 0, d30: 0 }),
    }))
    .sort((a, b) => b.d7 - a.d7 || b.d30 - a.d30)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  const shown = ranked.filter((r) => r.d30 > 0 || r.id === user.id)
  const anyData = ranked.some((r) => r.d30 > 0)

  return (
    <>
      <h1 className={styles.pageTitle}>Leaderboard</h1>
      <p className={styles.pageSub}>Steps · ranked by last 7 days</p>

      {!anyData ? (
        <p className={styles.note}>No steps on the leaderboard yet — sync to get on the board.</p>
      ) : (
        <div className={styles.card}>
          <div className={styles.lbHead}>
            <span />
            <span />
            <span />
            <span className={styles.lbCol}>Today</span>
            <span className={styles.lbCol}>7d</span>
            <span className={styles.lbCol}>30d</span>
          </div>
          <ul className={styles.rows}>
            {shown.map((r) => (
              <li
                key={r.id}
                className={r.id === user.id ? `${styles.lbRow} ${styles.lbMe}` : styles.lbRow}
              >
                <span className={styles.lbRank}>{r.rank}</span>
                {r.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.lbAvatar} src={r.avatar} alt="" width={32} height={32} />
                ) : (
                  <span className={styles.lbAvatarFallback} aria-hidden="true">
                    {(r.name?.[0] ?? '?').toUpperCase()}
                  </span>
                )}
                <span className={styles.lbName}>
                  {r.name}
                  {r.id === user.id && <span className={styles.lbYou}> (you)</span>}
                </span>
                <span className={styles.lbNum}>{fmt(r.today)}</span>
                <span className={styles.lbNum}>{fmt(r.d7)}</span>
                <span className={styles.lbNum}>{fmt(r.d30)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
