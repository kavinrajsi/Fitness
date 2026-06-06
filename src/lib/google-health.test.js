import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getDailyMetrics,
  getWorkouts,
  getStepSamples,
  hourlyFromSamples,
  getBodyMetrics,
  getHealthProfile,
  getHealthUserId,
  getDailySteps,
} from './google-health'

const jsonResponse = (obj) => ({ ok: true, status: 200, json: async () => obj, text: async () => JSON.stringify(obj) })
const notOk = (status = 404) => ({ ok: false, status, json: async () => ({}), text: async () => '' })

// Routes Google Health requests to fixtures by data type + endpoint (rollup vs list).
function router({ rollup = {}, list = {}, profile, identity } = {}) {
  return vi.fn(async (url) => {
    if (url.includes('/users/me/profile')) return profile != null ? jsonResponse(profile) : notOk()
    if (url.includes('/users/me/identity')) return identity != null ? jsonResponse(identity) : notOk()
    const type = url.match(/\/dataTypes\/([^/?:]+)\/dataPoints/)?.[1]
    if (url.includes(':dailyRollUp')) return type in rollup ? jsonResponse(rollup[type]) : notOk()
    return type in list ? jsonResponse(list[type]) : notOk()
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('hourlyFromSamples', () => {
  it('sums per (day, hour) and skips null-day rows', () => {
    const out = hourlyFromSamples([
      { day: '2026-06-05', hour: 9, count: 100 },
      { day: '2026-06-05', hour: 9, count: 50 },
      { day: '2026-06-05', hour: 10, count: 20 },
      { day: null, hour: 9, count: 999 },
    ])
    expect(out).toContainEqual({ day: '2026-06-05', hour: 9, steps: 150 })
    expect(out).toContainEqual({ day: '2026-06-05', hour: 10, steps: 20 })
    expect(out.some((bucket) => bucket.steps === 999)).toBe(false)
  })
})

describe('getDailyMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-06T06:00:00Z'))
  })

  it('maps the verified field shapes and applies guards/chunking', async () => {
    const civil = { civilStartTime: { date: { year: 2026, month: 6, day: 5 } } }
    const date = { year: 2026, month: 6, day: 5 }
    const fetchMock = router({
      rollup: {
        steps: { rollupDataPoints: [{ ...civil, steps: { countSum: 8000 } }] },
        'active-energy-burned': { rollupDataPoints: [{ ...civil, activeEnergyBurned: { kcalSum: 320.6 } }] },
        distance: { rollupDataPoints: [{ ...civil, distance: { millimetersSum: 5240000 } }] },
        'total-calories': { rollupDataPoints: [{ ...civil, totalCalories: { kcalSum: 1580.7 } }] },
        'heart-rate': {
          rollupDataPoints: [
            { ...civil, heartRate: { beatsPerMinuteAvg: 116.46, beatsPerMinuteMin: 83, beatsPerMinuteMax: 136 } },
          ],
        },
      },
      list: {
        'daily-resting-heart-rate': {
          dataPoints: [
            { dailyRestingHeartRate: { date, beatsPerMinute: '55' } },
            { dailyRestingHeartRate: { date: { year: 1970, month: 1, day: 1 }, beatsPerMinute: '40' } },
          ],
        },
        'hydration-log': {
          dataPoints: [
            { hydrationLog: { interval: { civilStartTime: { date } }, amountConsumed: { milliliters: 1500 } } },
          ],
        },
        'active-minutes': {
          dataPoints: [
            {
              activeMinutes: {
                interval: { civilStartTime: { date } },
                activeMinutesByActivityLevel: [{ activeMinutes: '1' }, { activeMinutes: '2' }],
              },
            },
          ],
        },
        'daily-vo2-max': { dataPoints: [{ dailyVo2Max: { date, vo2Max: 39 } }] },
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    const rows = await getDailyMetrics('token', 30)
    const day = rows.find((r) => r.date === '2026-06-05')

    expect(day.steps).toBe(8000)
    expect(day.calories).toBe(321) // active kcal, rounded
    expect(day.distance_km).toBe(5.24) // mm → km
    expect(day.total_calories).toBe(1581)
    expect(day.hr_avg).toBe(116.5)
    expect(day.hr_min).toBe(83)
    expect(day.hr_max).toBe(136)
    expect(day.resting_hr).toBe(55) // dailyRestingHeartRate.beatsPerMinute
    expect(day.hydration_ml).toBe(1500) // amountConsumed.milliliters
    expect(day.active_min).toBe(3) // summed per level
    expect(day.vo2_max).toBe(39)
    expect(day.spo2).toBeNull() // no data → null
    expect(day.hrv_ms).toBeNull()

    // 1970-dated resting-HR point is dropped by the year>=2000 guard.
    expect(rows.some((r) => r.date.startsWith('1970'))).toBe(false)

    // heart-rate / total-calories are chunked (14-day windows); steps is a single rollup.
    const rollupCalls = (needle) =>
      fetchMock.mock.calls.filter(([url]) => url.includes(`/${needle}/dataPoints:dailyRollUp`)).length
    expect(rollupCalls('steps')).toBe(1)
    expect(rollupCalls('heart-rate')).toBeGreaterThan(1)
    expect(rollupCalls('total-calories')).toBeGreaterThan(1)
  })
})

describe('getWorkouts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-06T06:00:00Z'))
  })

  it('parses metricsSummary fields and applies the cutoff', async () => {
    vi.stubGlobal(
      'fetch',
      router({
        list: {
          exercise: {
            dataPoints: [
              {
                name: 'users/123/dataTypes/exercise/dataPoints/999',
                exercise: {
                  interval: { startTime: '2026-06-03T03:49:03Z', endTime: '2026-06-03T04:14:01Z' },
                  exerciseType: 'WALKING',
                  displayName: 'Walk',
                  activeDuration: '1497.788s',
                  metricsSummary: {
                    caloriesKcal: 71.4,
                    distanceMillimeters: 524263,
                    steps: '707',
                    activeZoneMinutes: '2',
                    elevationGainMillimeters: 1500,
                    averagePaceSecondsPerMeter: 2.8554,
                  },
                },
              },
              {
                name: 'users/123/dataTypes/exercise/dataPoints/old',
                exercise: { interval: { startTime: '2020-01-01T00:00:00Z' } },
              },
            ],
          },
        },
      })
    )

    const workouts = await getWorkouts('token', 90)
    expect(workouts).toHaveLength(1) // the 2020 session is before the cutoff
    expect(workouts[0]).toMatchObject({
      source_id: '999',
      type: 'Walk',
      duration_min: 25, // activeDuration 1497.788s
      calories: 71,
      distance_km: 0.52, // 524263 mm
      steps: 707,
      active_zone_minutes: 2,
      elevation_m: 1.5, // 1500 mm
      avg_pace_s_per_m: 2.86,
    })
  })
})

