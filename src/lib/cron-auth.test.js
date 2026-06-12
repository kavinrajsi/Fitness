import { describe, it, expect, afterEach, vi } from 'vitest'
import { authorizeCron } from './cron-auth'

const req = (auth) => ({ headers: { get: (key) => (key === 'authorization' ? auth : null) } })

afterEach(() => vi.unstubAllEnvs())

describe('authorizeCron', () => {
  it('500s when CRON_SECRET is not configured (fails closed)', () => {
    vi.stubEnv('CRON_SECRET', '')
    expect(authorizeCron(req('Bearer anything')).status).toBe(500)
  })

  it('401s on a wrong secret', () => {
    vi.stubEnv('CRON_SECRET', 'right')
    expect(authorizeCron(req('Bearer wrong')).status).toBe(401)
  })

  it('401s on a missing Authorization header', () => {
    vi.stubEnv('CRON_SECRET', 'right')
    expect(authorizeCron(req(null)).status).toBe(401)
  })

  it('authorizes (returns null) on the correct Bearer secret', () => {
    vi.stubEnv('CRON_SECRET', 'right')
    expect(authorizeCron(req('Bearer right'))).toBeNull()
  })
})
