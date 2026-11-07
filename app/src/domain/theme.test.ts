import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsePreference, resolveTheme, THEME_COLORS } from './theme'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('theme preference', () => {
  it('follows the phone when set to automatic', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('keeps a manual choice whatever the phone says', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('reads anything unknown in storage as automatic', () => {
    expect(parsePreference(null)).toBe('system')
    expect(parsePreference('sepia')).toBe('system')
    expect(parsePreference('dark')).toBe('dark')
    expect(parsePreference('light')).toBe('light')
  })
})

describe('theme colours stay in step', () => {
  it('match the page backgrounds in styles.css', () => {
    const css = read('../ui/styles.css')
    const light = /:root\s*\{[^}]*--p-bg:\s*(#[0-9a-f]{6})/i.exec(css)?.[1]
    const dark = /\[data-theme="dark"\]\s*\{[^}]*--p-bg:\s*(#[0-9a-f]{6})/i.exec(css)?.[1]
    expect({ light, dark }).toEqual(THEME_COLORS)
  })

  it('match the theme-color tags in index.html', () => {
    const html = read('../../index.html')
    const light = /media="\(prefers-color-scheme: light\)" content="(#[0-9a-f]{6})"/i.exec(html)?.[1]
    const dark = /media="\(prefers-color-scheme: dark\)" content="(#[0-9a-f]{6})"/i.exec(html)?.[1]
    expect({ light, dark }).toEqual(THEME_COLORS)
  })
})
