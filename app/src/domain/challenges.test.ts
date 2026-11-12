import { describe, expect, it } from 'vitest'
import { albums, species, speciesById } from './catalog'
import { challengeProgress, ownedBefore, weekOf, weeklyChallenges } from './challenges'

describe('weekly challenges', () => {
  it('finds the ISO week, from Monday to Monday', () => {
    const week = weekOf(new Date(2026, 10, 12, 15))
    expect(week.key).toBe('2026-W46')
    expect(week.start).toEqual(new Date(2026, 10, 9))
    expect(week.end).toEqual(new Date(2026, 10, 16))
    expect(weekOf(new Date(2027, 0, 1)).key).toBe('2026-W53')
    expect(weekOf(new Date(2026, 0, 1)).key).toBe('2026-W01')
  })

  it('gives the same three challenges all week, and different ones another week', () => {
    const context = { ownedBefore: new Set<string>(), partnerName: 'Anna' }
    const monday = weeklyChallenges(weekOf(new Date(2026, 4, 11)), context)
    const sunday = weeklyChallenges(weekOf(new Date(2026, 4, 17, 22)), context)
    expect(sunday).toEqual(monday)
    expect(monday).toHaveLength(3)
    expect(new Set(monday.map((challenge) => challenge.kind)).size).toBe(3)
    expect(monday[2]).toMatchObject({ kind: 'gift', title: 'Regala una carta a Anna' })
    const others = [18, 25].map((day) => weeklyChallenges(weekOf(new Date(2026, 4, day)), context))
    expect(others.some((week) => JSON.stringify(week) !== JSON.stringify(monday))).toBe(true)
  })

  it('asks only for what is in season, never for a legendary card or one already found', () => {
    const legendary = new Set(albums.map((album) => album.legendarySpeciesId))
    for (let month = 0; month < 12; month++) {
      const week = weekOf(new Date(2026, month, 15))
      const owned = new Set(species.slice(0, 40).map((entry) => entry.id))
      for (const challenge of weeklyChallenges(week, { ownedBefore: owned })) {
        if (challenge.kind !== 'species') continue
        const entry = speciesById(challenge.speciesId!)!
        expect(entry.bloomMonths).toContain(week.start.getMonth() + 1)
        expect(legendary.has(entry.id)).toBe(false)
        expect(owned.has(entry.id)).toBe(false)
      }
    }
  })

  it('counts this week’s own finds, not received gifts nor last week', () => {
    const week = weekOf(new Date(2026, 4, 13))
    const cards = [
      { speciesId: 'bellis-perennis', foundAt: new Date(2026, 4, 4).toISOString() },
      { speciesId: 'bellis-perennis', foundAt: new Date(2026, 4, 12).toISOString() },
      { speciesId: 'papaver-rhoeas', foundAt: new Date(2026, 4, 13).toISOString() },
      { speciesId: 'cichorium-intybus', foundAt: new Date(2026, 4, 14).toISOString(), source: 'gift' },
    ]
    const before = ownedBefore(cards, week)
    expect([...before]).toEqual(['bellis-perennis'])
    const data = { cards, ownedBefore: before, giftsGiven: [new Date(2026, 4, 15).toISOString()] }
    expect(challengeProgress({ id: 'count', kind: 'count', title: '', hint: '', target: 3 }, week, data)).toBe(2)
    expect(challengeProgress({ id: 'new', kind: 'new', title: '', hint: '', target: 1 }, week, data)).toBe(1)
    expect(challengeProgress({ id: 'album:rossi-arancio', kind: 'album', title: '', hint: '', target: 1, albumId: 'rossi-arancio' }, week, data)).toBe(1)
    expect(challengeProgress({ id: 'species:x', kind: 'species', title: '', hint: '', target: 1, speciesId: 'cichorium-intybus' }, week, data)).toBe(0)
    expect(challengeProgress({ id: 'gift', kind: 'gift', title: '', hint: '', target: 1 }, week, data)).toBe(1)
  })
})
