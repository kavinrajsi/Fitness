/**
 * /profile — account details (from Google sign-in + Google Health + People), manual
 * height/weight entry, and Connect Google Health.
 */
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { signOut } from '../../actions/auth'
import { saveStepGoal } from '../../actions/goal'
import styles from '../app.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Profile — KyaReFitting aa' }

export default async function ProfilePage({ searchParams }) {
  const { health } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_step_goal')
    .eq('id', user.id)
    .maybeSingle()
  const goal = profile?.daily_step_goal ?? 10000

  const d = await getUserDetails()
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
          <h1 className={styles.userName}>{name}</h1>
          {d?.email && <p className={styles.userEmail}>{d.email}</p>}
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Details</h2>
        <Detail label="Height" value={d?.heightCm != null ? `${d.heightCm} cm` : null} />
        <Detail label="Weight" value={d?.weightKg != null ? `${d.weightKg} kg` : null} />
        <Detail label="BMI" value={d?.bmi != null ? `${d.bmi} (${d.bmiCategory})` : null} />
        <Detail label="Age" value={d?.age != null ? `${d.age}` : null} />
        <Detail label="Gender" value={d?.gender} />
        <Detail label="Birthday" value={d?.birthday} />
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Google Health</h2>
        {health === 'connected' && <p className={styles.hint}>Google Health connected.</p>}
        {health === 'connect_failed' && (
          <p className={styles.hint}>Couldn&apos;t connect Google Health — please try again.</p>
        )}
        <a href="/auth/google/health" className={`${styles.button} ${styles.fullWidth}`}>
          {d?.healthConnected ? 'Reconnect Google Health' : 'Connect Google Health'}
        </a>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Daily step goal</h2>
        <form action={saveStepGoal} className={styles.form}>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span>Goal (steps/day)</span>
              <input
                className={styles.input}
                type="number"
                name="daily_step_goal"
                step="500"
                min="1000"
                max="100000"
                defaultValue={goal}
              />
            </label>
          </div>
          <button type="submit" className={`${styles.button} ${styles.primary} ${styles.fullWidth}`}>
            Save goal
          </button>
        </form>
      </div>

      <form action={signOut}>
        <button type="submit" className={`${styles.button} ${styles.fullWidth}`}>
          Sign out
        </button>
      </form>
    </>
  )
}

function Detail({ label, value }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value ?? '—'}</span>
    </div>
  )
}