describe('getStepSamples', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-06T06:00:00Z'))
  })

  it('paginates via nextPageToken and stops at the cutoff', async () => {
    const page1 = {
      dataPoints: [
        {
          steps: {
            count: '32',
            interval: {
              startTime: '2026-06-05T12:36:00Z',
              endTime: '2026-06-05T12:37:00Z',
              civilStartTime: { date: { year: 2026, month: 6, day: 5 }, time: { hours: 18 } },
            },
          },
        },
      ],
      nextPageToken: 'PAGE2',
    }
    const page2 = {
      dataPoints: [
        {
          steps: {
            count: '10',
            interval: { startTime: '2020-01-01T00:00:00Z', civilStartTime: { date: { year: 2020, month: 1, day: 1 } } },
          },
        },
      ],
    }
    const fetchMock = vi.fn(async (url) => jsonResponse(url.includes('PAGE2') ? page2 : page1))
    vi.stubGlobal('fetch', fetchMock)

    const samples = await getStepSamples('token', 365)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(samples).toHaveLength(1) // page2's sample is before the cutoff
    expect(samples[0]).toMatchObject({
      started_at: '2026-06-05T12:36:00Z',
      ended_at: '2026-06-05T12:37:00Z',
      count: 32,
      day: '2026-06-05',
      hour: 18,
    })
  })
})

describe('body / profile / identity / daily steps', () => {
  it('getBodyMetrics converts units and picks the latest weight', async () => {
    vi.stubGlobal(
      'fetch',
      router({
        rollup: {
          weight: {
            rollupDataPoints: [
              { civilStartTime: { date: { year: 2026, month: 6, day: 1 } }, weight: { weightGramsAvg: 70500 } },
              { civilStartTime: { date: { year: 2026, month: 6, day: 5 } }, weight: { weightGramsAvg: 71000 } },
            ],
          },
        },
        list: {
          height: {
            dataPoints: [{ height: { heightMillimeters: 1753, sampleTime: { physicalTime: '2026-06-05T00:00:00Z' } } }],
          },
        },
      })
    )
    expect(await getBodyMetrics('token')).toEqual({ weightKg: 71, heightCm: 175 })
  })

  it('getHealthProfile / getHealthUserId parse and return null on error', async () => {
    vi.stubGlobal('fetch', router({ profile: { age: 30 }, identity: { healthUserId: 'abc' } }))
    expect(await getHealthProfile('token')).toEqual({ age: 30 })
    expect(await getHealthUserId('token')).toBe('abc')

    vi.stubGlobal('fetch', vi.fn(async () => notOk()))
    expect(await getHealthProfile('token')).toBeNull()
    expect(await getHealthUserId('token')).toBeNull()
  })

  it('getDailySteps builds a filled series with totals', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-06T06:00:00Z'))
    vi.stubGlobal(
      'fetch',
      router({
        rollup: {
          steps: {
            rollupDataPoints: [
              { civilStartTime: { date: { year: 2026, month: 6, day: 6 } }, steps: { countSum: 5000 } },
              { civilStartTime: { date: { year: 2026, month: 6, day: 5 } }, steps: { countSum: 3000 } },
            ],
          },
        },
      })
    )
    const result = await getDailySteps('token', 7)
    expect(result.days).toHaveLength(7)
    expect(result.total).toBe(8000)
    expect(result.max).toBe(5000)
    expect(result.average).toBe(Math.round(8000 / 7))
  })
})
