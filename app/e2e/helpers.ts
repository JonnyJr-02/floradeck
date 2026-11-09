import { expect, type Page } from '@playwright/test'

export interface Seed {
  speciesId: string
  foundAt?: string
  recognizer?: string
}

/**
 * Put cards straight into the app's IndexedDB (Dexie database "floradeck"), each with a
 * small real image, so a test can start from a known collection. Returns the card ids.
 */
export async function seed(page: Page, cards: Seed[]): Promise<string[]> {
  await page.goto('./album')
  await expect(page.getByRole('heading', { level: 1, name: 'Album' })).toBeVisible()
  const ids = await page.evaluate(async (list) => {
    const canvas = document.createElement('canvas')
    canvas.width = 120
    canvas.height = 90
    const g = canvas.getContext('2d')!
    g.fillStyle = '#4f6f2a'
    g.fillRect(0, 0, 120, 90)
    g.fillStyle = '#c8322a'
    g.beginPath()
    g.arc(60, 45, 28, 0, Math.PI * 2)
    g.fill()
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8))
    const bytes = await blob.arrayBuffer()
    // Wait until the app (Dexie) has created its database: opening it first would create an empty one.
    for (let i = 0; i < 100; i++) {
      if ((await indexedDB.databases()).some((info) => info.name === 'floradeck')) break
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('floradeck')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const out: string[] = []
    const tx = db.transaction(['cards', 'photos'], 'readwrite')
    list.forEach((card, i) => {
      const id = crypto.randomUUID()
      const photoId = crypto.randomUUID()
      out.push(id)
      tx.objectStore('photos').add({ id: photoId, image: bytes, imageType: 'image/jpeg', thumbnail: bytes, thumbnailType: 'image/jpeg', width: 120, height: 90 })
      tx.objectStore('cards').add({
        id,
        speciesId: card.speciesId,
        foundAt: card.foundAt ?? new Date(Date.UTC(2026, 4, 1 + i, 10)).toISOString(),
        photoId,
        identifiedBy: 'model',
        confidence: 0.9,
        recognizer: card.recognizer ?? 'mock',
        source: 'gallery',
      })
    })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return out
  }, cards)
  // Dexie's live queries do not see writes made behind its back: start the page afresh.
  await page.reload()
  return ids
}

export async function settled(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'))
}
