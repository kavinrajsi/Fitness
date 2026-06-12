import { describe, it, expect, vi } from 'vitest'
import { generateToken, hashToken, lastFour, resolveToken } from './api-tokens'

// Fake service: select→eq→is→maybeSingle yields a preset row; update→eq is a no-op promise.
function fakeService({ row = null, error = null } = {}) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: row, error }) }) }),
      }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  }
}

describe('token primitives', () => {
  it('generateToken is kref_-prefixed; hashToken is stable sha256 hex; lastFour takes the tail', () => {
    expect(generateToken().startsWith('kref_')).toBe(true)
    expect(hashToken('abc')).toBe(hashToken('abc'))
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken('abc')).not.toBe(hashToken('abd'))
    expect(lastFour('kref_wxyzABCD')).toBe('ABCD')
  })
})

describe('resolveToken', () => {
  it('returns null for missing or wrong-prefix tokens (no DB hit)', async () => {
    expect(await resolveToken(fakeService(), null)).toBeNull()
    expect(await resolveToken(fakeService(), 'nope_123')).toBeNull()
  })

  it('resolves a valid token, defaulting scopes to ["read"]', async () => {
    const r = await resolveToken(fakeService({ row: { id: 't1', user_id: 'u1', scopes: null } }), 'kref_abc')
    expect(r).toEqual({ userId: 'u1', scopes: ['read'] })
  })

  it('returns the granted scopes when present', async () => {
    const r = await resolveToken(
      fakeService({ row: { id: 't1', user_id: 'u1', scopes: ['read', 'write'] } }),
      'kref_abc'
    )
    expect(r.scopes).toEqual(['read', 'write'])
  })

  it('returns null on a DB error or no matching (non-revoked) row', async () => {
    expect(await resolveToken(fakeService({ error: { message: 'x' } }), 'kref_abc')).toBeNull()
    expect(await resolveToken(fakeService({ row: null }), 'kref_abc')).toBeNull()
  })
})
