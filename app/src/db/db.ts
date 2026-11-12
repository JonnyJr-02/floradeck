import Dexie, { type EntityTable } from 'dexie'

/**
 * Schema v3 (2026-11-12: sightings; v2, phase 8: sentGifts). A new index or table is a new Dexie version; fields that are not
 * indexed can be added without one. Never change an old version's stores: phones upgrade from it.
 */

/** A card in the collection. A duplicate is simply another card of the same species. */
export interface CardRecord {
  id: string
  speciesId: string
  /** ISO 8601 date and time of the shot. */
  foundAt: string
  photoId?: string
  /** Who settled the species: the recogniser on its own, or the user picking one of its proposals. */
  identifiedBy?: 'model' | 'user'
  /** Calibrated probability of the chosen species when it was recognised. */
  confidence?: number
  /** "mock" until the real model ships, then the model version from labels.json. */
  recognizer?: string
  source?: 'camera' | 'gallery' | 'gift'
  /** A card received as a gift: who gave it, their message, the gift id and when it arrived. */
  giftFrom?: string
  giftMessage?: string
  giftId?: string
  receivedAt?: string
}

/**
 * The user's own photo, resized on the phone (long side 1080 px) with a separate thumbnail.
 * Bytes, not Blobs: WebKit refuses Blobs in IndexedDB in some contexts (private browsing,
 * ephemeral sessions), while an ArrayBuffer stores everywhere.
 */
export interface PhotoRecord {
  id: string
  image: ArrayBuffer
  imageType: string
  thumbnail: ArrayBuffer
  thumbnailType: string
  width: number
  height: number
}

export interface SettingRecord {
  key: string
  value: unknown
}

/** Gifts already imported: the same gift link can never be redeemed twice. */
export interface ImportedGiftRecord {
  giftId: string
  importedAt: string
  from?: string
  speciesId?: string
  cardId?: string
}

/**
 * Gifts given: the duplicate left the collection when the gift was made, and the link is kept so
 * it can be sent again (same giftId, so the receiver still imports it once).
 */
export interface SentGiftRecord {
  giftId: string
  speciesId: string
  createdAt: string
  message: string
  /** The gift code inside the picture's QR (since 2026-11-09), or an older gift link's payload (g1.…). */
  payload: string
  /** The gift picture (JPEG), kept until it has been sent; older link gifts have none. */
  image?: ArrayBuffer
  imageType?: string
}

/**
 * A plant outside the albums, named by the all-plants model and kept in the diary when the user
 * taps its name (user's request on 2026-11-12): the photo, the chosen name, the day. Never a card.
 */
export interface SightingRecord {
  id: string
  scientific: string
  /** Italian name when one exists; empty otherwise (never invented). */
  italian: string
  foundAt: string
  photoId?: string
  /** The all-plants model's probability for this name. */
  confidence?: number
  source?: 'camera' | 'gallery'
}

export class FloraDeckDB extends Dexie {
  cards!: EntityTable<CardRecord, 'id'>
  photos!: EntityTable<PhotoRecord, 'id'>
  settings!: EntityTable<SettingRecord, 'key'>
  importedGifts!: EntityTable<ImportedGiftRecord, 'giftId'>
  sentGifts!: EntityTable<SentGiftRecord, 'giftId'>
  sightings!: EntityTable<SightingRecord, 'id'>

  constructor(name = 'floradeck') {
    super(name)
    this.version(1).stores({
      cards: 'id, speciesId, foundAt',
      photos: 'id',
      settings: 'key',
      importedGifts: 'giftId',
    })
    this.version(2).stores({
      sentGifts: 'giftId, createdAt',
    })
    this.version(3).stores({
      sightings: 'id, foundAt',
    })
  }
}

export const db = new FloraDeckDB()
