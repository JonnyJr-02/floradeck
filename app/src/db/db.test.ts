import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FloraDeckDB } from './db'

let db: FloraDeckDB

beforeEach(() => {
  db = new FloraDeckDB(`floradeck-test-${crypto.randomUUID()}`)
})

afterEach(async () => {
  await db.delete()
})

describe('FloraDeckDB', () => {
  it('opens schema version 1 with its tables', async () => {
    await db.open()
    expect(db.verno).toBe(1)
    expect(db.tables.map((table) => table.name).sort()).toEqual(['cards', 'importedGifts', 'photos', 'settings'])
  })

  it('stores settings by key', async () => {
    await db.settings.put({ key: 'nickname', value: 'Ada' })
    await db.settings.put({ key: 'nickname', value: 'Bea' })
    expect(await db.settings.get('nickname')).toEqual({ key: 'nickname', value: 'Bea' })
  })

  it('finds every card of a species, duplicates included', async () => {
    await db.cards.bulkAdd([
      { id: 'c1', speciesId: 'papaver-rhoeas', foundAt: '2026-05-14T10:00:00Z' },
      { id: 'c2', speciesId: 'papaver-rhoeas', foundAt: '2026-05-20T09:30:00Z' },
      { id: 'c3', speciesId: 'cichorium-intybus', foundAt: '2026-06-02T17:15:00Z' },
    ])
    expect(await db.cards.where('speciesId').equals('papaver-rhoeas').count()).toBe(2)
  })

  it('refuses to record the same gift twice', async () => {
    await db.importedGifts.add({ giftId: 'gift-1', importedAt: '2026-06-10T12:00:00Z' })
    await expect(db.importedGifts.add({ giftId: 'gift-1', importedAt: '2026-06-11T12:00:00Z' })).rejects.toMatchObject({
      name: 'ConstraintError',
    })
    expect(await db.importedGifts.count()).toBe(1)
  })
})
