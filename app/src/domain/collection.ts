import type { Album, Rarity, Species } from './catalog'

/** The fields of a stored card that the collection logic needs. */
export interface CardLike {
  speciesId: string
  foundAt: string
}

const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Comune',
  uncommon: 'Non comune',
  rare: 'Rara',
  legendary: 'Leggendaria',
}

export function rarityLabel(rarity: Rarity): string {
  return RARITY_LABELS[rarity]
}

/** "07 di 24": the card's place in its album. Empty for the legendary card, which has no album. */
export function cardNumberLabel(entry: Pick<Species, 'number'>, album: Pick<Album, 'speciesCount'> | undefined): string {
  if (entry.number === null || album === undefined) return ''
  return `${String(entry.number).padStart(2, '0')} di ${album.speciesCount}`
}

/** True when the collection already holds this species: a new card of it is a duplicate. */
export function hasSpecies(cards: readonly CardLike[], speciesId: string): boolean {
  return cards.some((card) => card.speciesId === speciesId)
}

/** How many different species of each album have been found (duplicates count once). */
export function foundPerAlbum(
  cards: readonly CardLike[],
  speciesAlbum: (speciesId: string) => string | null | undefined,
): Map<string, number> {
  const seen = new Set<string>()
  const counts = new Map<string, number>()
  for (const card of cards) {
    if (seen.has(card.speciesId)) continue
    seen.add(card.speciesId)
    const albumId = speciesAlbum(card.speciesId)
    if (albumId) counts.set(albumId, (counts.get(albumId) ?? 0) + 1)
  }
  return counts
}

/** "8 novembre 2026", the way the card shows when it was found. */
export function formatFoundDate(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}
