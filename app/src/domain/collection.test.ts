import { describe, expect, it } from 'vitest'
import { albumById, albums, species, speciesById } from './catalog'
import { cardNumberLabel, foundPerAlbum, formatFoundDate, hasSpecies, rarityLabel } from './collection'

const at = '2026-11-08T10:00:00.000Z'
const albumOf = (id: string) => speciesById(id)?.albumId

describe('collection logic', () => {
  it('numbers a card inside its album with two digits', () => {
    const first = species.find((entry) => entry.number === 1)!
    const album = albumById(first.albumId)!
    expect(cardNumberLabel(first, album)).toBe(`01 di ${album.speciesCount}`)
    expect(cardNumberLabel({ number: 12 }, { speciesCount: 24 })).toBe('12 di 24')
  })

  it('gives the legendary card no album number', () => {
    const legendary = speciesById('cypripedium-calceolus')!
    expect(cardNumberLabel(legendary, albumById(legendary.albumId))).toBe('')
  })

  it('names every rarity in Italian', () => {
    expect(['common', 'uncommon', 'rare', 'legendary'].map((r) => rarityLabel(r as never))).toEqual([
      'Comune',
      'Non comune',
      'Rara',
      'Leggendaria',
    ])
  })

  it('spots a duplicate', () => {
    const cards = [{ speciesId: 'bellis-perennis', foundAt: at }]
    expect(hasSpecies(cards, 'bellis-perennis')).toBe(true)
    expect(hasSpecies(cards, 'papaver-rhoeas')).toBe(false)
    expect(hasSpecies([], 'bellis-perennis')).toBe(false)
  })

  it('counts each species once per album and ignores the legendary card', () => {
    const [first, second] = albums
    const [a, b] = species.filter((entry) => entry.albumId === first?.id)
    const other = species.find((entry) => entry.albumId === second?.id)
    if (!first || !second || !a || !b || !other) throw new Error('the catalogue needs two albums')
    const cards = [a, a, b, other, speciesById('cypripedium-calceolus')!].map((entry) => ({
      speciesId: entry.id,
      foundAt: at,
    }))
    const counts = foundPerAlbum(cards, albumOf)
    expect(counts.get(first.id)).toBe(2)
    expect(counts.get(second.id)).toBe(1)
    expect([...counts.values()].reduce((sum, n) => sum + n, 0)).toBe(3)
  })

  it('writes the date in Italian', () => {
    expect(formatFoundDate('2026-11-08T10:00:00')).toBe('8 novembre 2026')
  })
})
