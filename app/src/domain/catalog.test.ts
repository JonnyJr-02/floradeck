import { describe, expect, it } from 'vitest'
import { albums, inAlbum, species, speciesById, totalSpecies } from './catalog'

describe('catalogue in the app', () => {
  it('lists the six colour albums in their order', () => {
    expect(albums.map((album) => album.id)).toEqual(['bianchi', 'gialli', 'rosa', 'rossi-arancio', 'viola', 'blu-azzurri'])
    expect(albums.map((album) => album.order)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('counts 210 different species to collect', () => {
    expect(totalSpecies).toBe(210)
  })

  it('gives every album a name, a description and one legendary species found only there', () => {
    for (const album of albums) {
      expect(album.name.trim()).not.toBe('')
      expect(album.description.trim()).not.toBe('')
      const legendary = speciesById(album.legendarySpeciesId)!
      expect(legendary.rarity).toBe('legendary')
      expect(legendary.albums).toEqual([{ albumId: album.id, number: album.speciesCount }])
    }
    expect(species.filter((entry) => entry.rarity === 'legendary')).toHaveLength(albums.length)
  })

  it('puts a two-colour flower in both albums, with a number in each', () => {
    const daisy = speciesById('bellis-perennis')!
    expect(daisy.dominantColors).toEqual(['bianco', 'rosa'])
    expect(daisy.albums.map((m) => m.albumId)).toEqual(['bianchi', 'rosa'])
    expect(inAlbum(daisy, 'rosa')?.number).toBeGreaterThan(0)
    expect(daisy.albumId).toBe('bianchi')
  })

  it('numbers every album 1..N without gaps', () => {
    for (const album of albums) {
      const numbers = species.flatMap((entry) => entry.albums.filter((m) => m.albumId === album.id).map((m) => m.number))
      expect(numbers.sort((a, b) => a - b)).toEqual(Array.from({ length: album.speciesCount }, (_, i) => i + 1))
    }
  })
})
