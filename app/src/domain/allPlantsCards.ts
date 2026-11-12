import generated from './allPlantsCards.generated.json'
import { species } from './catalog'

/**
 * Which of the all-plants model's names are cards. The table comes from
 * catalog/scripts/allplants_cards.py (labels, genus cards and GBIF synonyms: the big model's
 * "Valeriana rubra" is the catalogue's "Centranthus ruber"); exact labels and genus cards are
 * also matched here, for a catalogue newer than the table.
 */

const table = new Map(Object.entries(generated as Record<string, string>).map(([name, id]) => [name.toLowerCase(), id]))

const exact = new Map(
  species.flatMap((entry) => [entry.scientificName, ...entry.modelLabels].map((name) => [name.toLowerCase(), entry.id] as const)),
)

const genusCards = new Map(
  species.flatMap((entry) =>
    entry.modelLabels.filter((label) => !label.trim().includes(' ')).map((genus) => [genus.toLowerCase(), entry.id] as const),
  ),
)

/** The card id for a scientific name from the all-plants model, if that plant is a card. */
export function cardForName(scientific: string): string | undefined {
  const key = scientific.trim().replace(/\s+/g, ' ').toLowerCase()
  return table.get(key) ?? exact.get(key) ?? genusCards.get(key.split(' ')[0] ?? '')
}
