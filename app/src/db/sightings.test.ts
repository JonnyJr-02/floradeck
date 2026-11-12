import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBackup, parseBackup, restoreBackup } from './backup'
import { FloraDeckDB } from './db'
import { addSighting, deleteSighting, renameSighting, sightingName } from './sightings'

let db: FloraDeckDB
let other: FloraDeckDB

beforeEach(() => {
  db = new FloraDeckDB(`sightings-${crypto.randomUUID()}`)
  other = new FloraDeckDB(`sightings-other-${crypto.randomUUID()}`)
})

afterEach(async () => {
  await db.delete()
  await other.delete()
})

const photo = {
  image: new Blob(['big'], { type: 'image/webp' }),
  thumbnail: new Blob(['thumb'], { type: 'image/webp' }),
  width: 1080,
  height: 810,
}

describe('sightings outside the albums', () => {
  it('keeps the photo and the chosen name, renames, and deletes both', async () => {
    const sighting = await addSighting({ scientific: 'Verbascum sinuatum', italian: 'verbasco sinuato', confidence: 0.09, photo, source: 'camera' }, db)
    expect(await db.photos.count()).toBe(1)
    expect(sightingName(sighting)).toBe('Verbasco sinuato')
    await renameSighting(sighting.id, { scientific: 'Anthyllis terniflora', italian: '' }, db)
    const renamed = await db.sightings.get(sighting.id)
    expect(renamed).toMatchObject({ scientific: 'Anthyllis terniflora', italian: '' })
    expect(sightingName(renamed!)).toBe('Anthyllis terniflora')
    expect(await db.cards.count()).toBe(0)
    await deleteSighting(sighting.id, db)
    expect(await db.sightings.count()).toBe(0)
    expect(await db.photos.count()).toBe(0)
  })

  it('travels in the backup', async () => {
    const sighting = await addSighting({ scientific: 'Crepis foetida', italian: '', photo, source: 'gallery' }, db)
    await restoreBackup(parseBackup(JSON.stringify(await createBackup('0.9.0', db))), other)
    expect(await other.sightings.get(sighting.id)).toMatchObject({ scientific: 'Crepis foetida' })
    expect(await other.photos.get(sighting.photoId!)).toBeDefined()
  })
})
