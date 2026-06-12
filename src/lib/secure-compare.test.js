import { describe, it, expect } from 'vitest'
import { safeEqual } from './secure-compare'

describe('safeEqual', () => {
  it('returns true for identical strings', () => {
    expect(safeEqual('Bearer s3cret', 'Bearer s3cret')).toBe(true)
  })
  it('returns false for different strings', () => {
    expect(safeEqual('Bearer s3cret', 'Bearer wrong')).toBe(false)
  })
  it('returns false for different-length strings (no throw)', () => {
    expect(safeEqual('short', 'a-much-longer-secret-value')).toBe(false)
  })
  it('returns false for nullish / non-string inputs', () => {
    expect(safeEqual(null, 'x')).toBe(false)
    expect(safeEqual('x', undefined)).toBe(false)
    expect(safeEqual('', '')).toBe(true) // two empty strings are equal
  })
})
