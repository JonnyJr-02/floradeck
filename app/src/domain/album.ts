import { inAlbum, species as allSpecies, type Species } from './catalog'
import type { CardLike } from './collection'
import { monthRuns } from './seasonality'

/** A card as the album needs it: CardLike plus its id. */
export interface AlbumCard extends CardLike {
  id: string
}

export interface Slot<C extends AlbumCard = AlbumCard> {
  species: Species
  /** The card number in this album. */
  number: number
  /** Every card of the species, oldest first. */
  cards: C[]
  /** The card whose photo stands for the species: the chosen cover, else the first one found. */
  cover: C | undefined
  /** Flowering (or fruiting, for berries) this month. */
  inSeason: boolean
}

export type SlotFilter = 'all' | 'found' | 'missing' | 'season'

export function inSeason(entry: Pick<Species, 'bloomMonths'>, month: number): boolean {
  return entry.bloomMonths.includes(month)
}

/** The species of an album in card order, each with its cards and cover. */
export function albumSlots<C extends AlbumCard>(
  albumId: string,
  cards: readonly C[],
  covers: ReadonlyMap<string, string>,
  month: number,
  catalogue: readonly Species[] = allSpecies,
): Slot<C>[] {
  const bySpecies = new Map<string, C[]>()
  for (const card of [...cards].sort((a, b) => a.foundAt.localeCompare(b.foundAt))) {
    const list = bySpecies.get(card.speciesId) ?? []
    list.push(card)
    bySpecies.set(card.speciesId, list)
  }
  return catalogue
    .flatMap((entry) => {
      const membership = inAlbum(entry, albumId)
      return membership ? [{ entry, number: membership.number }] : []
    })
    .sort((a, b) => a.number - b.number)
    .map(({ entry, number }) => {
      const found = bySpecies.get(entry.id) ?? []
      const chosen = covers.get(entry.id)
      return {
        species: entry,
        number,
        cards: found,
        cover: found.find((card) => card.id === chosen) ?? found[0],
        inSeason: inSeason(entry, month),
      }
    })
}

export function filterSlots<C extends AlbumCard>(slots: readonly Slot<C>[], filter: SlotFilter): Slot<C>[] {
  switch (filter) {
    case 'found':
      return slots.filter((slot) => slot.cards.length > 0)
    case 'missing':
      return slots.filter((slot) => slot.cards.length === 0)
    case 'season':
      return slots.filter((slot) => slot.inSeason)
    default:
      return [...slots]
  }
}

/** Duplicates: every card beyond the first of each species. */
export function duplicateCount(cards: readonly CardLike[]): number {
  return cards.length - new Set(cards.map((card) => card.speciesId)).size
}

/** Species still to find that flower (or fruit) this month, by their first album and card number. */
export function missingInSeason(
  cards: readonly CardLike[],
  month: number,
  catalogue: readonly Species[] = allSpecies,
  albumOrder: (albumId: string) => number = () => 0,
): Species[] {
  const owned = new Set(cards.map((card) => card.speciesId))
  return catalogue
    .filter((entry) => !owned.has(entry.id) && inSeason(entry, month))
    .sort((a, b) => albumOrder(a.albumId) - albumOrder(b.albumId) || a.number - b.number)
}

const SHORT_MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'] as const

/** "mar–giu", "apr · lug–set", "tutto l'anno": the compact months of an album tile. */
export function shortMonths(months: readonly number[]): string {
  const runs = monthRuns(months)
  if (runs.length === 1 && runs[0]?.[0] === 1 && runs[0][1] === 12) return "tutto l'anno"
  const name = (month: number) => SHORT_MONTHS[month - 1] ?? ''
  return runs.map(([from, to]) => (from === to ? name(from) : `${name(from)}–${name(to)}`)).join(' · ')
}

/** Display colour of each catalogue colour word, for the hint dots of a tile. */
export const COLOR_SWATCHES: Record<string, string> = {
  bianco: '#f4f1ea',
  rosa: '#e7a3b8',
  viola: '#8a5aa8',
  giallo: '#e9c43c',
  rosso: '#c8322a',
  blu: '#3d5fb8',
  azzurro: '#8fb8e3',
  arancio: '#e68a2e',
  nero: '#24201c',
}
