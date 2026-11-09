import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { backupFileName, BackupError, createBackup, fromBase64, parseBackup, restoreBackup, toBase64 } from './backup'
import { addCard, getCovers, photoBlob, setCover } from './collection'
import { FloraDeckDB } from './db'

let source: FloraDeckDB
let target: FloraDeckDB

beforeEach(() => {
  source = new FloraDeckDB(`floradeck-src-${crypto.randomUUID()}`)
  target = new FloraDeckDB(`floradeck-dst-${crypto.randomUUID()}`)
})

afterEach(async () => {
  await source.delete()
  await target.delete()
})

const shot = (speciesId: string, bytes: string) => ({
  speciesId,
  photo: {
    image: new Blob([bytes], { type: 'image/webp' }),
    thumbnail: new Blob([`${bytes}-thumb`], { type: 'image/webp' }),
    width: 1080,
    height: 810,
  },
  identifiedBy: 'model' as const,
  confidence: 0.9,
  recognizer: 'mock',
  source: 'camera' as const,
})

describe('backup', () => {
  it('round-trips bytes through base64, large ones included', () => {
    const bytes = new Uint8Array(200_000).map((_, i) => (i * 31) % 256)
    expect(new Uint8Array(fromBase64(toBase64(bytes.buffer)))).toEqual(bytes)
  })

  it('restores cards, photos, covers and redeemed gifts on another phone', async () => {
    const a = await addCard(shot('papaver-rhoeas', 'poppy'), source)
    const b = await addCard(shot('papaver-rhoeas', 'poppy-2'), source)
    await setCover('papaver-rhoeas', b.card.id, source)
    await source.importedGifts.add({ giftId: 'gift-1', importedAt: '2026-11-08T10:00:00Z' })
    await source.sentGifts.add({
      giftId: 'gift-2',
      speciesId: 'papaver-rhoeas',
      createdAt: '2026-11-09T10:00:00Z',
      message: '',
      payload: '{"fd":2}',
      image: new Uint8Array([9, 8, 7]).buffer,
      imageType: 'image/jpeg',
    })

    const text = JSON.stringify(await createBackup('0.5.0', source))
    const result = await restoreBackup(parseBackup(text), target)

    expect(result).toEqual({ cardsAdded: 2, cardsAlreadyThere: 0 })
    expect((await target.cards.get(a.card.id))?.speciesId).toBe('papaver-rhoeas')
    const photo = await target.photos.get(b.card.photoId!)
    expect(await photoBlob(photo!).text()).toBe('poppy-2')
    expect(await photoBlob(photo!, 'thumbnail').text()).toBe('poppy-2-thumb')
    expect((await getCovers(target)).get('papaver-rhoeas')).toBe(b.card.id)
    const pending = await target.sentGifts.get('gift-2')
    expect(pending?.payload).toBe('{"fd":2}')
    expect(Array.from(new Uint8Array(pending!.image!))).toEqual([9, 8, 7])
    // The gift redeemed before the backup is still refused after the restore.
    await expect(target.importedGifts.add({ giftId: 'gift-1', importedAt: 'later' })).rejects.toMatchObject({
      name: 'ConstraintError',
    })
  })

  it('adds nothing the second time and keeps what the phone already had', async () => {
    await addCard(shot('papaver-rhoeas', 'poppy'), source)
    const local = await addCard(shot('bellis-perennis', 'daisy'), target)
    await setCover('bellis-perennis', local.card.id, target)
    const backup = parseBackup(JSON.stringify(await createBackup('0.5.0', source)))

    expect(await restoreBackup(backup, target)).toEqual({ cardsAdded: 1, cardsAlreadyThere: 0 })
    expect(await restoreBackup(backup, target)).toEqual({ cardsAdded: 0, cardsAlreadyThere: 1 })
    expect(await target.cards.count()).toBe(2)
    expect((await getCovers(target)).get('bellis-perennis')).toBe(local.card.id)
  })

  it('refuses files that are not a FloraDeck backup', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError)
    expect(() => parseBackup('{"format":"something-else"}')).toThrow('non è un backup')
    expect(() => parseBackup('{"format":"floradeck-backup","version":99}')).toThrow('più nuova')
    expect(() =>
      parseBackup('{"format":"floradeck-backup","version":1,"cards":[{"id":1}],"photos":[],"settings":[],"importedGifts":[]}'),
    ).toThrow('danneggiato')
  })

  it('names the file with the day', () => {
    expect(backupFileName(new Date('2026-11-08T21:00:00Z'))).toBe('floradeck-backup-2026-11-08.json')
  })
})
