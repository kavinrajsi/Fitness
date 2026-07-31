import { describe, it, expect } from 'vitest'
import { getLeaderboard } from './fitness-data'

// A chainable Supabase stub: every builder method returns itself; awaiting it (or
// calling .rpc) resolves to { data: rows }. Enough for the single-query accessors.
function fakeService(rows) {
  const b = {
    from: () => b,
    select: () => b,
    eq: () => b,
    gte: () => b,
    lte: () => b,
    order: () => b,
    limit: () => b,
    maybeSingle: () => Promise.resolve({ data: null }),
    rpc: () => Promise.resolve({ data: rows }),
    then: (resolve, reject) => Promise.resolve({ data: rows }).then(resolve, reject),
  }
  return b
}

describe('getLeaderboard', () => {
  it('ranks rows, flags the caller, and defaults to 7d', async () => {
    const rows = [
      { id: 'a', full_name: 'A', total_steps: 100 },
      { id: 'u1', full_name: 'Me', total_steps: 50 },
    ]
    const res = await getLeaderboard(fakeService(rows), 'u1', {})
    expect(res.period).toBe('7d')
    expect(res.ranking[0]).toEqual({ rank: 1, name: 'A', totalSteps: 100, isYou: false })
    expect(res.ranking[1].isYou).toBe(true)
  })

  it('falls back to 7d for an unknown period', async () => {
    const res = await getLeaderboard(fakeService([]), 'u1', { period: 'bogus' })
    expect(res.period).toBe('7d')
  })
})
