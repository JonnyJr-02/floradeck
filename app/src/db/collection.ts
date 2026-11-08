import { useLiveQuery } from 'dexie-react-hooks'
import type { PreparedPhoto } from '../photo/photo'
import { db as defaultDb, type CardRecord, type FloraDeckDB, type PhotoRecord } from './db'

export interface NewCard {
  speciesId: string
  photo: PreparedPhoto
  identifiedBy: 'model' | 'user'
  confidence: number
  recognizer: string
  source: 'camera' | 'gallery'
  foundAt?: Date
}

export interface AddedCard {
  card: CardRecord
  /** The collection already held this species: the new card is a duplicate. */
  duplicate: boolean
}

/** Store the photo and the card together: either both are saved or neither is. */
export async function addCard(input: NewCard, database: FloraDeckDB = defaultDb): Promise<AddedCard> {
  const photo: PhotoRecord = { id: crypto.randomUUID(), ...input.photo }
  const card: CardRecord = {
    id: crypto.randomUUID(),
    speciesId: input.speciesId,
    foundAt: (input.foundAt ?? new Date()).toISOString(),
    photoId: photo.id,
    identifiedBy: input.identifiedBy,
    confidence: input.confidence,
    recognizer: input.recognizer,
    source: input.source,
  }
  return database.transaction('rw', database.cards, database.photos, async () => {
    const before = await database.cards.where('speciesId').equals(input.speciesId).count()
    await database.photos.add(photo)
    await database.cards.add(card)
    return { card, duplicate: before > 0 }
  })
}

export interface CardWithPhoto {
  card: CardRecord
  photo: PhotoRecord | undefined
  /** How many cards of this species the collection holds, this one included. */
  copies: number
}

export async function getCard(id: string, database: FloraDeckDB = defaultDb): Promise<CardWithPhoto | null> {
  const card = await database.cards.get(id)
  if (!card) return null
  const [photo, copies] = await Promise.all([
    card.photoId ? database.photos.get(card.photoId) : undefined,
    database.cards.where('speciesId').equals(card.speciesId).count(),
  ])
  return { card, photo, copies }
}

/** null while loading; undefined when the card does not exist. */
export function useCard(id: string): CardWithPhoto | null | undefined {
  return useLiveQuery(async () => (await getCard(id)) ?? undefined, [id], null)
}

/** Every card, oldest first; undefined while loading. */
export function useCards(): CardRecord[] | undefined {
  return useLiveQuery(() => defaultDb.cards.orderBy('foundAt').toArray(), [])
}
