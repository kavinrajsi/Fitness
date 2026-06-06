import { describe, it, expect, vi, afterEach } from 'vitest'
import { urlBase64ToUint8Array, getDeviceInfo } from './push-client'

describe('urlBase64ToUint8Array', () => {
  it('decodes standard base64url to bytes', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3]) // base64 of [1,2,3]
  })

  it('handles url-safe chars and missing padding', () => {
    // bytes [251, 255] → base64 "+/8=" → base64url "-_8"
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
  })
})

describe('getDeviceInfo', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses UA-Client-Hints (brand, platform, model) when available', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/126',
      userAgentData: {
        brands: [{ brand: 'Not.A/Brand' }, { brand: 'Chromium' }, { brand: 'Google Chrome' }],
        getHighEntropyValues: async () => ({
          model: 'Pixel 7',
          platform: 'Android',
          platformVersion: '14.0.0',
        }),
      },
    })
    const { device, userAgent } = await getDeviceInfo()
    expect(device).toMatch(/Chrom/) // first non-"Not A Brand"
    expect(device).toContain('on Android 14')
    expect(device).toContain('(Pixel 7)')
    expect(userAgent).toContain('Mozilla')
  })

  it('falls back to a User-Agent parse without userAgentData', async () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17 Safari/604',
    })
    const { device } = await getDeviceInfo()
    expect(device).toBe('Safari on iOS')
  })
})
