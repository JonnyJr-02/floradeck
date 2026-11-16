import { db as defaultDb, type FloraDeckDB } from './db'

/** Phone-only memories of celebrations already played, cleared with the progress. */
export const PROGRESS_FLAGS = ['floradeck:albums-celebrated', 'floradeck:grand-finale', 'floradeck:challenges-celebrated'] as const

/**
 * «Azzera tutti i progressi» (user's request on 2026-11-16): every card and its photo, the diary's
 * plants outside the albums, gifts not sent yet, covers and the gifts log go. What stays: the
 * player (name, colour), the pairing with the other phone, the theme and the downloaded models;
 * and the codes of gifts already received, so an old gift picture cannot be opened a second time.
 */
export async function resetProgress(database: FloraDeckDB = defaultDb): Promise<void> {
  await database.transaction('rw', [database.cards, database.photos, database.sightings, database.sentGifts, database.settings], async () => {
    await database.cards.clear()
    await database.photos.clear()
    await database.sightings.clear()
    await database.sentGifts.clear()
    await database.settings.where('key').startsWith('cover:').delete()
    await database.settings.delete('gifts-given')
  })
  try {
    for (const key of PROGRESS_FLAGS) localStorage.removeItem(key)
  } catch {
    // No localStorage (private mode): nothing to clear.
  }
}
