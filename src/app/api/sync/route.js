/**
 * POST /api/sync — nightly Google Health sync for all users.
 *
 * Called by Vercel Cron at midnight daily. Protected by CRON_SECRET so only
 * Vercel's scheduler can trigger it (Vercel injects the secret as an Authorization
 * Bearer header automatically when using vercel.json crons).
 *
 * Per-user work lives in syncUserHealth() (src/lib/sync-user.js), shared with the
 * webhook receiver. Runs users sequentially to avoid hammering Google's API in
 * parallel; a single user failure is caught and logged without stopping the rest.
 */
import { createClient } from '@supabase/supabase-js'
import { syncUserHealth } from '@/lib/sync-user'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
}

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = serviceClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, google_access_token, google_refresh_token, google_token_expires_at, google_health_user_id')
    .not('google_refresh_token', 'is', null)

  if (error) {
    return Response.json({ error: 'db_error', detail: error.message }, { status: 500 })
  }

  const results = { ok: 0, skipped: 0, failed: 0 }

  for (const profile of profiles ?? []) {
    try {
      const result = await syncUserHealth(supabase, profile, { triggeredBy: 'cron' })
      if (result.ok) results.ok++
      else if (result.skipped) results.skipped++
      else results.failed++
    } catch (err) {
      results.failed++
      await supabase.from('sync_logs').insert({
        user_id: profile.id, triggered_by: 'cron', status: 'error',
        error: err?.message ?? 'Unexpected error',
      })
    }
  }

  return Response.json({ synced: results })
}
