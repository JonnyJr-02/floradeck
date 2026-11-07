export type ThemePreference = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'floradeck:theme'

/**
 * Page background of each theme. The browser chrome and the status bar take this colour;
 * it must match `--p-bg` in src/ui/styles.css and the theme-color tags in index.html.
 */
export const THEME_COLORS: Record<Theme, string> = {
  light: '#f2ede3',
  dark: '#0f1320',
}

/** Anything unknown in storage (or nothing at all) means "follow the phone". */
export function parsePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): Theme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}
