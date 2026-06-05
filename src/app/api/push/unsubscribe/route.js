/** POST /api/push/unsubscribe — remove the user's Web Push subscription by endpoint. */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { endpoint } = (await request.json().catch(() => ({}))) ?? {}
  if (!endpoint) return new Response('Bad Request', { status: 400 })

  const service = createServiceClient()
  await service
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', user.id)

  return new Response(null, { status: 204 })
}
