import Dexie, { type EntityTable } from 'dexie'

/**
 * Schema v1. Phase 4 stores the first real cards: from now on a new index or table is a new Dexie
 * version with a migration. Fields that are not indexed can be added without one.
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
  source?: 'camera' | 'gallery'
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
}

export class FloraDeckDB extends Dexie {
  cards!: EntityTable<CardRecord, 'id'>
  photos!: EntityTable<PhotoRecord, 'id'>
  settings!: EntityTable<SettingRecord, 'key'>
  importedGifts!: EntityTable<ImportedGiftRecord, 'giftId'>

  constructor(name = 'floradeck') {
    super(name)
    this.version(1).stores({
      cards: 'id, speciesId, foundAt',
      photos: 'id',
      settings: 'key',
      importedGifts: 'giftId',
    })
  }
}

export const db = new FloraDeckDB()
