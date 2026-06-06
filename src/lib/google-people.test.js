import { describe, it, expect, vi, afterEach } from 'vitest'
import { getPeopleDetails } from './google-people'

const jsonResponse = (obj) => ({ ok: true, json: async () => obj })
const notOk = () => ({ ok: false, json: async () => ({}) })

afterEach(() => vi.unstubAllGlobals())

describe('getPeopleDetails', () => {
  it('prefers the birthday with a year and reads the gender', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          birthdays: [
            { date: { month: 5, day: 12 } }, // profile entry, no year
            { date: { year: 1995, month: 5, day: 12 } }, // account entry, full date
          ],
          genders: [{ value: 'male', formattedValue: 'Male' }],
        })
      )
    )
    expect(await getPeopleDetails('token')).toEqual({ birthday: '1995-05-12', gender: 'Male' })
  })

  it('falls back to 1900 when only month/day are present, and tolerates missing genders', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ birthdays: [{ date: { month: 1, day: 9 } }] })))
    expect(await getPeopleDetails('token')).toEqual({ birthday: '1900-01-09', gender: null })
  })

  it('returns null fields on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => notOk()))
    expect(await getPeopleDetails('token')).toEqual({ birthday: null, gender: null })
  })
})
