import type { CardLike } from './collection'

export interface JournalGroup<C extends CardLike> {
  /** "2026-11", stable for keys and ids. */
  key: string
  /** "Novembre 2026". */
  label: string
  /** Newest first; firstOfSpecies marks the discovery, later ones are duplicates. */
  cards: Array<{ card: C; firstOfSpecies: boolean }>
}

const monthYear = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })

/** The diary: cards grouped by month, newest month and newest card first. */
export function journalGroups<C extends CardLike>(cards: readonly C[]): JournalGroup<C>[] {
  const oldestFirst = [...cards].sort((a, b) => a.foundAt.localeCompare(b.foundAt))
  const seen = new Set<string>()
  const marked = oldestFirst.map((card) => {
    const firstOfSpecies = !seen.has(card.speciesId)
    seen.add(card.speciesId)
    return { card, firstOfSpecies }
  })
  const groups = new Map<string, JournalGroup<C>>()
  for (const item of marked.reverse()) {
    const date = new Date(item.card.foundAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    let group = groups.get(key)
    if (!group) {
      const label = monthYear.format(date)
      group = { key, label: label.charAt(0).toUpperCase() + label.slice(1), cards: [] }
      groups.set(key, group)
    }
    group.cards.push(item)
  }
  return [...groups.values()]
}

/** A diary line: a card, or a plant outside the albums kept as a sighting. */
export type DiaryItem<C extends CardLike, S extends { foundAt: string }> =
  | { kind: 'card'; card: C; firstOfSpecies: boolean }
  | { kind: 'sighting'; sighting: S }

export interface DiaryGroup<C extends CardLike, S extends { foundAt: string }> {
  key: string
  label: string
  items: Array<DiaryItem<C, S>>
}

const at = <C extends CardLike, S extends { foundAt: string }>(item: DiaryItem<C, S>) =>
  item.kind === 'card' ? item.card.foundAt : item.sighting.foundAt

/** The whole diary: cards and sightings together, by month, newest first. */
export function diaryGroups<C extends CardLike, S extends { foundAt: string }>(
  cards: readonly C[],
  sightings: readonly S[],
): DiaryGroup<C, S>[] {
  const items: Array<DiaryItem<C, S>> = [
    ...journalGroups(cards).flatMap((group) => group.cards.map((entry) => ({ kind: 'card' as const, ...entry }))),
    ...sightings.map((sighting) => ({ kind: 'sighting' as const, sighting })),
  ].sort((a, b) => at(b).localeCompare(at(a)))
  const groups = new Map<string, DiaryGroup<C, S>>()
  for (const item of items) {
    const date = new Date(at(item))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    let group = groups.get(key)
    if (!group) {
      const label = monthYear.format(date)
      group = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] }
      groups.set(key, group)
    }
    group.items.push(item)
  }
  return [...groups.values()]
}
