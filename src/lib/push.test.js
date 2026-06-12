import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoisted handles shared with the mock factories.
const h = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(async () => {}),
  subs: [],
  deletes: [],
  recipients: [],
  logUpdate: null,
}))

vi.mock('web-push', () => ({
  default: { setVapidDetails: h.setVapidDetails, sendNotification: h.sendNotification },
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table) => {
      if (table === 'notification_log') {
        return {
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'log1' } }) }) }),
          update: (vals) => ({ eq: async () => { h.logUpdate = vals } }),
        }
      }
      if (table === 'push_subscriptions') {
        return {
          select: async () => ({ data: h.subs }),
          delete: () => ({ eq: async (_col, val) => { h.deletes.push(val) } }),
        }
      }
      if (table === 'notification_recipients') {
        return { insert: async (rows) => { h.recipients.push(...rows) } }
      }
      return {}
    },
  }),
}))

import { sendPushToAll } from './push'

afterEach(() => vi.unstubAllEnvs())
beforeEach(() => {
  h.subs.length = 0
  h.deletes.length = 0
  h.recipients.length = 0
  h.logUpdate = null
  h.sendNotification.mockReset()
  h.sendNotification.mockResolvedValue(undefined)
})

describe('sendPushToAll', () => {
  // MUST run first: the module caches a `configured` flag once VAPID keys are present.
  it('no-ops with { sent: 0 } when VAPID keys are absent', async () => {
    vi.stubEnv('VAPID_PUBLIC_KEY', '')
    vi.stubEnv('VAPID_PRIVATE_KEY', '')
    h.subs.push({ user_id: 'u1', endpoint: 'x', p256dh: 'p', auth: 'a' })

    expect(await sendPushToAll({ title: 't', body: 'b' })).toEqual({ sent: 0 })
    expect(h.sendNotification).not.toHaveBeenCalled()
  })

  it('sends to each subscription, prunes 410-gone endpoints, and tallies the log', async () => {
    vi.stubEnv('VAPID_PUBLIC_KEY', 'pub')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'priv')
    h.subs.push({ user_id: 'u1', endpoint: 'ok', p256dh: 'p', auth: 'a', device: 'd' })
    h.subs.push({ user_id: 'u2', endpoint: 'gone', p256dh: 'p', auth: 'a', device: null })
    h.sendNotification.mockImplementation(async (sub) => {
      if (sub.endpoint === 'gone') {
        const err = new Error('gone')
        err.statusCode = 410
        throw err
      }
    })

    const res = await sendPushToAll({ title: 't', body: 'b' }, { source: 'test' })
    expect(res.sent).toBe(1)
    expect(res.notificationId).toBe('log1')
    expect(h.deletes).toContain('gone') // expired subscription pruned
    expect(h.recipients).toHaveLength(2)
    expect(h.logUpdate).toEqual({ sent_count: 1, failed_count: 1 })
  })
})
