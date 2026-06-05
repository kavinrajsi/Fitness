/**
 * Shared per-user Google Health → daily_metrics sync, used by the daily cron, the
 * manual Sync button, and the webhook receiver.
 *
 * Requires a service-role Supabase client (writes bypass RLS) and a profile row with
 * the google_health_* token columns. Captures the user's healthUserId once (for
 * webhook mapping). `onStep` is an optional progress callback for the streaming UI.
 */
import { getValidHealthAccessToken } from '@/lib/google-auth'
import { getDailyMetrics, getHealthUserId, getWorkouts } from '@/lib/google-health'

export async function syncUserMetrics(service, profile, { days = 90, onStep } = {}) {
  const step = (s) => onStep?.(s)

  step('Refreshing the Google Health access token')
  const token = await getValidHealthAccessToken(profile, service)
  if (!token) return { ok: false, reason: 'no_token', rows: 0, metrics: [] }

  // Capture the stable healthUserId once so webhook notifications can map to this user.
  if (!profile.google_health_user_id) {
    const healthUserId = await getHealthUserId(token)
    if (healthUserId) {
      await service.from('profiles').update({ google_health_user_id: healthUserId }).eq('id', profile.id)
    }
  }

  step('Fetching steps, calories, distance & heart rate')
  const metrics = await getDailyMetrics(token, days)

  step(`Saving ${metrics.length} days to the database`)
  if (metrics.length) {
    const now = new Date().toISOString()
    const { error } = await service
      .from('daily_metrics')
      .upsert(
        metrics.map((m) => ({ user_id: profile.id, ...m, updated_at: now })),
        { onConflict: 'user_id,date' }
      )
    if (error) return { ok: false, reason: 'upsert_error', rows: 0, metrics }
  }

  // Workout sessions → workouts table (dedup on the source data-point id).
  step('Fetching workouts')
  const workouts = await getWorkouts(token, days)
  if (workouts.length) {
    const now = new Date().toISOString()
    await service
      .from('workouts')
      .upsert(
        workouts.map((w) => ({ user_id: profile.id, ...w, updated_at: now })),
        { onConflict: 'user_id,source_id' }
      )
  }

  return { ok: true, rows: metrics.length, metrics, workouts: workouts.length }
}
