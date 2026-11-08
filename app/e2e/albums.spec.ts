import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

interface Seed {
  speciesId: string
  foundAt?: string
  recognizer?: string
}

/**
 * Put cards straight into the app's IndexedDB (Dexie database "floradeck", schema v1), each with a
 * small real image, so a test can start from a known collection. Returns the card ids.
 */
async function seed(page: Page, cards: Seed[]): Promise<string[]> {
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

async function settled(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'))
}

test('a colour album shows every species, the legendary one apart, with filters', async ({ page }) => {
  await seed(page, [{ speciesId: 'bellis-perennis' }, { speciesId: 'leontopodium-nivale' }])
  await page.getByRole('link', { name: /Fiori bianchi/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Fiori bianchi' })).toBeVisible()
  await expect(page.getByText('2 di 45')).toBeVisible()
  const tiles = page.getByRole('list', { name: 'Carte di Fiori bianchi' }).getByRole('link')
  await expect(tiles).toHaveCount(44)
  await expect(page.getByRole('link', { name: /^Stella alpina leggendaria dell'album, trovata/ })).toBeVisible()
  await expect(tiles.first()).toHaveAccessibleName('01 Pratolina trovata')

  await page.getByRole('button', { name: 'Trovate' }).click()
  await expect(tiles).toHaveCount(1)
  await page.getByRole('button', { name: 'Da trovare' }).click()
  await expect(tiles).toHaveCount(43)
  await expect(page.getByRole('link', { name: /leggendaria dell'album/ })).toHaveCount(0)
  // The album page stays under the Album tab.
  await expect(page.getByRole('navigation', { name: 'Sezioni' }).getByRole('link', { name: 'Album' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('a white-and-pink flower is in both albums, and one card fills both', async ({ page }) => {
  await seed(page, [{ speciesId: 'bellis-perennis' }])
  for (const album of ['Fiori bianchi', 'Fiori rosa']) {
    await page.goto('./album')
    await page.getByRole('link', { name: new RegExp(album) }).click()
    await expect(page.getByRole('link', { name: /Pratolina trovata/ })).toBeVisible()
  }
  await page.goto('./album')
  await expect(page.getByText('1 specie trovata su 210, in 6 album')).toBeVisible()
})

test('a species still to find opens its sheet with name, season and plate', async ({ page }) => {
  await page.goto('./album/gialli')
  await page.getByRole('link', { name: /Primula odorosa da trovare/ }).click()
  await expect(page).toHaveURL(/\/specie\/primula-veris$/)
  await expect(page.getByText('Da trovare')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Primula odorosa' })).toBeVisible()
  await expect(page.getByText(/^In fiore: /)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Vai a cercarla' })).toBeVisible()
  // Someone else's good photo of the species, with its credit.
  await expect(page.getByRole('img', { name: /fotografata da un'altra persona/ })).toBeAttached()
  await expect(page.getByText(/^Foto: .+ · CC(0| BY| BY-SA) · iNaturalist$/)).toBeAttached()
  await page.getByRole('button', { name: 'Chiudi' }).click()
  await expect(page).toHaveURL(/\/album\/gialli$/)
})

test('each legendary species sits in its own album and has a page', async ({ page }) => {
  await page.goto('./specie/cypripedium-calceolus')
  await expect(page.getByRole('heading', { level: 1, name: 'Scarpetta di Venere' })).toBeVisible()
  await expect(page.getByText('Leggendaria', { exact: true })).toBeVisible()
  await expect(page.getByText(/^Fiori gialli · 41 di 41$/)).toBeVisible()
})

test('"Metti nell\'album" lands on the album and fills the new slot', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => {
    localStorage.setItem('floradeck:recognizer', 'mock')
    localStorage.setItem('floradeck:mock-scenario', 'sure')
  })
  await page.reload()
  const buffer = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 800
    c.height = 600
    c.getContext('2d')!.fillRect(0, 0, 800, 600)
    return c.toDataURL('image/jpeg')
  })
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'f.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(buffer.split(',')[1]!, 'base64') })
  await expect(page).toHaveURL(/\/carta\//)
  await page.getByRole('link', { name: "Metti nell'album" }).click()
  await expect(page).toHaveURL(/\/album\/[a-z-]+$/)
  await expect(page.locator('[data-filling]')).toHaveCount(1)
  await expect(page.locator('[data-filling]')).toHaveAccessibleName(/ trovata/)
  // Back from the album returns to the camera, not to the card again.
  await page.getByRole('button', { name: 'Indietro' }).click()
  await expect(page).toHaveURL(/\/floradeck\/$/)
})

test('duplicates: the second photo can become the cover', async ({ page }) => {
  const [first, second] = await seed(page, [{ speciesId: 'bellis-perennis' }, { speciesId: 'bellis-perennis' }])
  await expect(page.getByText(/1 doppione/)).toBeVisible()
  await page.goto(`./carta/${second}`)
  await expect(page.getByRole('heading', { name: 'Le tue foto (2)' })).toBeVisible()
  await expect(page.getByRole('link', { name: /copertina$/ })).toHaveAttribute('href', new RegExp(first!))
  await page.getByRole('button', { name: 'Usa questa foto come copertina' }).click()
  await expect(page.getByRole('button', { name: 'Usa questa foto come copertina' })).toHaveCount(0)
  await page.goto('./album/bianchi')
  await expect(page.getByRole('link', { name: /^01 Pratolina trovata, 1 doppione/ })).toHaveAttribute(
    'href',
    new RegExp(second!),
  )
})

test('the diary lists discoveries by month, newest first', async ({ page }) => {
  await seed(page, [
    { speciesId: 'bellis-perennis', foundAt: '2026-05-03T10:00:00Z' },
    { speciesId: 'papaver-rhoeas', foundAt: '2026-06-10T10:00:00Z' },
    { speciesId: 'bellis-perennis', foundAt: '2026-06-12T10:00:00Z' },
  ])
  await page.getByRole('navigation', { name: 'Sezioni' }).getByRole('link', { name: 'Diario' }).click()
  await expect(page.getByText('3 scoperte, dalla più recente.')).toBeVisible()
  const months = page.getByRole('heading', { level: 2 })
  await expect(months).toHaveText(['Giugno 2026', 'Maggio 2026'])
  const june = page.getByRole('region', { name: 'Giugno 2026' }).getByRole('link')
  await expect(june.first()).toContainText('Pratolina')
  await expect(june.first()).toContainText('Doppione')
})

test('a completed album says so on the list and on its page', async ({ page }) => {
  const zone = JSON.parse(await readFile(new URL('../../catalog/species.json', import.meta.url), 'utf8')) as Array<{
    id: string
    albums: Array<{ albumId: string }>
  }>
  const ids = zone
    .filter((entry) => entry.albums.some((m) => m.albumId === 'blu-azzurri'))
    .map((entry) => ({ speciesId: entry.id }))
  await seed(page, ids)
  const row = page.getByRole('link', { name: /Blu e azzurri/ })
  await expect(row.getByText('Completo')).toBeVisible()
  await row.click()
  await expect(page.getByText(/Album completato: hai trovato tutte le \d+ specie/)).toBeVisible()
})

test('backup: save, wipe the phone, restore', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'android', 'downloads are checked in Chrome')
  // Force the download path: Chrome on Windows would otherwise open the system share sheet.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined })
  })
  await seed(page, [{ speciesId: 'papaver-rhoeas', recognizer: 'model-1' }])
  await page.goto('./impostazioni')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Salva un backup' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toMatch(/^floradeck-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const file = testInfo.outputPath('backup.json')
  await download.saveAs(file)
  await expect(page.getByText('Backup pronto: 1 carta.')).toBeVisible()

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('floradeck')
        request.onsuccess = () => resolve()
        request.onblocked = () => resolve()
      }),
  )
  await page.reload()
  await page.locator('input[accept*="json"]').setInputFiles(file)
  await expect(page.getByText('Ripristinate 1 carta.')).toBeVisible()
  await page.locator('input[accept*="json"]').setInputFiles(file)
  await expect(page.getByText('Nessuna carta nuova: erano già tutte qui.')).toBeVisible()
  await page.goto('./album')
  await expect(page.getByText('1 specie trovata su 210, in 6 album')).toBeVisible()
})

test('a file that is not a backup is refused', async ({ page }) => {
  await page.goto('./impostazioni')
  await page
    .locator('input[accept*="json"]')
    .setInputFiles({ name: 'altro.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') })
  await expect(page.getByText('Questo file non è un backup di FloraDeck.')).toBeVisible()
})

test('the stand-in recogniser\'s cards can be deleted, real ones stay', async ({ page }) => {
  await seed(page, [{ speciesId: 'bellis-perennis' }, { speciesId: 'papaver-rhoeas', recognizer: 'model-1' }])
  await page.goto('./impostazioni')
  await expect(page.getByText(/Ora ce ne sono 1\./)).toBeVisible()
  await page.getByRole('button', { name: 'Elimina le carte di prova' }).click()
  const sheet = page.getByRole('dialog', { name: 'Eliminare la carta di prova?' })
  await sheet.getByRole('button', { name: 'Elimina' }).click()
  await expect(page.getByText('Eliminate 1 carta di prova.')).toBeVisible()
  await page.goto('./album')
  await expect(page.getByText('1 specie trovata su 210, in 6 album')).toBeVisible()
})

test('a legendary card, once found, shows on the album list', async ({ page }) => {
  const [id] = await seed(page, [{ speciesId: 'cypripedium-calceolus' }])
  await expect(page.getByText('Leggendarie: 1 di 6, una per album.')).toBeVisible()
  const row = page.getByRole('link', { name: /Fiori gialli/ })
  await expect(row.getByText('Leggendaria trovata')).toBeVisible()
  await page.goto(`./carta/${id}`)
  await expect(page.getByText('Leggendaria', { exact: true })).toBeVisible()
  await expect(page.locator('.holo')).toHaveCount(1)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`album, species, card and diary screens have no WCAG A/AA violations (${colorScheme})`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'android', 'scanned on the Android project only')
    await page.emulateMedia({ colorScheme })
    const [card] = await seed(page, [{ speciesId: 'fritillaria' }, { speciesId: 'bellis-perennis' }, { speciesId: 'bellis-perennis' }])
    for (const path of ['album', 'album/bianchi', 'specie/primula-veris', `carta/${card}`, 'diario', 'impostazioni']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await settled(page)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.map((node) => node.target.join(' ')).join(', ')}`),
        path,
      ).toEqual([])
    }
  })
}

test('a card can be deleted, and its species is missing again', async ({ page }) => {
  const [id] = await seed(page, [{ speciesId: 'papaver-rhoeas' }])
  await page.goto(`./carta/${id}`)
  await page.getByRole('button', { name: 'Elimina questa carta' }).click()
  const sheet = page.getByRole('dialog', { name: 'Eliminare questa carta?' })
  await expect(sheet.getByText(/torna tra le specie da trovare/)).toBeVisible()
  await sheet.getByRole('button', { name: 'Elimina' }).click()
  await expect(page).toHaveURL(/\/album\/rossi-arancio$/)
  await expect(page.getByText('0 di 34')).toBeVisible()
})
