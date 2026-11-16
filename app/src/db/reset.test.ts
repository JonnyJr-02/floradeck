import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addCard, setCover } from './collection'
import { getPartner, getProfile, saveProfile, savePartner } from './couple'
import { FloraDeckDB } from './db'
import { resetProgress } from './reset'
import { addSighting } from './sightings'

let db: FloraDeckDB

beforeEach(() => {
  db = new FloraDeckDB(`reset-${crypto.randomUUID()}`)
})

afterEach(async () => {
  await db.delete()
})

const photo = {
  image: new Blob(['big'], { type: 'image/webp' }),
  thumbnail: new Blob(['thumb'], { type: 'image/webp' }),
  width: 1080,
  height: 810,
}

describe('resetting the progress', () => {
  it('empties the collection and keeps the player, the pairing and the received gift codes', async () => {
    await saveProfile({ name: 'Gianni' }, db)
    await savePartner({ profileId: 'anna', name: 'Anna', colour: '', at: '', found: [] }, db)
    const { card } = await addCard({ speciesId: 'papaver-rhoeas', photo, identifiedBy: 'model', confidence: 0.9, recognizer: 'test', source: 'camera' }, db)
    await setCover('papaver-rhoeas', card.id, db)
    await addSighting({ scientific: 'Crepis foetida', italian: '', photo, source: 'camera' }, db)
    await db.importedGifts.add({ giftId: 'gift-1', importedAt: '2026-11-10T10:00:00Z' })
    await db.settings.put({ key: 'gifts-given', value: ['2026-11-10T10:00:00Z'] })

    await resetProgress(db)

    expect(await db.cards.count()).toBe(0)
    expect(await db.photos.count()).toBe(0)
    expect(await db.sightings.count()).toBe(0)
    expect(await db.settings.get('cover:papaver-rhoeas')).toBeUndefined()
    expect(await db.settings.get('gifts-given')).toBeUndefined()
    expect((await getProfile(db)).name).toBe('Gianni')
    expect((await getPartner(db))?.name).toBe('Anna')
    expect(await db.importedGifts.count()).toBe(1)
  })
})
