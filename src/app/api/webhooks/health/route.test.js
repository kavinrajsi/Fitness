import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Route-handler test for the Google Health webhook — focuses on the secret gate (a public
// endpoint) and that a known user triggers a sync.
const h = vi.hoisted(() => ({
  profile: null,
  syncUserMetrics: vi.fn(async () => ({ ok: true })),
  notifyTopMovers: vi.fn(async () => {}),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.profile }) }) }) }),
  }),
}))
vi.mock('@/lib/sync-metrics', () => ({ syncUserMetrics: h.syncUserMetrics }))
vi.mock('@/lib/notify-leaderboard', () => ({ notifyTopMovers: h.notifyTopMovers }))

import { POST } from '@/app/api/webhooks/health/route'

const SECRET = 'wh-secret'
const post = (auth, body) =>
  new Request('http://localhost/api/webhooks/health', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.stubEnv('GOOGLE_HEALTH_WEBHOOK_SECRET', SECRET)
  h.profile = null
  h.syncUserMetrics.mockClear()
})
afterEach(() => vi.unstubAllEnvs())

describe('POST /api/webhooks/health', () => {
  it('answers the verification handshake 200 when authorized, 401 when not', async () => {
    expect((await POST(post(SECRET, { type: 'verification' }))).status).toBe(200)
    expect((await POST(post('wrong', { type: 'verification' }))).status).toBe(401)
  })

  it('rejects an unauthorized real notification with 401', async () => {
    const res = await POST(post('wrong', { data: { healthUserId: 'h1' } }))
    expect(res.status).toBe(401)
    expect(h.syncUserMetrics).not.toHaveBeenCalled()
  })

  it('acks 204 without syncing when the healthUserId maps to no profile', async () => {
    h.profile = null
    const res = await POST(post(SECRET, { data: { healthUserId: 'unknown' } }))
    expect(res.status).toBe(204)
    expect(h.syncUserMetrics).not.toHaveBeenCalled()
  })

  it('syncs the mapped user and acks 204 for an authorized notification', async () => {
    h.profile = { id: 'u1', google_health_user_id: 'h1' }
    const res = await POST(post(SECRET, { data: { healthUserId: 'h1' } }))
    expect(res.status).toBe(204)
    expect(h.syncUserMetrics).toHaveBeenCalledTimes(1)
  })
})
