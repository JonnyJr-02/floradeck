import { describe, expect, it } from 'vitest'
import { albums, totalSpecies } from './catalog'

describe('catalogue in the app', () => {
  it('lists the ten albums in their order', () => {
    expect(albums).toHaveLength(10)
    expect(albums.map((album) => album.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('counts 260 species to collect, without the secret legendary card', () => {
    expect(totalSpecies).toBe(260)
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
