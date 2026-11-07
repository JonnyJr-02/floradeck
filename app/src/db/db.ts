import Dexie, { type EntityTable } from 'dexie'

/**
 * Schema v1 (phase 3). Nothing real is stored before phase 4, so it can still change freely;
 * from then on every change is a new Dexie version with a migration.
 */

/** A card in the collection. A duplicate is simply another card of the same species. */
export interface CardRecord {
  id: string
  speciesId: string
  /** ISO 8601 date and time of the shot. */
  foundAt: string
  photoId?: string
}

/** The user's own photo, resized on the phone (long side 1080 px) with a separate thumbnail. */
export interface PhotoRecord {
  id: string
  image: Blob
  thumbnail: Blob
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
