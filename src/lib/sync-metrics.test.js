import { describe, it, expect, vi, beforeEach } from 'vitest'

// Token always resolves; isolate the sync logic from real Google Health calls.
vi.mock('@/lib/google-auth', () => ({ getValidHealthAccessToken: vi.fn(async () => 'token') }))
vi.mock('@/lib/google-health', () => ({
  getDailyMetrics: vi.fn(),
  getHealthUserId: vi.fn(async () => null),
  getWorkouts: vi.fn(async () => []),
  getStepHistory: vi.fn(async () => []),
  getStepSamples: vi.fn(async () => []),
  hourlyFromSamples: vi.fn(() => []),
}))

import { syncUserMetrics } from '@/lib/sync-metrics'
import { getDailyMetrics } from '@/lib/google-health'

// Minimal service-client double: captures whatever daily_metrics rows get upserted.
function makeService(captured) {
  return {
    from: (table) => ({
      upsert: (rows) => {
        if (table === 'daily_metrics') captured.daily = rows
        return { error: null }
      },
      update: () => ({ eq: () => ({ error: null }) }),
    }),
  }
}

// Has a captured health user id already, so getHealthUserId is skipped.
const profile = { id: 'u1', google_health_user_id: 'h1', google_health_refresh_token: 'r' }

describe('syncUserMetrics — daily_metrics upsert payload', () => {
  beforeEach(() => {
    getDailyMetrics.mockReset()
  })

  it('upserts a row without `steps` when getDailyMetrics dropped it (preserving the stored value)', async () => {
    getDailyMetrics.mockResolvedValue([{ date: '2026-06-05', hr_avg: 100 }]) // steps omitted upstream
    const captured = {}

    const result = await syncUserMetrics(makeService(captured), profile, { days: 7 })

    expect(result.ok).toBe(true)
    expect(captured.daily).toHaveLength(1)
    expect('steps' in captured.daily[0]).toBe(false)
    expect(captured.daily[0]).toMatchObject({ user_id: 'u1', date: '2026-06-05', hr_avg: 100 })
  })

  it('upserts `steps` when getDailyMetrics returned it', async () => {
    getDailyMetrics.mockResolvedValue([{ date: '2026-06-05', steps: 8000 }])
    const captured = {}

    await syncUserMetrics(makeService(captured), profile, { days: 7 })

    expect(captured.daily[0].steps).toBe(8000)
  })
})
