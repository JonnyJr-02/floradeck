import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addCard, getCard, photoBlob, type NewCard } from './collection'
import { FloraDeckDB } from './db'

let db: FloraDeckDB

beforeEach(() => {
  db = new FloraDeckDB(`floradeck-test-${crypto.randomUUID()}`)
})

afterEach(async () => {
  await db.delete()
})

function shot(speciesId: string, overrides: Partial<NewCard> = {}): NewCard {
  return {
    speciesId,
    photo: {
      image: new Blob(['photo'], { type: 'image/jpeg' }),
      thumbnail: new Blob(['thumb'], { type: 'image/jpeg' }),
      width: 1080,
      height: 810,
    },
    identifiedBy: 'model',
    confidence: 0.91,
    recognizer: 'mock',
    source: 'camera',
    ...overrides,
  }
}

describe('adding cards', () => {
  it('stores the card with its photo', async () => {
    const { card, duplicate } = await addCard(shot('papaver-rhoeas', { foundAt: new Date('2026-05-14T10:00:00Z') }), db)
    expect(duplicate).toBe(false)
    expect(card.foundAt).toBe('2026-05-14T10:00:00.000Z')
    const stored = await getCard(card.id, db)
    expect(stored?.card).toEqual(card)
    expect(stored?.photo).toMatchObject({ id: card.photoId, width: 1080, height: 810, imageType: 'image/jpeg' })
    expect(await photoBlob(stored!.photo!).text()).toBe('photo')
    expect(await photoBlob(stored!.photo!, 'thumbnail').text()).toBe('thumb')
    expect(stored?.copies).toBe(1)
  })

  it('marks the second card of a species as a duplicate', async () => {
    await addCard(shot('papaver-rhoeas'), db)
    const second = await addCard(shot('papaver-rhoeas', { identifiedBy: 'user', confidence: 0.55 }), db)
    expect(second.duplicate).toBe(true)
    expect(second.card.identifiedBy).toBe('user')
    expect((await getCard(second.card.id, db))?.copies).toBe(2)
    expect((await addCard(shot('bellis-perennis'), db)).duplicate).toBe(false)
  })

  it('saves nothing when the photo cannot be stored', async () => {
    const empty = new ArrayBuffer(0)
    await db.photos.add({ id: 'taken', image: empty, imageType: '', thumbnail: empty, thumbnailType: '', width: 1, height: 1 })
    const original = crypto.randomUUID
    crypto.randomUUID = () => 'taken' as `${string}-${string}-${string}-${string}-${string}`
    try {
      await expect(addCard(shot('papaver-rhoeas'), db)).rejects.toMatchObject({ name: 'ConstraintError' })
    } finally {
      crypto.randomUUID = original
    }
    expect(await db.cards.count()).toBe(0)
  })

  it('returns null for a card that does not exist', async () => {
    expect(await getCard('missing', db)).toBeNull()
  })
})
