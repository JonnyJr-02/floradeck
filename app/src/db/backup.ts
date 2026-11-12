import {
  db as defaultDb,
  type CardRecord,
  type FloraDeckDB,
  type ImportedGiftRecord,
  type PhotoRecord,
  type SentGiftRecord,
  type SettingRecord,
  type SightingRecord,
} from './db'

/**
 * Full backup as one JSON file: cards, photos (base64), settings (covers) and the gifts already
 * imported, so a restored phone still refuses a gift it redeemed before. Importing merges: what is
 * already on the phone stays, only missing records are added.
 */

export const BACKUP_FORMAT = 'floradeck-backup'
export const BACKUP_VERSION = 1

interface StoredPhoto extends Omit<PhotoRecord, 'image' | 'thumbnail'> {
  image: string
  thumbnail: string
}

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  appVersion: string
  cards: CardRecord[]
  photos: StoredPhoto[]
  settings: SettingRecord[]
  importedGifts: ImportedGiftRecord[]
  /** Since phase 8; older backups have none. Pictures in base64. */
  sentGifts?: StoredSentGift[]
  /** Plants outside the albums kept in the diary (since 2026-11-12). */
  sightings?: SightingRecord[]
}

interface StoredSentGift extends Omit<SentGiftRecord, 'image'> {
  image?: string
}

export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  // Chunks keep String.fromCharCode under the engines' argument limits.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

export function fromBase64(text: string): ArrayBuffer {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export async function createBackup(appVersion: string, database: FloraDeckDB = defaultDb): Promise<Backup> {
  const [cards, photos, settings, importedGifts, sentGifts, sightings] = await Promise.all([
    database.cards.toArray(),
    database.photos.toArray(),
    database.settings.toArray(),
    database.importedGifts.toArray(),
    database.sentGifts.toArray(),
    database.sightings.toArray(),
  ])
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    cards,
    photos: photos.map((photo) => ({ ...photo, image: toBase64(photo.image), thumbnail: toBase64(photo.thumbnail) })),
    settings,
    importedGifts,
    sentGifts: sentGifts.map((gift) => ({ ...gift, image: gift.image ? toBase64(gift.image) : undefined })),
    sightings,
  }
}

export class BackupError extends Error {}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isString = (value: unknown): value is string => typeof value === 'string'

/** Read a backup file's text; throws BackupError with an Italian message when it is not one. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('Questo file non è un backup di FloraDeck.')
  }
  if (!isObject(data) || data.format !== BACKUP_FORMAT) throw new BackupError('Questo file non è un backup di FloraDeck.')
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new BackupError('Questo backup viene da una versione più nuova di FloraDeck: aggiorna l’app e riprova.')
  }
  const lists = ['cards', 'photos', 'settings', 'importedGifts'] as const
  if (!lists.every((key) => Array.isArray(data[key]))) throw new BackupError('Il backup è incompleto.')
  const backup = data as unknown as Backup
  const cardsOk = backup.cards.every((card) => isObject(card) && isString(card.id) && isString(card.speciesId) && isString(card.foundAt))
  const photosOk = backup.photos.every(
    (photo) => isObject(photo) && isString(photo.id) && isString(photo.image) && isString(photo.thumbnail),
  )
  const giftsOk = backup.importedGifts.every((gift) => isObject(gift) && isString(gift.giftId))
  const settingsOk = backup.settings.every((setting) => isObject(setting) && isString(setting.key))
  if (!cardsOk || !photosOk || !giftsOk || !settingsOk) throw new BackupError('Il backup è danneggiato.')
  return backup
}

export interface RestoreResult {
  cardsAdded: number
  cardsAlreadyThere: number
}

/** Merge a backup into the phone's collection in one transaction. */
export async function restoreBackup(backup: Backup, database: FloraDeckDB = defaultDb): Promise<RestoreResult> {
  const photos: PhotoRecord[] = backup.photos.map((photo) => ({
    ...photo,
    image: fromBase64(photo.image),
    thumbnail: fromBase64(photo.thumbnail),
  }))
  const tables = [database.cards, database.photos, database.settings, database.importedGifts, database.sentGifts, database.sightings]
  return database.transaction('rw', tables, async () => {
    const haveCards = new Set(await database.cards.toCollection().primaryKeys())
    const havePhotos = new Set(await database.photos.toCollection().primaryKeys())
    const haveSettings = new Set(await database.settings.toCollection().primaryKeys())
    const haveGifts = new Set(await database.importedGifts.toCollection().primaryKeys())
    const newCards = backup.cards.filter((card) => !haveCards.has(card.id))
    await database.cards.bulkAdd(newCards)
    await database.photos.bulkAdd(photos.filter((photo) => !havePhotos.has(photo.id)))
    await database.settings.bulkAdd(backup.settings.filter((setting) => !haveSettings.has(setting.key)))
    // Restoring onto a new phone is the same player: the backup's profile wins over the one the new
    // phone made on its first start, so the partner and the gifts still recognise them.
    const profile = backup.settings.find((setting) => setting.key === 'profile')
    if (profile) await database.settings.put(profile)
    await database.importedGifts.bulkAdd(backup.importedGifts.filter((gift) => !haveGifts.has(gift.giftId)))
    const haveSent = new Set(await database.sentGifts.toCollection().primaryKeys())
    await database.sentGifts.bulkAdd(
      (backup.sentGifts ?? [])
        .filter((gift) => !haveSent.has(gift.giftId))
        .map((gift) => ({ ...gift, image: gift.image ? fromBase64(gift.image) : undefined })),
    )
    const haveSightings = new Set(await database.sightings.toCollection().primaryKeys())
    await database.sightings.bulkAdd((backup.sightings ?? []).filter((sighting) => !haveSightings.has(sighting.id)))
    return { cardsAdded: newCards.length, cardsAlreadyThere: backup.cards.length - newCards.length }
  })
}

export function backupFileName(date = new Date()): string {
  const day = date.toISOString().slice(0, 10)
  return `floradeck-backup-${day}.json`
}
