import { describe, it, expect, vi, afterEach } from 'vitest'
import { sendEmail, isEmailConfigured } from './email'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('sendEmail (ZeptoMail)', () => {
  it('no-ops and returns false when not configured', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', '')
    vi.stubEnv('ZEPTOMAIL_FROM', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(isEmailConfigured()).toBe(false)
    expect(await sendEmail({ to: 'a@b.com', subject: 's', html: '<p>h</p>' })).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to the ZeptoMail API with auth header + payload when configured', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', 'abc123')
    vi.stubEnv('ZEPTOMAIL_FROM', 'noreply@kyarefitting.app')
    const fetchMock = vi.fn(async () => ({ ok: true, status: 201, text: async () => '' }))
    vi.stubGlobal('fetch', fetchMock)

    const ok = await sendEmail({ to: 'admin@x.com', subject: 'Sync failure', html: '<p>boom</p>' })
    expect(ok).toBe(true)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('zeptomail')
    expect(init.headers.Authorization).toBe('Zoho-enczapikey abc123') // bare token gets prefixed
    const body = JSON.parse(init.body)
    expect(body.from.address).toBe('noreply@kyarefitting.app')
    expect(body.to[0].email_address.address).toBe('admin@x.com')
    expect(body.subject).toBe('Sync failure')
    expect(body.htmlbody).toBe('<p>boom</p>')
  })

  it('does not double-prefix an already-prefixed token', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', 'Zoho-enczapikey xyz')
    vi.stubEnv('ZEPTOMAIL_FROM', 'noreply@kyarefitting.app')
    const fetchMock = vi.fn(async () => ({ ok: true, status: 201, text: async () => '' }))
    vi.stubGlobal('fetch', fetchMock)

    await sendEmail({ to: 'a@b.com', subject: 's', html: 'h' })
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Zoho-enczapikey xyz')
  })

  it('returns false on a non-2xx response (never throws)', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', 'k')
    vi.stubEnv('ZEPTOMAIL_FROM', 'noreply@kyarefitting.app')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, text: async () => 'bad key' })))

    expect(await sendEmail({ to: 'a@b.com', subject: 's', html: 'h' })).toBe(false)
  })
})
