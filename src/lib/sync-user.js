/**
 * Per-user Google Health sync — shared by the nightly cron (POST /api/sync) and
 * the webhook receiver (POST /api/webhooks/health).
 *
 * Steps:
 * 1. Refresh the access token if expired (Google tokens last 1 hour).
 * 2. Capture the Google Health user id (healthUserId) once, so webhook
 *    notifications can map healthUserId -> this user.
 * 3. Fetch steps, calories, active minutes, distance, sleep, and activity sessions.
 * 4. Upsert into health_daily and activity_sessions; update body metrics on profiles.
 * 5. Write a sync_logs row recording success, skip, or error.
 *
 * `triggeredBy` is recorded in sync_logs ('cron' | 'webhook' | 'manual').
 */
import {
  getHealthSummary,
  getDailySteps,
  getBodyMetrics,
  getSleepWeek,
  getActivitySessions,
  getHealthUserId,
} from '@/lib/google-data'
import { refreshGoogleToken } from '@/lib/google-auth'
import { istIsoDate } from '@/lib/utils'

export async function syncUserHealth(supabase, profile, { triggeredBy = 'cron' } = {}) {
  const tokenExpired =
    !profile.google_token_expires_at ||
    new Date(profile.google_token_expires_at) <= new Date()

  let accessToken = profile.google_access_token

  if (tokenExpired) {
    if (!profile.google_refresh_token) {
      await supabase.from('sync_logs').insert({
        user_id: profile.id, triggered_by: triggeredBy, status: 'skipped',
        error: 'No refresh token',
      })
      return { skipped: true }
    }
    const refreshed = await refreshGoogleToken(profile.google_refresh_token)
    if (!refreshed) {
      await supabase.from('sync_logs').insert({
        user_id: profile.id, triggered_by: triggeredBy, status: 'error',
        error: 'Token refresh failed — refresh token may be revoked',
      })
      return { error: 'token_refresh_failed' }
    }
    accessToken = refreshed.access_token
    const expiresAt = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString()
    await supabase.from('profiles').update({
      google_access_token: accessToken,
      google_token_expires_at: expiresAt,
    }).eq('id', profile.id)
  }

  // Capture the Google Health user id once so webhook notifications resolve to this user.
  if (!profile.google_health_user_id) {
    const healthUserId = await getHealthUserId(accessToken)
    if (healthUserId) {
      await supabase.from('profiles').update({ google_health_user_id: healthUserId }).eq('id', profile.id)
    }
  }

  const today = istIsoDate(0)

  const [health, dailySteps, body, sleepWeek, activities] = await Promise.all([
    getHealthSummary(accessToken),
    getDailySteps(accessToken),
    getBodyMetrics(accessToken),
    getSleepWeek(accessToken),
    getActivitySessions(accessToken, 7),
  ])

  const historicalRows = (dailySteps || [])
    .filter(d => d.isoDate && d.isoDate !== today)
    .map(d => ({
      user_id: profile.id,
      date: d.isoDate,
      steps: d.steps,
      calories: d.calories ?? 0,
      active_minutes: d.activeMinutes ?? null,
      distance_km: d.distanceKm ?? null,
      sleep_minutes: sleepWeek[d.isoDate]?.minutes ?? null,
      avg_heart_rate: null,
      synced_at: new Date().toISOString(),
    }))

  if (historicalRows.length > 0) {
    await supabase.from('health_daily').upsert(historicalRows, { onConflict: 'user_id,date' })
  }

  if (health) {
    await supabase.from('health_daily').upsert({
      user_id: profile.id,
      date: today,
      steps: health.stepsToday,
      calories: health.caloriesToday,
      active_minutes: health.activeMinutesToday,
      distance_km: health.distanceKm,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
  }

  if (activities?.length > 0) {
    const sessionRows = activities.map(a => ({
      id: a.id,
      user_id: profile.id,
      name: a.name,
      icon: a.icon,
      activity_type: a.activityType,
      start_time: new Date(a.startMs).toISOString(),
      end_time: new Date(a.endMs).toISOString(),
      duration_min: a.durationMin,
      steps: a.steps,
      synced_at: new Date().toISOString(),
    }))
    await supabase.from('activity_sessions').upsert(sessionRows, { onConflict: 'id,user_id' })
  }

  const bodyUpdate = {}
  if (body?.weightKg != null) bodyUpdate.weight_kg = body.weightKg
  if (body?.heightCm != null) bodyUpdate.height_cm = body.heightCm
  if (Object.keys(bodyUpdate).length > 0) {
    await supabase.from('profiles').update(bodyUpdate).eq('id', profile.id)
  }

  await supabase.from('sync_logs').insert({
    user_id: profile.id,
    triggered_by: triggeredBy,
    status: 'success',
    steps_today: health?.stepsToday ?? 0,
    days_written: historicalRows.length + (health ? 1 : 0),
  })

  return { ok: true }
}
