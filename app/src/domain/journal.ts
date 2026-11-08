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
