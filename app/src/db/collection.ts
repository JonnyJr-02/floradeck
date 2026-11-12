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

export async function toRecord(photo: PreparedPhoto): Promise<PhotoRecord> {
  const [image, thumbnail] = await Promise.all([photo.image.arrayBuffer(), photo.thumbnail.arrayBuffer()])
  return {
    id: crypto.randomUUID(),
    image,
    imageType: photo.image.type,
    thumbnail,
    thumbnailType: photo.thumbnail.type,
    width: photo.width,
    height: photo.height,
  }
}

/** The stored photo (or its thumbnail) as a Blob, ready for URL.createObjectURL. */
export function photoBlob(record: PhotoRecord, size: 'image' | 'thumbnail' = 'image'): Blob {
  return size === 'image'
    ? new Blob([record.image], { type: record.imageType })
    : new Blob([record.thumbnail], { type: record.thumbnailType })
}

/** Store the photo and the card together: either both are saved or neither is. */
export async function addCard(input: NewCard, database: FloraDeckDB = defaultDb): Promise<AddedCard> {
  // Read the bytes before the transaction: an await on anything but the database would end it.
  const photo = await toRecord(input.photo)
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

const COVER_PREFIX = 'cover:'

/** Choose which card stands for its species in the album (stored in the settings table). */
export async function setCover(speciesId: string, cardId: string, database: FloraDeckDB = defaultDb): Promise<void> {
  await database.settings.put({ key: `${COVER_PREFIX}${speciesId}`, value: cardId })
}

export async function getCovers(database: FloraDeckDB = defaultDb): Promise<Map<string, string>> {
  const rows = await database.settings.where('key').startsWith(COVER_PREFIX).toArray()
  return new Map(rows.map((row) => [row.key.slice(COVER_PREFIX.length), String(row.value)]))
}

/** species id → chosen cover card id; empty while loading. */
export function useCovers(): Map<string, string> {
  return useLiveQuery(() => getCovers(), [], new Map<string, string>())
}

/** Thumbnails by photo id, for album tiles and the diary. */
export function usePhotos(photoIds: readonly string[]): Map<string, PhotoRecord> {
  const key = [...photoIds].sort().join(',')
  return useLiveQuery(
    async () => {
      const rows = await defaultDb.photos.bulkGet([...photoIds])
      return new Map(rows.filter((row): row is PhotoRecord => row !== undefined).map((row) => [row.id, row]))
    },
    [key],
    new Map<string, PhotoRecord>(),
  )
}

/** Cards made by a given recogniser ("mock" for the stand-in), with their photos and covers. */
export async function deleteCardsBy(recognizer: string, database: FloraDeckDB = defaultDb): Promise<number> {
  return database.transaction('rw', database.cards, database.photos, database.settings, async () => {
    const cards = await database.cards.filter((card) => card.recognizer === recognizer).toArray()
    const ids = new Set(cards.map((card) => card.id))
    await database.photos.bulkDelete(cards.flatMap((card) => (card.photoId ? [card.photoId] : [])))
    await database.cards.bulkDelete([...ids])
    const covers = await database.settings.where('key').startsWith(COVER_PREFIX).toArray()
    await database.settings.bulkDelete(covers.filter((row) => ids.has(String(row.value))).map((row) => row.key))
    return cards.length
  })
}

export function useCardCountBy(recognizer: string): number {
  return useLiveQuery(() => defaultDb.cards.filter((card) => card.recognizer === recognizer).count(), [recognizer], 0)
}

/** Every card of a species, oldest first; undefined while loading. */
export function useSpeciesCards(speciesId: string): CardRecord[] | undefined {
  return useLiveQuery(() => defaultDb.cards.where('speciesId').equals(speciesId).sortBy('foundAt'), [speciesId])
}

/**
 * Remove one card and its photo, as if it had never been found. If it was the species' chosen
 * cover, the cover falls back to the oldest remaining card. Returns how many cards of the species
 * are left.
 */
export async function deleteCard(id: string, database: FloraDeckDB = defaultDb): Promise<number> {
  return database.transaction('rw', database.cards, database.photos, database.settings, async () => {
    const card = await database.cards.get(id)
    if (!card) return 0
    if (card.photoId) await database.photos.delete(card.photoId)
    await database.cards.delete(id)
    const coverKey = `${COVER_PREFIX}${card.speciesId}`
    const cover = await database.settings.get(coverKey)
    if (cover && String(cover.value) === id) await database.settings.delete(coverKey)
    return database.cards.where('speciesId').equals(card.speciesId).count()
  })
}
