import { albums as allAlbums, species as allSpecies, type Album, type Species } from './catalog'
import type { CardLike } from './collection'

/**
 * Weekly challenges (SPEC, optional; phase 9): three small goals a week, made on the phone from the
 * season and the collection. Same week, same challenges (seeded by the week); no penalty, no
 * notification: they just sit in the Album screen and tick themselves off.
 */

export type ChallengeKind = 'album' | 'species' | 'new' | 'count' | 'gift'

export interface Challenge {
  id: string
  kind: ChallengeKind
  title: string
  hint: string
  target: number
  albumId?: string
  speciesId?: string
}

export interface Week {
  /** "2026-W46" (ISO week). */
  key: string
  /** Monday 00:00 local time, and the next Monday. */
  start: Date
  end: Date
}

/** The ISO week of a date, in local time. */
export function weekOf(date: Date): Week {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  // ISO week number: the week with the year's first Thursday is week 1.
  const thursday = new Date(start)
  thursday.setDate(thursday.getDate() + 3)
  const firstThursday = new Date(thursday.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3)
  const number = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
  return { key: `${thursday.getFullYear()}-W${String(number).padStart(2, '0')}`, start, end }
}

/** A small seeded random generator (mulberry32 over an FNV-1a hash of the seed). */
function random(seed: string): () => number {
  let state = 0x811c9dc5
  for (const char of seed) state = Math.imul(state ^ char.codePointAt(0)!, 0x01000193) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(items: readonly T[], next: () => number): T | undefined => items[Math.floor(next() * items.length)]

const COLOUR_GOALS: Record<string, string> = {
  bianchi: 'Trova un fiore bianco',
  gialli: 'Trova un fiore giallo',
  rosa: 'Trova un fiore rosa',
  'rossi-arancio': 'Trova un fiore o una bacca rossa o arancio',
  viola: 'Trova un fiore viola o lilla',
  'blu-azzurri': 'Trova un fiore blu o azzurro',
}

export interface ChallengeContext {
  /** Species found before the week started. */
  ownedBefore: ReadonlySet<string>
  /** The partner's name, when the phones are paired (the gift challenge needs someone to give to). */
  partnerName?: string
  catalogue?: readonly Species[]
  albums?: readonly Album[]
}

const inSeason = (entry: Species, month: number) => entry.bloomMonths.includes(month)

/** The three challenges of a week. */
export function weeklyChallenges(week: Week, context: ChallengeContext): Challenge[] {
  const catalogue = context.catalogue ?? allSpecies
  const albums = context.albums ?? allAlbums
  const month = week.start.getMonth() + 1
  const next = random(week.key)
  const out: Challenge[] = []
  const count: Challenge = {
    id: 'count',
    kind: 'count',
    title: 'Trova 3 carte',
    hint: 'Valgono anche i doppioni, non i regali ricevuti.',
    target: 3,
  }
  const fresh: Challenge = {
    id: 'new',
    kind: 'new',
    title: 'Trova una specie che non hai ancora',
    hint: 'Una carta nuova per i tuoi album.',
    target: 1,
  }

  // 1. A colour, among the albums with something in flower (or in fruit) this month.
  const lively = albums.filter(
    (album) => catalogue.filter((entry) => entry.albums.some((m) => m.albumId === album.id) && inSeason(entry, month)).length >= 2,
  )
  const album = pick(lively, next)
  out.push(
    album
      ? {
          id: `album:${album.id}`,
          kind: 'album',
          title: COLOUR_GOALS[album.id] ?? `Trova una carta di «${album.name}»`,
          hint: `Vale qualsiasi carta di «${album.name}», anche un doppione.`,
          target: 1,
          albumId: album.id,
        }
      : count,
  )

  // 2. One missing species that is in season now (never the legendary ones: those are a surprise).
  const legendary = new Set(albums.map((entry) => entry.legendarySpeciesId))
  const missing = catalogue.filter((entry) => !context.ownedBefore.has(entry.id) && !legendary.has(entry.id) && inSeason(entry, month))
  const target = pick(missing, next)
  out.push(
    target
      ? {
          id: `species:${target.id}`,
          kind: 'species',
          title: `Cerca ${target.commonNameIt}`,
          hint: target.phenology === 'fruiting' ? 'Ha i frutti in questo periodo.' : 'È in fiore in questo periodo.',
          target: 1,
          speciesId: target.id,
        }
      : fresh,
  )

  // 3. A gift when there is someone to give it to; otherwise more finds.
  const used = new Set(out.map((challenge) => challenge.kind))
  if (context.partnerName) {
    out.push({
      id: 'gift',
      kind: 'gift',
      title: `Regala una carta a ${context.partnerName}`,
      hint: 'Apri una carta e tocca «Regala questa carta».',
      target: 1,
    })
  } else if (!used.has('new')) out.push(fresh)
  else out.push(count)
  return out
}

export interface ChallengeCard extends CardLike {
  source?: string
}

/** How far a challenge has got this week (capped at its target). */
export function challengeProgress(
  challenge: Challenge,
  week: Week,
  data: {
    cards: readonly ChallengeCard[]
    ownedBefore: ReadonlySet<string>
    /** When gifts were made (ISO dates). */
    giftsGiven: readonly string[]
    catalogue?: readonly Species[]
  },
): number {
  const catalogue = data.catalogue ?? allSpecies
  const inWeek = (iso: string) => {
    const time = new Date(iso).getTime()
    return time >= week.start.getTime() && time < week.end.getTime()
  }
  // Found by this player this week: received gifts do not count as finds.
  const finds = data.cards.filter((card) => card.source !== 'gift' && inWeek(card.foundAt))
  let done = 0
  switch (challenge.kind) {
    case 'album': {
      const ids = new Set(catalogue.filter((entry) => entry.albums.some((m) => m.albumId === challenge.albumId)).map((entry) => entry.id))
      done = finds.filter((card) => ids.has(card.speciesId)).length
      break
    }
    case 'species':
      done = finds.filter((card) => card.speciesId === challenge.speciesId).length
      break
    case 'new':
      done = new Set(finds.filter((card) => !data.ownedBefore.has(card.speciesId)).map((card) => card.speciesId)).size
      break
    case 'count':
      done = finds.length
      break
    case 'gift':
      done = data.giftsGiven.filter(inWeek).length
      break
  }
  return Math.min(done, challenge.target)
}

/** Species found before the week started (gifts received count: the card is in the album). */
export function ownedBefore(cards: readonly ChallengeCard[], week: Week): Set<string> {
  return new Set(cards.filter((card) => new Date(card.foundAt).getTime() < week.start.getTime()).map((card) => card.speciesId))
}
