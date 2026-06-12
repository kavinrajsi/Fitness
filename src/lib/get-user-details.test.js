import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared mock handles (hoisted so the vi.mock factory can reference them).
const h = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: h.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: h.maybeSingle }) }),
      upsert: async () => ({}),
      update: () => ({ eq: async () => ({}) }),
    }),
  }),
}))
// Google integrations are isolated — the "fresh cache" path below never calls them.
vi.mock('@/lib/google-auth', () => ({
  getValidAccessToken: vi.fn(async () => null),
  getValidHealthAccessToken: vi.fn(async () => null),
}))
vi.mock('@/lib/google-health', () => ({ getBodyMetrics: vi.fn(), getHealthProfile: vi.fn() }))
vi.mock('@/lib/google-people', () => ({ getPeopleDetails: vi.fn() }))

import { getUserDetails } from './get-user-details'

beforeEach(() => {
  h.getUser.mockReset()
  h.maybeSingle.mockReset()
})

describe('getUserDetails', () => {
  it('returns null when nobody is signed in', async () => {
    h.getUser.mockResolvedValue({ data: { user: null } })
    expect(await getUserDetails()).toBeNull()
  })

  it('maps identity + derives BMI/category from a fresh-cached profile (no Google calls)', async () => {
    h.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com', user_metadata: { full_name: 'Jo', avatar_url: 'img' } } },
    })
    h.maybeSingle.mockResolvedValue({
      data: {
        id: 'u1',
        height_cm: 180,
        weight_kg: 81, // 81 / 1.8^2 = 25.0
        age: 30,
        gender: 'male',
        birthday: '1996-01-01',
        details_synced_at: new Date().toISOString(), // fresh → skips the Google refresh
        google_health_refresh_token: 'rt',
      },
    })

    const r = await getUserDetails()
    expect(r.name).toBe('Jo')
    expect(r.email).toBe('a@b.com')
    expect(r.avatar).toBe('img')
    expect(r.bmi).toBe(25)
    expect(r.bmiCategory).toBe('Overweight') // 25 is not < 25
    expect(r.healthConnected).toBe(true)
  })

  it('returns null BMI when height/weight are missing', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com', user_metadata: {} } } })
    h.maybeSingle.mockResolvedValue({
      data: { id: 'u1', details_synced_at: new Date().toISOString() },
    })

    const r = await getUserDetails()
    expect(r.bmi).toBeNull()
    expect(r.bmiCategory).toBeNull()
    expect(r.healthConnected).toBe(false)
  })
})
