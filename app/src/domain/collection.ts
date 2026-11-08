import type { Album, Membership, Rarity, Species } from './catalog'

/** The fields of a stored card that the collection logic needs. */
export interface CardLike {
  speciesId: string
  foundAt: string
}

const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Comune',
  uncommon: 'Non comune',
  legendary: 'Leggendaria',
}

export function rarityLabel(rarity: Rarity): string {
  return RARITY_LABELS[rarity] ?? 'Comune'
}

/** "07 di 24": the card's place in one of its albums. */
export function cardNumberLabel(membership: Pick<Membership, 'number'>, album: Pick<Album, 'speciesCount'> | undefined): string {
  if (album === undefined) return ''
  return `${String(membership.number).padStart(2, '0')} di ${album.speciesCount}`
}

/** True when the collection already holds this species: a new card of it is a duplicate. */
export function hasSpecies(cards: readonly CardLike[], speciesId: string): boolean {
  return cards.some((card) => card.speciesId === speciesId)
}

/**
 * How many different species of each album have been found (duplicates count once). A species in
 * two colour albums counts in both.
 */
export function foundPerAlbum(
  cards: readonly CardLike[],
  speciesAlbums: (speciesId: string) => readonly Pick<Membership, 'albumId'>[] | undefined,
): Map<string, number> {
  const seen = new Set<string>()
  const counts = new Map<string, number>()
  for (const card of cards) {
    if (seen.has(card.speciesId)) continue
    seen.add(card.speciesId)
    for (const { albumId } of speciesAlbums(card.speciesId) ?? []) counts.set(albumId, (counts.get(albumId) ?? 0) + 1)
  }
  return counts
}

/** Different catalogue species found (cards of species no longer in the catalogue do not count). */
export function speciesFound(cards: readonly CardLike[], known: (speciesId: string) => Species | undefined): number {
  return new Set(cards.filter((card) => known(card.speciesId)).map((card) => card.speciesId)).size
}

/** "8 novembre 2026", the way the card shows when it was found. */
export function formatFoundDate(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}
