import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addCard, deleteCard, deleteCardsBy, getCard, getCovers, photoBlob, setCover, type NewCard } from './collection'
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

describe('covers and test cards', () => {
  it('remembers the cover chosen for a species', async () => {
    const first = await addCard(shot('papaver-rhoeas'), db)
    const second = await addCard(shot('papaver-rhoeas'), db)
    expect((await getCovers(db)).size).toBe(0)
    await setCover('papaver-rhoeas', second.card.id, db)
    expect((await getCovers(db)).get('papaver-rhoeas')).toBe(second.card.id)
    await setCover('papaver-rhoeas', first.card.id, db)
    expect((await getCovers(db)).get('papaver-rhoeas')).toBe(first.card.id)
  })

  it('deletes the stand-in recogniser\'s cards with their photos and covers, and nothing else', async () => {
    const mock = await addCard(shot('papaver-rhoeas'), db)
    const real = await addCard(shot('bellis-perennis', { recognizer: '20261108-effnet_b0' }), db)
    await setCover('papaver-rhoeas', mock.card.id, db)
    await setCover('bellis-perennis', real.card.id, db)
    expect(await deleteCardsBy('mock', db)).toBe(1)
    expect(await db.cards.toCollection().primaryKeys()).toEqual([real.card.id])
    expect(await db.photos.count()).toBe(1)
    expect([...(await getCovers(db)).keys()]).toEqual(['bellis-perennis'])
  })
})

describe('deleting a card', () => {
  it('removes the card and its photo, and the species is missing again', async () => {
    const { card } = await addCard(shot('papaver-rhoeas'), db)
    expect(await deleteCard(card.id, db)).toBe(0)
    expect(await db.cards.count()).toBe(0)
    expect(await db.photos.count()).toBe(0)
  })

  it('keeps the other copies and drops a cover that pointed to the deleted card', async () => {
    const first = await addCard(shot('papaver-rhoeas'), db)
    const second = await addCard(shot('papaver-rhoeas'), db)
    await setCover('papaver-rhoeas', second.card.id, db)
    expect(await deleteCard(second.card.id, db)).toBe(1)
    expect((await getCovers(db)).has('papaver-rhoeas')).toBe(false)
    expect((await getCard(first.card.id, db))?.copies).toBe(1)
  })

  it('does nothing for a card that is gone', async () => {
    expect(await deleteCard('missing', db)).toBe(0)
  })
})
