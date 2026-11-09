import { describe, expect, it } from 'vitest'
import { monthKey, seasonIntroDue } from './SeasonIntro'

describe('monthly season screen', () => {
  it('is due once per month, from the 1st', () => {
    const first = new Date(2026, 11, 1, 8)
    expect(monthKey(first)).toBe('2026-12')
    expect(seasonIntroDue(null, first)).toBe(true)
    expect(seasonIntroDue('2026-11', first)).toBe(true)
    expect(seasonIntroDue('2026-12', first)).toBe(false)
    expect(seasonIntroDue('2026-12', new Date(2026, 11, 31))).toBe(false)
    expect(seasonIntroDue('off', first)).toBe(false)
  })
})
