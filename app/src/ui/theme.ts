import { useSyncExternalStore } from 'react'
import {
  parsePreference,
  resolveTheme,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemePreference,
} from '../domain/theme'

let preference: ThemePreference = 'system'
let statusBarOverride: string | null = null
const listeners = new Set<() => void>()

function systemDark(): MediaQueryList {
  return window.matchMedia('(prefers-color-scheme: dark)')
}

function readStored(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

function currentTheme(): Theme {
  return resolveTheme(preference, systemDark().matches)
}

/** The status bar and browser chrome follow the page; one tag per scheme (mobile-native). */
function syncThemeColor() {
  const theme = currentTheme()
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const scheme: Theme = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = statusBarOverride ?? THEME_COLORS[preference === 'system' ? scheme : theme]
  }
}

function apply() {
  document.documentElement.dataset.theme = currentTheme()
  syncThemeColor()
  for (const listener of listeners) listener()
}

/** Called once at start-up; index.html has already set data-theme before the first paint. */
export function initTheme() {
  preference = parsePreference(readStored())
  apply()
  systemDark().addEventListener('change', () => {
    if (preference === 'system') apply()
  })
}

export function setThemePreference(next: ThemePreference) {
  preference = next
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Private browsing can refuse storage: the choice then lasts for this visit only.
  }
  apply()
}

/** Full-screen dark surfaces (the camera) colour the status bar while they are shown. */
export function setStatusBarOverride(color: string | null) {
  statusBarOverride = color
  syncThemeColor()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, () => preference)
}
