import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import type { PreparedPhoto } from '../photo/photo'
import { decodeGift, encodeGift, type Gift, type Snapshot } from '../domain/share'
import { db as defaultDb, type CardRecord, type FloraDeckDB, type ImportedGiftRecord, type SentGiftRecord } from './db'

/** This phone's player: a stable id (made once), a display name and a colour. */
export interface Profile {
  id: string
  name: string
  colour: string
}

export const PROFILE_COLOURS = ['#a83e2b', '#c9a24a', '#3d5fb8', '#5b7a3a', '#b45f8a', '#2f6f73'] as const

const PROFILE_KEY = 'profile'
const PARTNER_KEY = 'partner'

async function readProfile(database: FloraDeckDB): Promise<Profile | null> {
  const row = await database.settings.get(PROFILE_KEY)
  const stored = row?.value as Partial<Profile> | undefined
  return stored?.id ? { id: stored.id, name: stored.name ?? '', colour: stored.colour ?? PROFILE_COLOURS[0] } : null
}

/** This phone's profile, made on first use. */
export async function getProfile(database: FloraDeckDB = defaultDb): Promise<Profile> {
  return database.transaction('rw', database.settings, async () => {
    const existing = await readProfile(database)
    if (existing) return existing
    // A random colour, so two new phones rarely start with the same one.
    const colour = PROFILE_COLOURS[crypto.getRandomValues(new Uint8Array(1))[0]! % PROFILE_COLOURS.length]!
    const profile: Profile = { id: crypto.randomUUID(), name: '', colour }
    await database.settings.put({ key: PROFILE_KEY, value: profile })
    return profile
  })
}

export async function saveProfile(changes: Partial<Omit<Profile, 'id'>>, database: FloraDeckDB = defaultDb): Promise<Profile> {
  const profile = { ...(await getProfile(database)), ...changes }
  profile.name = profile.name.trim().slice(0, 40)
  await database.settings.put({ key: PROFILE_KEY, value: profile })
  return profile
}

/** undefined while loading. Live queries may not write, so a missing profile is made outside. */
export function useProfile(): Profile | undefined {
  const profile = useLiveQuery(() => readProfile(defaultDb), [], undefined)
  useEffect(() => {
    if (profile === null) void getProfile()
  }, [profile])
  return profile ?? undefined
}

/** The partner's last progress snapshot (read-only), or undefined before pairing. */
export async function getPartner(database: FloraDeckDB = defaultDb): Promise<Snapshot | undefined> {
  return (await database.settings.get(PARTNER_KEY))?.value as Snapshot | undefined
}

export class CoupleError extends Error {}

export async function savePartner(snapshot: Snapshot, database: FloraDeckDB = defaultDb): Promise<void> {
  const me = await getProfile(database)
  if (snapshot.profileId === me.id) throw new CoupleError('Questi sono i tuoi progressi: falli leggere all’altro telefono.')
  await database.settings.put({ key: PARTNER_KEY, value: snapshot })
}

export async function forgetPartner(database: FloraDeckDB = defaultDb): Promise<void> {
  await database.settings.delete(PARTNER_KEY)
}

/** null while loading; undefined when not paired yet. */
export function usePartner(): Snapshot | undefined | null {
  return useLiveQuery(async () => (await getPartner()) ?? undefined, [], null)
}

// ---------- Gifts ----------

export class GiftError extends Error {}

/**
 * Turn a card into a gift: any card, the last of its species too (then the species is missing again,
 * as after deleting it). The card and its photo leave this collection at once, so a card cannot be
 * given twice; the link waits in sentGifts until it has been sent, then only the chat keeps it.
 * `photo` is the gift's small photo (under 18 KB), prepared by the caller.
 */
