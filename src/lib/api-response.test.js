import { describe, it, expect } from 'vitest'
import { apiJson, apiError, rateLimitHeaders, preflight } from './api-response'

describe('api-response', () => {
  it('apiJson returns the data with CORS headers and 200 by default', async () => {
    const res = apiJson({ ok: true })
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(await res.json()).toEqual({ ok: true })
  })

  it('apiJson merges custom status + headers but keeps CORS', async () => {
    const res = apiJson({ a: 1 }, { status: 201, headers: { 'X-Test': 'y' } })
    expect(res.status).toBe(201)
    expect(res.headers.get('x-test')).toBe('y')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('apiError returns the { error: { code, message } } envelope with CORS', async () => {
    const res = apiError(404, 'not_found', 'nope')
    expect(res.status).toBe(404)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(await res.json()).toEqual({ error: { code: 'not_found', message: 'nope' } })
  })

  it('apiError merges extra headers (e.g. Retry-After on 429)', () => {
    const res = apiError(429, 'rate_limited', 'slow', { 'Retry-After': '30' })
    expect(res.headers.get('retry-after')).toBe('30')
  })

  it('rateLimitHeaders maps an enforceRateLimit result to X-RateLimit-* strings', () => {
    expect(rateLimitHeaders({ limit: 120, remaining: 5, reset: 99 })).toEqual({
      'X-RateLimit-Limit': '120',
      'X-RateLimit-Remaining': '5',
      'X-RateLimit-Reset': '99',
    })
  })

  it('preflight is a 204 advertising the allowed methods', () => {
    const res = preflight()
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-methods')).toContain('OPTIONS')
  })
})
