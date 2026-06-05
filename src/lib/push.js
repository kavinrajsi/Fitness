/**
 * Web Push sender. Reads all stored subscriptions and pushes a payload to each,
 * pruning subscriptions Google/Apple report as gone (404/410).
 */
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'

let configured = false
function configure() {
  if (configured) return true
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:admin@kyarefitting.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
  configured = true
  return true
}

export async function sendPushToAll(payload) {
  if (!configure()) {
    console.error('[push] VAPID keys not configured')
    return { sent: 0 }
  }
  const service = createServiceClient()
  const { data: subscriptions } = await service
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
  if (!subscriptions?.length) return { sent: 0 }

  const body = JSON.stringify(payload)
  let sent = 0
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          body
        )
        sent++
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await service.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
        } else {
          console.error('[push] send failed:', err?.statusCode ?? err?.message ?? err)
        }
      }
    })
  )
  return { sent }
}