export async function createGift(
  input: { cardId: string; message: string; photo: { type: string; bytes: Uint8Array } },
  database: FloraDeckDB = defaultDb,
  now = new Date(),
): Promise<SentGiftRecord> {
  const profile = await getProfile(database)
  return database.transaction('rw', [database.cards, database.photos, database.settings, database.sentGifts], async () => {
    const card = await database.cards.get(input.cardId)
    if (!card) throw new GiftError('Questa carta non c’è più.')
    const gift: Gift = {
      giftId: crypto.randomUUID(),
      speciesId: card.speciesId,
      from: profile.name,
      fromId: profile.id,
      message: input.message.trim().slice(0, 200),
      foundAt: card.foundAt,
      sentAt: now.toISOString(),
      photo: input.photo,
    }
    const record: SentGiftRecord = {
      giftId: gift.giftId,
      speciesId: gift.speciesId,
      createdAt: gift.sentAt,
      message: gift.message,
      payload: encodeGift(gift),
    }
    await database.sentGifts.add(record)
    if (card.photoId) await database.photos.delete(card.photoId)
    await database.cards.delete(card.id)
    const coverKey = `cover:${card.speciesId}`
    const cover = await database.settings.get(coverKey)
    if (cover && String(cover.value) === card.id) await database.settings.delete(coverKey)
    return record
  })
}

export type GiftCheck =
  | { status: 'new'; gift: Gift }
  | { status: 'imported'; gift: Gift; cardId?: string }
  | { status: 'own'; gift: Gift }

/** What happens if this phone opens a gift link: new, already received, or one it gave itself. */
export async function checkGift(text: string, database: FloraDeckDB = defaultDb): Promise<GiftCheck> {
  const gift = decodeGift(text)
  const profile = await getProfile(database)
  if (gift.fromId === profile.id || (await database.sentGifts.get(gift.giftId))) return { status: 'own', gift }
  const imported = await database.importedGifts.get(gift.giftId)
  if (imported) return { status: 'imported', gift, cardId: imported.cardId }
  return { status: 'new', gift }
}

/** Add a received gift as a card; the giftId is recorded so the same link never counts twice. */
export async function importGift(gift: Gift, photo: PreparedPhoto, database: FloraDeckDB = defaultDb, now = new Date()): Promise<CardRecord> {
  const profile = await getProfile(database)
  if (gift.fromId === profile.id) throw new GiftError('È un regalo che hai fatto tu: mandalo all’altro telefono.')
  const [image, thumbnail] = await Promise.all([photo.image.arrayBuffer(), photo.thumbnail.arrayBuffer()])
  return database.transaction('rw', [database.cards, database.photos, database.importedGifts, database.sentGifts], async () => {
    if (await database.sentGifts.get(gift.giftId)) throw new GiftError('È un regalo che hai fatto tu: mandalo all’altro telefono.')
    if (await database.importedGifts.get(gift.giftId)) throw new GiftError('Questo regalo è già nella tua collezione.')
    const photoId = crypto.randomUUID()
    await database.photos.add({
      id: photoId,
      image,
      imageType: photo.image.type,
      thumbnail,
      thumbnailType: photo.thumbnail.type,
      width: photo.width,
      height: photo.height,
    })
    const card: CardRecord = {
      id: crypto.randomUUID(),
      speciesId: gift.speciesId,
      foundAt: gift.foundAt || now.toISOString(),
      photoId,
      source: 'gift',
      giftFrom: gift.from,
      giftMessage: gift.message,
      giftId: gift.giftId,
      receivedAt: now.toISOString(),
    }
    await database.cards.add(card)
    const record: ImportedGiftRecord = { giftId: gift.giftId, importedAt: now.toISOString(), from: gift.from, speciesId: gift.speciesId, cardId: card.id }
    await database.importedGifts.add(record)
    return card
  })
}

/** Once the link has left the phone (share sheet, copy or file) the gift is not kept: the chat has it. */
export async function markGiftSent(giftId: string, database: FloraDeckDB = defaultDb): Promise<void> {
  await database.sentGifts.delete(giftId)
}

/** Gifts made but not sent yet. */
export function useSentGifts(): SentGiftRecord[] | undefined {
  return useLiveQuery(() => defaultDb.sentGifts.orderBy('createdAt').reverse().toArray(), [])
}
