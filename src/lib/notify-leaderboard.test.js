import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  sendPushToAll: vi.fn(async () => ({ sent: 3, notificationId: 'n1' })),
  getLeaderboard: vi.fn(),
}))
vi.mock('@/lib/push', () => ({ sendPushToAll: h.sendPushToAll }))
vi.mock('@/lib/fitness-data', () => ({ getLeaderboard: h.getLeaderboard }))

import { notifyLeaderboardTop, notifyTopMovers } from './notify-leaderboard'

// Fake service for notifyTopMovers: rpc → ranking; snapshot select→in → snapshots; upsert spy.
function fakeService({ ranking = [], snapshots = [] } = {}) {
  const upsert = vi.fn(async () => ({}))
  return {
    _upsert: upsert,
    rpc: vi.fn(async () => ({ data: ranking })),
    from: () => ({
      select: () => ({ in: async () => ({ data: snapshots }) }),
      upsert,
    }),
  }
}

beforeEach(() => {
  h.sendPushToAll.mockClear()
  h.sendPushToAll.mockResolvedValue({ sent: 3, notificationId: 'n1' })
  h.getLeaderboard.mockReset()
})

describe('notifyLeaderboardTop', () => {
  it('broadcasts only the top 3 for the period and returns the resolved period', async () => {
    h.getLeaderboard.mockResolvedValue({
      ranking: [
        { rank: 1, name: 'A', totalSteps: 1000 },
        { rank: 2, name: 'B', totalSteps: 900 },
        { rank: 3, name: 'C', totalSteps: 800 },
        { rank: 4, name: 'D', totalSteps: 700 },
      ],
    })
    const res = await notifyLeaderboardTop({}, { period: 'yesterday' })
    expect(res.period).toBe('yesterday')
    const [payload, opts] = h.sendPushToAll.mock.calls[0]
    expect(payload.title).toContain('Yesterday')
    expect(payload.body.split('\n')).toHaveLength(3)
    expect(payload.body).toContain('A')
    expect(payload.body).not.toContain('D')
    expect(opts.source).toBe('leaderboard-yesterday')
  })

  it('still sends an encouraging message on an empty board', async () => {
    h.getLeaderboard.mockResolvedValue({ ranking: [] })
    const res = await notifyLeaderboardTop({}, { period: 'today' })
    expect(res.period).toBe('today')
    const [payload] = h.sendPushToAll.mock.calls[0]
    expect(payload.title).toContain('Today')
    expect(payload.body).toMatch(/get moving/i)
  })
})

describe('notifyTopMovers', () => {
  it('pushes a "gained N steps" alert when a mover clears the threshold, then upserts the snapshot', async () => {
    const service = fakeService({
      ranking: [{ id: 'u1', full_name: 'A', total_steps: 5000 }],
      snapshots: [{ user_id: 'u1', steps_7d: 4000 }],
    })
    await notifyTopMovers(service)
    expect(h.sendPushToAll).toHaveBeenCalledTimes(1)
    expect(h.sendPushToAll.mock.calls[0][0].body).toContain('1,000') // the delta
    expect(service._upsert).toHaveBeenCalled()
  })

  it('does not push for sub-threshold gains but still refreshes the baseline', async () => {
    const service = fakeService({
      ranking: [{ id: 'u1', full_name: 'A', total_steps: 4050 }],
      snapshots: [{ user_id: 'u1', steps_7d: 4000 }], // +50 < 100
    })
    await notifyTopMovers(service)
    expect(h.sendPushToAll).not.toHaveBeenCalled()
    expect(service._upsert).toHaveBeenCalled()
  })

  it('with push:false refreshes the baseline silently (no push) even on a big gain', async () => {
    const service = fakeService({
      ranking: [{ id: 'u1', full_name: 'A', total_steps: 9000 }],
      snapshots: [{ user_id: 'u1', steps_7d: 1000 }],
    })
    await notifyTopMovers(service, { push: false })
    expect(h.sendPushToAll).not.toHaveBeenCalled()
    expect(service._upsert).toHaveBeenCalled()
  })

  it('returns early (no upsert) when the board is empty', async () => {
    const service = fakeService({ ranking: [] })
    await notifyTopMovers(service)
    expect(service._upsert).not.toHaveBeenCalled()
  })
})
