export type Platform = 'ios' | 'android' | 'other'

/**
 * Which install instructions to show first. No media query tells the operating system apart,
 * so this reads the user agent, for this purpose only: capabilities (touch, hover) are always
 * checked with media queries instead.
 */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  // iPadOS asks for desktop sites and introduces itself as a Mac, but a Mac has no touch screen.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return 'other'
}

/** Installed PWAs run in standalone mode; iOS also exposes the older navigator.standalone flag. */
export function isStandaloneDisplay(displayModeStandalone: boolean, iosStandalone: boolean | undefined): boolean {
  return displayModeStandalone || iosStandalone === true
}
