import { albums as allAlbums, species as allSpecies, type Album, type Species } from './catalog'
import type { CardLike } from './collection'
import type { Snapshot } from './share'

/** Who holds a species: both players, only me, only the partner, or nobody yet. */
export type Owner = 'both' | 'me' | 'partner' | 'none'

export function ownerOf(speciesId: string, mine: ReadonlySet<string>, partner: ReadonlySet<string>): Owner {
  const me = mine.has(speciesId)
  const other = partner.has(speciesId)
  return me && other ? 'both' : me ? 'me' : other ? 'partner' : 'none'
}

/** Catalogue species with at least one card (duplicates and removed species do not count). */
export function foundSpecies(cards: readonly CardLike[], catalogue: readonly Pick<Species, 'id'>[] = allSpecies): Set<string> {
  const known = new Set(catalogue.map((entry) => entry.id))
  return new Set(cards.map((card) => card.speciesId).filter((id) => known.has(id)))
}

export interface CoupleProgress {
  albumId: string
  total: number
  mine: number
  partner: number
  /** The couple album: species found by either player. */
  together: number
  /** Found by both. */
  both: number
}

function count(ids: readonly string[], mine: ReadonlySet<string>, partner: ReadonlySet<string>) {
  let me = 0
  let other = 0
  let together = 0
  let both = 0
  for (const id of ids) {
    const owner = ownerOf(id, mine, partner)
    if (owner === 'both' || owner === 'me') me++
    if (owner === 'both' || owner === 'partner') other++
    if (owner !== 'none') together++
    if (owner === 'both') both++
  }
  return { total: ids.length, mine: me, partner: other, together, both }
}

/** Progress of each album for me, the partner and the two together (a species in two albums counts in both). */
export function coupleProgress(
  mine: ReadonlySet<string>,
  partner: ReadonlySet<string>,
  albums: readonly Pick<Album, 'id'>[] = allAlbums,
  catalogue: readonly Pick<Species, 'id' | 'albums'>[] = allSpecies,
): CoupleProgress[] {
  return albums.map((album) => {
    const ids = catalogue.filter((entry) => entry.albums.some((m) => m.albumId === album.id)).map((entry) => entry.id)
    return { albumId: album.id, ...count(ids, mine, partner) }
  })
}

/** The same counts over the whole catalogue. */
export function coupleTotal(
  mine: ReadonlySet<string>,
  partner: ReadonlySet<string>,
  catalogue: readonly Pick<Species, 'id'>[] = allSpecies,
): Omit<CoupleProgress, 'albumId'> {
  return count(
    catalogue.map((entry) => entry.id),
    mine,
    partner,
  )
}

/** My progress as the other phone will read it. */
export function mySnapshot(
  profile: { id: string; name: string; colour: string },
  cards: readonly CardLike[],
  now = new Date(),
  catalogue: readonly Pick<Species, 'id'>[] = allSpecies,
): Snapshot {
  return {
    profileId: profile.id,
    name: profile.name,
    colour: profile.colour,
    at: now.toISOString(),
    found: [...foundSpecies(cards, catalogue)],
  }
}

/** The catalogue order both phones encode progress in. */
export const catalogueIds: readonly string[] = allSpecies.map((entry) => entry.id)
