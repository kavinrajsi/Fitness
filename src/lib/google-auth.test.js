import { describe, it, expect, vi, afterEach } from 'vitest'
import { refreshGoogleToken, getValidHealthAccessToken } from './google-auth'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

// Fake Supabase client capturing the persisted token update.
function fakeClient() {
  const eq = vi.fn(() => Promise.resolve({ error: null }))
  const update = vi.fn(() => ({ eq }))
  return { _update: update, from: () => ({ update }) }
}

describe('refreshGoogleToken', () => {
  it('returns the token payload on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ access_token: 'a', expires_in: 3600 }) })))
    expect((await refreshGoogleToken('rt')).access_token).toBe('a')
  })

  it('returns null on a non-ok response (e.g. invalid_grant)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400, text: async () => 'invalid_grant' })))
    expect(await refreshGoogleToken('rt')).toBeNull()
  })

  it('returns null when the payload has no access_token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
    expect(await refreshGoogleToken('rt')).toBeNull()
  })
})

describe('getValidHealthAccessToken', () => {
  it('returns the cached token without a network call when not expired', async () => {
    const future = new Date(Date.now() + 3600_000).toISOString()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const profile = { id: 'u1', google_health_access_token: 'cached', google_health_token_expires_at: future }
    expect(await getValidHealthAccessToken(profile, fakeClient())).toBe('cached')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null when expired and there is no refresh token', async () => {
    const profile = {
      id: 'u1',
      google_health_access_token: 'old',
      google_health_token_expires_at: new Date(0).toISOString(),
    }
    expect(await getValidHealthAccessToken(profile, fakeClient())).toBeNull()
  })

  it('refreshes, persists, and returns the new token when expired', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ access_token: 'fresh', expires_in: 3600 }) })))
    const profile = {
      id: 'u1',
      google_health_refresh_token: 'rt',
      google_health_token_expires_at: new Date(0).toISOString(),
    }
    const client = fakeClient()
    expect(await getValidHealthAccessToken(profile, client)).toBe('fresh')
    expect(client._update).toHaveBeenCalledWith(
      expect.objectContaining({ google_health_access_token: 'fresh' })
    )
  })

  it('returns null when the refresh token is dead', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400, text: async () => 'invalid_grant' })))
    const profile = {
      id: 'u1',
      google_health_refresh_token: 'dead',
      google_health_token_expires_at: new Date(0).toISOString(),
    }
    expect(await getValidHealthAccessToken(profile, fakeClient())).toBeNull()
  })
})
