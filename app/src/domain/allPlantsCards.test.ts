import { describe, expect, it } from 'vitest'
import generated from './allPlantsCards.generated.json'
import { cardForName } from './allPlantsCards'
import { speciesById } from './catalog'

describe('all-plants names that are cards', () => {
  it('knows exact labels, every species of a genus card, and synonyms', () => {
    expect(cardForName('Papaver rhoeas')).toBe('papaver-rhoeas')
    expect(cardForName('Verbascum sinuatum')).toBe('verbascum')
    expect(cardForName('Valeriana rubra')).toBe('centranthus-ruber')
    expect(cardForName('valeriana  rubra ')).toBe('centranthus-ruber')
  })

  it('says nothing about plants that are not cards', () => {
    expect(cardForName('Pelargonium zonale')).toBeUndefined()
    expect(cardForName('Valeriana officinalis')).toBeUndefined()
  })

  it('points only at cards of this catalogue', () => {
    for (const id of Object.values(generated as Record<string, string>)) expect(speciesById(id), id).toBeDefined()
  })
})
