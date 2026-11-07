import { detectPlatform, isStandaloneDisplay, type Platform } from '../domain/platform'

export function currentPlatform(): Platform {
  return detectPlatform(navigator.userAgent, navigator.maxTouchPoints)
}

/** True when FloraDeck runs as an installed app rather than in a browser tab. */
export function isInstalled(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
  return isStandaloneDisplay(window.matchMedia('(display-mode: standalone)').matches, iosStandalone)
}
