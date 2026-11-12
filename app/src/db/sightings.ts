import { useLiveQuery } from 'dexie-react-hooks'
import type { PreparedPhoto } from '../photo/photo'
import { toRecord } from './collection'
import { db as defaultDb, type FloraDeckDB, type PhotoRecord, type SightingRecord } from './db'

/**
 * Plants outside the albums that the user named with the all-plants model: kept in the diary with
 * their photo (user's request on 2026-11-12). One shot is one sighting: tapping another of the
 * three names renames it rather than adding a second one.
 */

export interface NewSighting {
  scientific: string
  italian: string
  confidence?: number
  photo: PreparedPhoto
  source: 'camera' | 'gallery'
  foundAt?: Date
}

export async function addSighting(input: NewSighting, database: FloraDeckDB = defaultDb): Promise<SightingRecord> {
  const photo = await toRecord(input.photo)
  const sighting: SightingRecord = {
    id: crypto.randomUUID(),
    scientific: input.scientific,
    italian: input.italian,
    foundAt: (input.foundAt ?? new Date()).toISOString(),
    photoId: photo.id,
    confidence: input.confidence,
    source: input.source,
  }
  await database.transaction('rw', database.sightings, database.photos, async () => {
    await database.photos.add(photo)
    await database.sightings.add(sighting)
  })
  return sighting
}

export async function renameSighting(
  id: string,
  name: { scientific: string; italian: string; confidence?: number },
  database: FloraDeckDB = defaultDb,
): Promise<void> {
  await database.sightings.update(id, name)
}

export async function deleteSighting(id: string, database: FloraDeckDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.sightings, database.photos, async () => {
    const sighting = await database.sightings.get(id)
    if (!sighting) return
    if (sighting.photoId) await database.photos.delete(sighting.photoId)
    await database.sightings.delete(id)
  })
}

export function useSightings(): SightingRecord[] | undefined {
  return useLiveQuery(() => defaultDb.sightings.orderBy('foundAt').reverse().toArray(), [])
}

/** null while loading, undefined when it is not there. */
export function useSighting(id: string): { sighting: SightingRecord; photo: PhotoRecord | undefined } | undefined | null {
  return useLiveQuery(
    async () => {
      const sighting = await defaultDb.sightings.get(id)
      if (!sighting) return undefined
      return { sighting, photo: sighting.photoId ? await defaultDb.photos.get(sighting.photoId) : undefined }
    },
    [id],
    null,
  )
}

/** "Verbasco sinuato", or the scientific name when there is no Italian one. */
export function sightingName(sighting: Pick<SightingRecord, 'italian' | 'scientific'>): string {
  return sighting.italian ? sighting.italian.charAt(0).toUpperCase() + sighting.italian.slice(1) : sighting.scientific
}
