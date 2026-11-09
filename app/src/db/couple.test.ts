import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decodeGift } from '../domain/share'
import { createBackup, parseBackup, restoreBackup } from './backup'
import { addCard, getCovers, setCover } from './collection'
import { checkGift, createGift, getPartner, getProfile, importGift, markGiftSent, saveProfile, savePartner } from './couple'
import { FloraDeckDB } from './db'

let alice: FloraDeckDB
let bea: FloraDeckDB

beforeEach(() => {
  alice = new FloraDeckDB(`alice-${crypto.randomUUID()}`)
  bea = new FloraDeckDB(`bea-${crypto.randomUUID()}`)
})

afterEach(async () => {
  await alice.delete()
  await bea.delete()
})

const shot = (speciesId: string) => ({
  speciesId,
  photo: {
    image: new Blob(['big'], { type: 'image/webp' }),
    thumbnail: new Blob(['thumb'], { type: 'image/webp' }),
    width: 1080,
    height: 810,
  },
  identifiedBy: 'model' as const,
  confidence: 0.9,
  recognizer: 'model',
  source: 'camera' as const,
})

const small = { type: 'image/webp', bytes: new Uint8Array([1, 2, 3, 4]) }
const prepared = {
  image: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/webp' }),
  thumbnail: new Blob([new Uint8Array([1, 2])], { type: 'image/webp' }),
  width: 640,
  height: 480,
}

describe('profiles', () => {
  it('makes a stable id once and keeps the name and colour', async () => {
    const first = await getProfile(alice)
    expect((await getProfile(alice)).id).toBe(first.id)
    const named = await saveProfile({ name: '  Alice  ', colour: '#3d5fb8' }, alice)
    expect(named).toEqual({ id: first.id, name: 'Alice', colour: '#3d5fb8' })
  })

  it('refuses its own progress as the partner’s', async () => {
    const me = await getProfile(alice)
    await expect(savePartner({ profileId: me.id, name: 'Alice', colour: '', at: '', found: [] }, alice)).rejects.toThrow(/tuoi progressi/)
    await savePartner({ profileId: 'bea-id', name: 'Bea', colour: '', at: '', found: ['papaver-rhoeas'] }, alice)
    expect((await getPartner(alice))?.name).toBe('Bea')
  })
})

describe('gifts between two phones', () => {
  it('gives a duplicate once: it leaves the sender, arrives once, and never twice', async () => {
    await saveProfile({ name: 'Alice' }, alice)
    await addCard(shot('papaver-rhoeas'), alice)
    const duplicate = await addCard(shot('papaver-rhoeas'), alice)
    await setCover('papaver-rhoeas', duplicate.card.id, alice)

    const sent = await createGift({ cardId: duplicate.card.id, message: 'Pensando a te', photo: small }, alice)
    expect(await alice.cards.count()).toBe(1)
    expect(await alice.photos.count()).toBe(1)
    expect((await getCovers(alice)).has('papaver-rhoeas')).toBe(false)
    await expect(createGift({ cardId: duplicate.card.id, message: '', photo: small }, alice)).rejects.toThrow(/non c’è più/)

    const check = await checkGift(`https://example.test/floradeck/regalo#${sent.payload}`, bea)
    expect(check.status).toBe('new')
    const card = await importGift(check.gift, prepared, bea)
    expect(card).toMatchObject({ speciesId: 'papaver-rhoeas', source: 'gift', giftFrom: 'Alice', giftMessage: 'Pensando a te' })
    expect((await checkGift(sent.payload, bea)).status).toBe('imported')
    await expect(importGift(check.gift, prepared, bea)).rejects.toThrow(/già nella tua collezione/)
    expect(await bea.cards.count()).toBe(1)
  })

  it('gives the last card of a species too: the species is missing again', async () => {
    const only = await addCard(shot('bellis-perennis'), alice)
    const sent = await createGift({ cardId: only.card.id, message: '', photo: small }, alice)
    expect(await alice.cards.where('speciesId').equals('bellis-perennis').count()).toBe(0)
    expect(await alice.photos.count()).toBe(0)
    expect(decodeGift(sent.payload).speciesId).toBe('bellis-perennis')
  })

  it('keeps a gift only until it has been sent', async () => {
    await addCard(shot('papaver-rhoeas'), alice)
    const sent = await createGift({ cardId: (await alice.cards.toArray())[0]!.id, message: '', photo: small }, alice)
    expect(await alice.sentGifts.count()).toBe(1)
    await markGiftSent(sent.giftId, alice)
    expect(await alice.sentGifts.count()).toBe(0)
    // Still its own gift for this phone: the profile id says so.
    expect((await checkGift(sent.payload, alice)).status).toBe('own')
  })

  it('does not let the sender take its own gift back', async () => {
    await addCard(shot('papaver-rhoeas'), alice)
    const duplicate = await addCard(shot('papaver-rhoeas'), alice)
    const sent = await createGift({ cardId: duplicate.card.id, message: '', photo: small }, alice)
    expect((await checkGift(sent.payload, alice)).status).toBe('own')
    await expect(importGift(decodeGift(sent.payload), prepared, alice)).rejects.toThrow(/fatto tu/)
    expect(await alice.cards.count()).toBe(1)
  })
})

describe('schema upgrade', () => {
  it('keeps the cards of a phone on schema 1', async () => {
    const name = `old-${crypto.randomUUID()}`
    const old = new Dexie(name)
    old.version(1).stores({ cards: 'id, speciesId, foundAt', photos: 'id', settings: 'key', importedGifts: 'giftId' })
    await old.table('cards').add({ id: 'c1', speciesId: 'papaver-rhoeas', foundAt: '2026-05-01T10:00:00Z' })
    old.close()
    const upgraded = new FloraDeckDB(name)
    expect(await upgraded.cards.get('c1')).toMatchObject({ speciesId: 'papaver-rhoeas' })
    expect(await upgraded.sentGifts.count()).toBe(0)
    await upgraded.delete()
  })
})

describe('backup and profile', () => {
  it('restores the player on a new phone, replacing the profile that phone made', async () => {
    const original = await saveProfile({ name: 'Alice' }, alice)
    await getProfile(bea)
    await restoreBackup(parseBackup(JSON.stringify(await createBackup('0.8.0', alice))), bea)
    expect(await getProfile(bea)).toEqual(original)
  })
})
