import { describe, expect, it } from 'vitest'
import { albums, totalSpecies } from './catalog'

describe('catalogue in the app', () => {
  it('lists the eight albums in their order', () => {
    expect(albums).toHaveLength(8)
    expect(albums.map((album) => album.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('counts 210 species to collect, without the secret legendary card', () => {
    expect(totalSpecies).toBe(210)
    expect(albums.some((album) => album.id === 'leggendaria')).toBe(false)
  })

  it('gives every album a name, a description and its rare species', () => {
    for (const album of albums) {
      expect(album.name.trim()).not.toBe('')
      expect(album.description.trim()).not.toBe('')
      expect(album.rareSpeciesId.trim()).not.toBe('')
    }
  })
})
