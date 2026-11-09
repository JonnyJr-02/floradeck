import { describe, expect, it } from 'vitest'
import { albums, species } from './catalog'
import { coupleProgress, coupleTotal, foundSpecies, mySnapshot, ownerOf, catalogueIds } from './couple'
import { decodeSnapshot, encodeSnapshot } from './share'

const catalogue = [
  { id: 'a', albums: [{ albumId: 'white', number: 1 }] },
  { id: 'b', albums: [{ albumId: 'white', number: 2 }, { albumId: 'pink', number: 1 }] },
  { id: 'c', albums: [{ albumId: 'pink', number: 2 }] },
  { id: 'd', albums: [{ albumId: 'pink', number: 3 }] },
]

describe('couple progress', () => {
  it('tells who holds a species', () => {
    const mine = new Set(['a', 'b'])
    const partner = new Set(['b', 'c'])
    expect(['a', 'b', 'c', 'd'].map((id) => ownerOf(id, mine, partner))).toEqual(['me', 'both', 'partner', 'none'])
  })

  it('counts each album for me, the partner and the couple album', () => {
    const progress = coupleProgress(new Set(['a', 'b']), new Set(['b', 'c']), [{ id: 'white' }, { id: 'pink' }], catalogue)
    expect(progress).toEqual([
      { albumId: 'white', total: 2, mine: 2, partner: 1, together: 2, both: 1 },
      { albumId: 'pink', total: 3, mine: 1, partner: 2, together: 2, both: 1 },
    ])
    expect(coupleTotal(new Set(['a', 'b']), new Set(['b', 'c']), catalogue)).toEqual({
      total: 4,
      mine: 2,
      partner: 2,
      together: 3,
      both: 1,
    })
  })

  it('counts found species once, without duplicates or species left out of the catalogue', () => {
    const cards = [
      { speciesId: 'a', foundAt: '' },
      { speciesId: 'a', foundAt: '' },
      { speciesId: 'gone', foundAt: '' },
    ]
    expect([...foundSpecies(cards, catalogue)]).toEqual(['a'])
  })

  it('covers every album of the real catalogue', () => {
    const progress = coupleProgress(new Set(), new Set())
    expect(progress.map((album) => album.albumId)).toEqual(albums.map((album) => album.id))
    expect(progress.map((album) => album.total)).toEqual(albums.map((album) => album.speciesCount))
  })

  it('sends my progress through a snapshot and reads it back', () => {
    const first = species[0]!.id
    const last = species[species.length - 1]!.id
    const snapshot = mySnapshot(
      { id: 'me', name: 'Alice', colour: '#3d5fb8' },
      [
        { speciesId: first, foundAt: '' },
        { speciesId: last, foundAt: '' },
      ],
      new Date('2026-11-09T12:00:00Z'),
    )
    const back = decodeSnapshot(encodeSnapshot(snapshot, catalogueIds), catalogueIds)
    expect(back).toEqual({ ...snapshot, found: [first, last] })
  })
})
