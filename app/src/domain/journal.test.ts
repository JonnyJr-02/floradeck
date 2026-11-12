import { describe, expect, it } from 'vitest'
import { diaryGroups, journalGroups } from './journal'

const card = (speciesId: string, foundAt: string) => ({ speciesId, foundAt })

describe('diary', () => {
  it('groups by month, newest first, and marks duplicates', () => {
    const groups = journalGroups([
      card('papaver', '2026-05-14T10:00:00'),
      card('bellis', '2026-11-02T09:00:00'),
      card('papaver', '2026-11-05T17:00:00'),
      card('bellis', '2026-05-01T08:00:00'),
    ])
    expect(groups.map((g) => g.label)).toEqual(['Novembre 2026', 'Maggio 2026'])
    expect(groups[0]!.cards.map((c) => [c.card.speciesId, c.firstOfSpecies])).toEqual([
      ['papaver', false],
      ['bellis', false],
    ])
    expect(groups[1]!.cards.map((c) => [c.card.speciesId, c.firstOfSpecies])).toEqual([
      ['papaver', true],
      ['bellis', true],
    ])
  })

  it('is empty without cards', () => {
    expect(journalGroups([])).toEqual([])
  })
})

describe('diary with sightings', () => {
  it('puts plants outside the albums among the cards, by date', () => {
    const groups = diaryGroups(
      [card('papaver', '2026-11-02T09:00:00'), card('papaver', '2026-11-08T09:00:00')],
      [{ id: 's1', foundAt: '2026-11-05T12:00:00' }, { id: 's2', foundAt: '2026-10-30T12:00:00' }],
    )
    expect(groups.map((g) => g.label)).toEqual(['Novembre 2026', 'Ottobre 2026'])
    expect(groups[0]!.items.map((item) => (item.kind === 'card' ? `${item.card.foundAt}:${item.firstOfSpecies}` : item.sighting.id))).toEqual([
      '2026-11-08T09:00:00:false',
      's1',
      '2026-11-02T09:00:00:true',
    ])
    expect(groups[1]!.items).toEqual([{ kind: 'sighting', sighting: { id: 's2', foundAt: '2026-10-30T12:00:00' } }])
  })
})
