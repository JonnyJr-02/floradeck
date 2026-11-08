import { describe, expect, it } from 'vitest'
import { species } from './catalog'
import { formatMonths, monthRuns } from './seasonality'

describe('flowering months', () => {
  it('reads a single run', () => {
    expect(formatMonths([3, 4, 5, 6])).toBe('da marzo a giugno')
  })

  it('keeps a run across the new year whole', () => {
    expect(monthRuns([1, 2, 3, 4, 5, 6, 12])).toEqual([[12, 6]])
    expect(formatMonths([1, 2, 3, 4, 5, 6, 12])).toBe('da dicembre a giugno')
  })

  it('lists separate runs and single months', () => {
    expect(formatMonths([4, 7, 8, 9])).toBe('aprile e da luglio a settembre')
    expect(formatMonths([1, 4, 6, 7, 10])).toBe('gennaio, aprile, da giugno a luglio e ottobre')
  })

  it('says "tutto l\'anno" for every month', () => {
    expect(formatMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe("tutto l'anno")
  })

  it('ignores duplicates, order and impossible months', () => {
    expect(formatMonths([6, 5, 5, 13, 0])).toBe('da maggio a giugno')
    expect(formatMonths([])).toBe('')
  })

  it('reads every species of the catalogue', () => {
    for (const entry of species) {
      const runs = monthRuns(entry.bloomMonths)
      const covered = runs.reduce((sum, [from, to]) => sum + ((to - from + 12) % 12) + 1, 0)
      expect(covered, entry.id).toBe(new Set(entry.bloomMonths).size)
    }
  })
})
