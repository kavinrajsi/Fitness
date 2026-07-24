'use server'

/**
 * Admin-only Server Actions. Unlike the other actions (own-row, scoped to the signed-in
 * user), these reach across users and MUST re-check ADMIN_EMAIL server-side — the page
 * gate that hides the UI does not protect the action itself.
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ADMIN_EMAIL } from '@/lib/constants'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Fully delete a user: the auth.users row plus all their data. Every public user table
 * FKs to auth.users with ON DELETE CASCADE, so `auth.admin.deleteUser` cascades
 * profiles / daily_metrics / steps_* / workouts / api_tokens / push_subscriptions /
 * leaderboard_snapshot / oauth_* automatically. Only `notification_recipients` (no FK)
 * is cleared explicitly. useActionState-compatible: returns { ok } or { error }.
 */
export async function deleteUser(_prevState, formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) return { error: 'Forbidden' }

  const userId = formData.get('userId')?.toString()
  if (!userId || !UUID_RE.test(userId)) return { error: 'Invalid user id.' }
  if (userId === user.id) return { error: "You can't delete your own account." }

  const service = createServiceClient()
  // notification_recipients has a user_id but no cascading FK — clear it first.
  await service.from('notification_recipients').delete().eq('user_id', userId)

  const { error } = await service.auth.admin.deleteUser(userId)
  if (error) return { error: 'Could not delete the user.' }

  revalidatePath('/admin')
  return { ok: true }
}
