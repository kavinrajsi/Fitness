/**
 * POST /api/webhooks/health — Google Health API webhook receiver.
 *
 * Google Health pushes near-real-time data-change notifications here when a
 * subscriber is registered with an AUTOMATIC policy. On each notification we map
 * healthUserId -> our user and trigger a targeted Google Health sync, keeping
 * health_daily fresh without waiting for the nightly cron or a dashboard visit.
 *
 * Auth: every request must carry the shared secret in the Authorization header,
 * matching GOOGLE_HEALTH_WEBHOOK_SECRET (the value set as endpointAuthorization.secret
 * when registering the subscriber).
 *
 * Registration sends two verification handshakes (User-Agent
 * Google-Health-API-Webhooks-Verifier, body {"type":"verification"}): one carries
 * the Authorization header and expects 200; the other omits it and expects 401/403.
 * Both fall out of checking auth first.
 *
 * Data-change notifications must be acknowledged with 204 No Content to stop retries
 * (Google retries failed deliveries with backoff for up to 7 days).
 *
 * Docs: https://developers.google.com/health/webhooks
 */
import { createClient } from '@supabase/supabase-js'
import { syncUserHealth } from '@/lib/sync-user'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

export async function POST(request) {
  const secret = process.env.GOOGLE_HEALTH_WEBHOOK_SECRET
  const authorized = !!secret && request.headers.get('authorization') === secret

  let body = null
  try { body = await request.json() } catch { /* non-JSON body */ }

  // Verification handshake — authorized probe expects 200, unauthorized expects 401.
  if (body?.type === 'verification') {
    return new Response(null, { status: authorized ? 200 : 401 })
  }

  // All real notifications must be authorized.
  if (!authorized) {
    return new Response(null, { status: 401 })
  }

  const healthUserId = body?.data?.healthUserId
  if (!healthUserId) {
    // Malformed/unknown payload — ack so Google doesn't retry for 7 days.
    return new Response(null, { status: 204 })
  }

  const supabase = serviceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, google_access_token, google_refresh_token, google_token_expires_at, google_health_user_id')
    .eq('google_health_user_id', healthUserId)
    .maybeSingle()

  if (!profile) {
    // healthUserId not captured yet (user hasn't synced since the column was added).
    // Ack; their next cron/manual sync stores it, and later notifications resolve.
    return new Response(null, { status: 204 })
  }

  try {
    await syncUserHealth(supabase, profile, { triggeredBy: 'webhook' })
  } catch (err) {
    await supabase.from('sync_logs').insert({
      user_id: profile.id, triggered_by: 'webhook', status: 'error',
      error: err?.message ?? 'Webhook sync failed',
    })
    // Still ack — retries are for delivery failures, not our processing errors;
    // we don't want a poison notification retried for 7 days.
  }

  return new Response(null, { status: 204 })
}
