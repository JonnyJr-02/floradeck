import { describe, expect, it } from 'vitest'
import { detectPlatform, isStandaloneDisplay } from './platform'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'
const WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

describe('detectPlatform', () => {
  it('recognises an iPhone', () => {
    expect(detectPlatform(IPHONE, 5)).toBe('ios')
  })

  it('recognises an iPad that asks for the desktop site', () => {
    expect(detectPlatform(MAC_SAFARI, 5)).toBe('ios')
  })

  it('leaves a real Mac, without touch, out of iOS', () => {
    expect(detectPlatform(MAC_SAFARI, 0)).toBe('other')
  })

  it('recognises Android', () => {
    expect(detectPlatform(ANDROID_CHROME, 5)).toBe('android')
  })

  it('treats desktop browsers as other', () => {
    expect(detectPlatform(WINDOWS_CHROME)).toBe('other')
  })
})

describe('isStandaloneDisplay', () => {
  it('is true for an installed app on any platform', () => {
    expect(isStandaloneDisplay(true, undefined)).toBe(true)
    expect(isStandaloneDisplay(false, true)).toBe(true)
  })

  it('is false in a browser tab', () => {
    expect(isStandaloneDisplay(false, false)).toBe(false)
    expect(isStandaloneDisplay(false, undefined)).toBe(false)
  })
})
