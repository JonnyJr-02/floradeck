import { describe, expect, it } from 'vitest'
import { albumSlots, COLOR_SWATCHES, duplicateCount, filterSlots, missingInSeason, shortMonths } from './album'
import { albums, species } from './catalog'

const first = albums[0]!
const inFirst = species.filter((entry) => entry.albumId === first.id)
const [a, b, c] = inFirst
const card = (id: string, speciesId: string, foundAt: string) => ({ id, speciesId, foundAt })

describe('album slots', () => {
  it('lists every species of the album in card order', () => {
    const slots = albumSlots(first.id, [], new Map(), 5)
    expect(slots).toHaveLength(first.speciesCount)
    expect(slots.map((slot) => slot.species.number)).toEqual(
      Array.from({ length: first.speciesCount }, (_, i) => i + 1),
    )
  })

  it('takes the first card found as cover unless another was chosen', () => {
    const cards = [card('late', a!.id, '2026-06-02T10:00:00Z'), card('early', a!.id, '2026-05-01T10:00:00Z')]
    const auto = albumSlots(first.id, cards, new Map(), 5).find((slot) => slot.species.id === a!.id)!
    expect(auto.cards.map((x) => x.id)).toEqual(['early', 'late'])
    expect(auto.cover?.id).toBe('early')
    const chosen = albumSlots(first.id, cards, new Map([[a!.id, 'late']]), 5).find((s) => s.species.id === a!.id)!
    expect(chosen.cover?.id).toBe('late')
    // A cover that no longer exists falls back to the first card.
    const stale = albumSlots(first.id, cards, new Map([[a!.id, 'gone']]), 5).find((s) => s.species.id === a!.id)!
    expect(stale.cover?.id).toBe('early')
  })

  it('filters found, missing and in-season slots', () => {
    const cards = [card('1', a!.id, '2026-05-01T10:00:00Z'), card('2', b!.id, '2026-05-02T10:00:00Z')]
    const slots = albumSlots(first.id, cards, new Map(), 5)
    expect(filterSlots(slots, 'found').map((s) => s.species.id)).toEqual([a!.id, b!.id])
    expect(filterSlots(slots, 'missing')).toHaveLength(first.speciesCount - 2)
    expect(filterSlots(slots, 'season').every((s) => s.species.bloomMonths.includes(5))).toBe(true)
    expect(filterSlots(slots, 'all')).toHaveLength(first.speciesCount)
  })

  it('counts duplicates as cards beyond the first of each species', () => {
    expect(duplicateCount([])).toBe(0)
    expect(
      duplicateCount([card('1', a!.id, ''), card('2', a!.id, ''), card('3', a!.id, ''), card('4', c!.id, '')]),
    ).toBe(2)
  })

  it('lists the missing species in season, never the legendary one', () => {
    const month = 4
    const found = [card('1', a!.id, '')]
    const list = missingInSeason(found, month)
    expect(list.every((entry) => entry.bloomMonths.includes(month) && entry.albumId !== null)).toBe(true)
    expect(list.some((entry) => entry.id === a!.id)).toBe(false)
  })

  it('writes compact month ranges', () => {
    expect(shortMonths([3, 4, 5, 6])).toBe('mar–giu')
    expect(shortMonths([1, 2, 12])).toBe('dic–feb')
    expect(shortMonths([4, 7, 8, 9])).toBe('apr · lug–set')
    expect(shortMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe("tutto l'anno")
  })

  it('has a swatch for every colour used in the catalogue', () => {
    const used = new Set(species.flatMap((entry) => entry.dominantColors))
    for (const colour of used) expect(COLOR_SWATCHES[colour], colour).toBeTruthy()
  })
})
