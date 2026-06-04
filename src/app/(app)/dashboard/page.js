/**
 * Dashboard — gamified home: daily step-goal ring, streak, achievements, plus a few
 * body stats. Steps come from daily_metrics; goal from profiles.daily_step_goal.
 */
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { computeGamification } from '@/lib/gamification'
import styles from '../app.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard — KyaReFitting aa' }

const R = 52
const CIRC = 2 * Math.PI * R

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: rows }, d] = await Promise.all([
    supabase.from('profiles').select('daily_step_goal').eq('id', user.id).maybeSingle(),
    supabase.from('daily_metrics').select('date, steps').eq('user_id', user.id),
    getUserDetails(),
  ])

  const goal = profile?.daily_step_goal ?? 10000
  const game = computeGamification(rows ?? [], goal)

  const name = d?.name ?? 'there'
  const initial = (name?.[0] ?? d?.email?.[0] ?? '?').toUpperCase()

  return (
    <>
      <div className={styles.user}>
        {d?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.avatar} src={d.avatar} alt="" width={56} height={56} />
        ) : (
          <div className={styles.avatarFallback} aria-hidden="true">
            {initial}
          </div>
        )}
        <div>
          <h1 className={styles.userName}>Hi, {name}</h1>
          {d?.email && <p className={styles.userEmail}>{d.email}</p>}
        </div>
      </div>

      <div className={`${styles.card} ${styles.goalCard}`}>
        <div className={styles.ringWrap}>
          <svg viewBox="0 0 120 120" className={styles.ring} aria-hidden="true">
            <circle cx="60" cy="60" r={R} className={styles.ringTrack} />
            <circle
              cx="60"
              cy="60"
              r={R}
              className={styles.ringFill}
              transform="rotate(-90 60 60)"
              style={{ strokeDasharray: CIRC, strokeDashoffset: CIRC * (1 - game.pct) }}
            />
          </svg>
          <div className={styles.ringText}>
            <span className={styles.ringSteps}>{game.today.toLocaleString()}</span>
            <span className={styles.ringGoal}>/ {goal.toLocaleString()}</span>
            <span className={styles.ringPct}>{Math.round(game.pct * 100)}%</span>
          </div>
        </div>

        <div className={styles.streak}>
          <span className={styles.streakFlame} aria-hidden="true">🔥</span>
          <div>
            <div className={styles.streakNum}>{game.currentStreak}-day streak</div>
            <div className={styles.streakBest}>Best: {game.bestStreak} days</div>
            <div className={styles.streakHint}>Goal: {goal.toLocaleString()} steps/day</div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Achievements</h2>
        <div className={styles.achGrid}>
          {game.achievements.map((a) => (
            <div
              key={a.id}
              className={a.earned ? `${styles.ach} ${styles.achEarned}` : `${styles.ach} ${styles.achLocked}`}
              title={a.name}
            >
              <span className={styles.achIcon}>{a.earned ? a.icon : '🔒'}</span>
              <span className={styles.achName}>{a.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.stats}>
        <Stat label="Weight" value={d?.weightKg != null ? `${d.weightKg} kg` : '—'} />
        <Stat label="Height" value={d?.heightCm != null ? `${d.heightCm} cm` : '—'} />
        <Stat label="Age" value={d?.age != null ? `${d.age}` : '—'} />
      </div>

      {!d?.healthConnected && (
        <a href="/auth/google/health" className={`${styles.button} ${styles.primary} ${styles.fullWidth}`}>
          Connect Google Health
        </a>
      )}
    </>
  )
}

function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}
