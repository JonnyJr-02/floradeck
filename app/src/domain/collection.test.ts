import { describe, expect, it } from 'vitest'
import { albumById, albums, species, speciesById } from './catalog'
import { cardNumberLabel, foundPerAlbum, formatFoundDate, hasSpecies, rarityLabel, speciesFound } from './collection'

const at = '2026-11-08T10:00:00.000Z'
const albumsOf = (id: string) => speciesById(id)?.albums

describe('collection logic', () => {
  it('numbers a card inside its album with two digits', () => {
    const first = species.find((entry) => entry.number === 1)!
    const album = albumById(first.albumId)!
    expect(cardNumberLabel(first.albums[0]!, album)).toBe(`01 di ${album.speciesCount}`)
    expect(cardNumberLabel({ number: 12 }, { speciesCount: 24 })).toBe('12 di 24')
    expect(cardNumberLabel({ number: 3 }, undefined)).toBe('')
  })

  it('names every rarity in Italian', () => {
    expect(['common', 'uncommon', 'legendary'].map((r) => rarityLabel(r as never))).toEqual([
      'Comune',
      'Non comune',
      'Leggendaria',
    ])
  })

  it('spots a duplicate', () => {
    const cards = [{ speciesId: 'bellis-perennis', foundAt: at }]
    expect(hasSpecies(cards, 'bellis-perennis')).toBe(true)
    expect(hasSpecies(cards, 'papaver-rhoeas')).toBe(false)
    expect(hasSpecies([], 'bellis-perennis')).toBe(false)
  })

  it('counts each species once per album, in every album it belongs to', () => {
    const daisy = 'bellis-perennis' // white and pink
    const poppy = 'papaver-rhoeas'
    const cards = [daisy, daisy, poppy, 'gone-from-the-catalogue'].map((speciesId) => ({ speciesId, foundAt: at }))
    const counts = foundPerAlbum(cards, albumsOf)
    expect(counts.get('bianchi')).toBe(1)
    expect(counts.get('rosa')).toBe(1)
    expect(counts.get(speciesById(poppy)!.albumId)).toBe(1)
    expect(speciesFound(cards, speciesById)).toBe(2)
    expect(albums.length).toBe(6)
  })

  it('writes the date in Italian', () => {
    expect(formatFoundDate('2026-11-08T10:00:00')).toBe('8 novembre 2026')
  })
})
