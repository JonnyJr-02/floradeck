import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test'
import jsQR from 'jsqr'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { seed, settled } from './helpers'

/**
 * Two phones in one test: two browser contexts with separate storage, the way two phones keep
 * separate collections. The share sheet is replaced by a stub that keeps the shared picture, so the
 * test can carry it to the other phone like a chat would.
 */
async function phone(browser: Browser, testInfo: TestInfo): Promise<Page> {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, baseURL } = testInfo.project.use
  const context = await browser.newContext({
    viewport,
    userAgent,
    deviceScaleFactor,
    isMobile,
    hasTouch,
    baseURL,
    storageState: 'e2e/storage.json',
  })
  const page = await context.newPage()
  await stubShare(page)
  return page
}

function stubShare(page: Page) {
  return page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        ;(window as unknown as { __shared: ShareData[] }).__shared = [data]
      },
    })
  })
}

/**
 * The picture last shared, squeezed the way WhatsApp does (1600 px tall at most, JPEG quality 0.6),
 * as the bytes the other phone saves to its gallery.
 */
async function sharedPicture(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const shared = (window as unknown as { __shared?: ShareData[] }).__shared ?? []
    const file = shared[shared.length - 1]?.files?.[0]
    if (!file) return ''
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.6))
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
  })
  expect(base64).not.toBe('')
  return Buffer.from(base64, 'base64')
}

async function openGift(page: Page, picture: Buffer) {
  await page.goto('./coppia')
  await page.getByRole('button', { name: 'Apri un regalo' }).click()
  const sheet = page.getByRole('dialog', { name: 'Apri un regalo' })
  await sheet.locator('input[type=file]').setInputFiles({ name: 'IMG-20261109-WA0001.jpg', mimeType: 'image/jpeg', buffer: picture })
  return sheet
}

async function axe(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'android') return
  await settled(page)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

test('a gift travels as a picture: it leaves the sender, arrives once, and pairs the phones', async ({ page, browser }, testInfo) => {
  test.setTimeout(60_000)
  await stubShare(page)
  const [, duplicate] = await seed(page, [{ speciesId: 'papaver-rhoeas' }, { speciesId: 'papaver-rhoeas' }, { speciesId: 'bellis-perennis' }])

  // Phone A gives the duplicate.
  await page.goto(`./carta/${duplicate}`)
  await page.getByRole('button', { name: 'Regala questa carta' }).click()
  const sheet = page.getByRole('dialog', { name: 'Regala questa carta' })
  await sheet.getByLabel('Il tuo nome').fill('Gianni')
  await sheet.getByLabel('Un messaggio, se vuoi').fill('Il primo di novembre, per te ❤️')
  await sheet.getByRole('button', { name: 'Crea il regalo' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Regalo pronto' })).toBeVisible()
  await expect(page.getByRole('img', { name: /L’immagine del regalo: Papavero comune/ })).toBeVisible()
  await axe(page, testInfo)

  // Not sent yet: Coppia keeps it; once sent it is gone (the chat keeps it).
  await page.goto('./coppia')
  await page.getByRole('link', { name: /Papavero comune.*Invia/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Regalo da inviare' })).toBeVisible()
  await page.getByRole('button', { name: 'Invia su WhatsApp' }).click()
  await expect(page.getByText('Inviato!')).toBeVisible()
  const picture = await sharedPicture(page)
  await page.goto('./coppia')
  await expect(page.getByRole('heading', { name: 'Regali' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Da inviare' })).toHaveCount(0)
  await page.goto(`./carta/${duplicate}`)
  await expect(page.getByRole('heading', { name: 'Carta non trovata' })).toBeVisible()

  // Phone B saves the picture from the chat and opens it in Coppia.
  const other = await phone(browser, testInfo)
  await other.goto('./coppia')
  await expect(other.getByRole('heading', { name: 'FloraDeck si gioca in due' })).toBeVisible()
  let gift = await openGift(other, picture)
  await expect(gift.getByText('Un regalo di Gianni')).toBeVisible()
  await expect(gift.getByRole('heading', { name: 'Papavero comune' })).toBeVisible()
  await expect(gift.getByText('«Il primo di novembre, per te ❤️»')).toBeVisible()
  await axe(other, testInfo)
  await gift.getByRole('button', { name: 'Aggiungi alla collezione' }).click()
  await expect(other).toHaveURL(/\/carta\//)
  await expect(other.getByText('Un regalo di Gianni!')).toBeVisible()
  await expect(other.getByText('«Il primo di novembre, per te ❤️»')).toBeVisible()

  // The gift brought Gianni's progress: the phones are paired.
  await other.goto('./coppia')
  await expect(other.getByText('Tu e Gianni')).toBeVisible()
  await expect(other.getByRole('heading', { name: 'Insieme: 2 di 210' })).toBeVisible()

  // The same picture never counts twice, and the sender cannot take the gift back.
  gift = await openGift(other, picture)
  await expect(gift.getByText('Questo regalo è già nella tua collezione')).toBeVisible()
  gift = await openGift(page, picture)
  await expect(gift.getByText('È un regalo che hai fatto tu')).toBeVisible()

  await other.goto('./diario')
  await expect(other.getByRole('link', { name: /Papavero comune.*Regalo/ })).toBeVisible()
  await other.context().close()
})

test('the only card of a species can be given too, and the species is missing again', async ({ page }) => {
  const [only] = await seed(page, [{ speciesId: 'bellis-perennis' }])
  await page.goto(`./carta/${only}`)
  await page.getByRole('button', { name: 'Regala questa carta' }).click()
  const sheet = page.getByRole('dialog', { name: 'Regala questa carta' })
  await expect(sheet.getByText('È la tua unica carta di Pratolina')).toBeVisible()
  await sheet.getByLabel('Il tuo nome').fill('Gianni')
  await sheet.getByRole('button', { name: 'Crea il regalo' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Regalo pronto' })).toBeVisible()
  await page.goto('./album/bianchi')
  await expect(page.getByText('0 di 45')).toBeVisible()
})

test('the pairing code carries the progress and fills the couple album', async ({ page, browser }, testInfo) => {
  await seed(page, [{ speciesId: 'bellis-perennis' }, { speciesId: 'papaver-rhoeas' }])

  // Phone A names itself and shows its code.
  await page.goto('./coppia')
  await page.getByRole('button', { name: /Come ti chiami/ }).click()
  const profile = page.getByRole('dialog', { name: 'Chi gioca su questo telefono' })
  await profile.getByLabel('Il tuo nome').fill('Gianni')
  await profile.getByRole('radio', { name: 'Verde foglia' }).check()
  await profile.getByRole('button', { name: 'Salva' }).click()
  await expect(page.getByText('Tu, su questo telefono')).toBeVisible()
  await page.getByRole('button', { name: 'Collega i telefoni' }).click()
  const code = page.getByRole('img', { name: 'Il tuo codice di FloraDeck' })
  await expect(code).toBeVisible()
  await axe(page, testInfo)

  // What phone B's camera reads from that code.
  const shot = await sharp(await code.screenshot()).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const read = jsQR(new Uint8ClampedArray(shot.data), shot.info.width, shot.info.height)
  expect(read?.data).toMatch(/\/floradeck\/coppia\/progressi#s1\./)

  // Phone B, with a poppy of its own, saves phone A's progress (the link is what the scanner gets).
  const other = await phone(browser, testInfo)
  await seed(other, [{ speciesId: 'papaver-rhoeas' }])
  await other.goto(read!.data)
  await expect(other.getByRole('heading', { level: 1, name: 'I progressi di Gianni' })).toBeVisible()
  await other.getByRole('button', { name: /Salva i suoi progressi|Salvali qui in Safari/ }).click()
  await other.getByRole('link', { name: 'Vai a Coppia' }).click()
  await expect(other.getByRole('heading', { name: 'Insieme: 2 di 210' })).toBeVisible()
  await expect(other.getByText('Gianni ha una specie che a te manca.')).toBeVisible()
  for (const colorScheme of ['light', 'dark'] as const) {
    await other.emulateMedia({ colorScheme })
    await axe(other, testInfo)
  }

  // The couple album shows whose each species is.
  await other.getByRole('link', { name: /Fiori bianchi/ }).click()
  await expect(other.getByRole('heading', { level: 1, name: 'Fiori bianchi' })).toBeVisible()
  const tiles = other.getByRole('list', { name: 'Album di coppia: Fiori bianchi' })
  await expect(tiles.getByRole('link', { name: /Pratolina.*Solo Gianni/ })).toBeVisible()
  await other.getByRole('button', { name: 'Solo Gianni' }).click()
  await expect(tiles.getByRole('link')).toHaveCount(1)
  await axe(other, testInfo)

  // Unpairing brings the invitation back.
  await other.goto('./coppia')
  await other.getByRole('button', { name: 'Scollega Gianni' }).click()
  await other.getByRole('dialog', { name: /Scollegare Gianni/ }).getByRole('button', { name: 'Scollega' }).click()
  await expect(other.getByRole('heading', { name: 'FloraDeck si gioca in due' })).toBeVisible()
  await other.context().close()
})

test('the code scanner opens the camera, or explains why it cannot', async ({ page }, testInfo) => {
  await page.goto('./coppia')
  await page.getByRole('button', { name: 'Collega i telefoni' }).click()
  const sheet = page.getByRole('dialog', { name: /Collega i telefoni|Inquadra/ })
  // First time: the name, which the other phone shows next to the progress.
  await sheet.getByLabel('Il tuo nome').fill('Gianni')
  await sheet.getByRole('button', { name: 'Continua' }).click()
  await sheet.getByRole('button', { name: /Inquadra il codice/ }).click()
  if (testInfo.project.name === 'android') {
    // Chrome's fake camera: the feed plays inside the frame.
    await expect
      .poll(() => sheet.locator('video').evaluate((video: HTMLVideoElement) => video.readyState >= 2 && video.videoWidth > 0))
      .toBe(true)
  } else {
    // WebKit here has no camera at all.
    await expect(sheet.getByRole('alert')).toContainText('fotocamera')
  }
  await sheet.getByRole('button', { name: 'Indietro' }).click()
  await expect(sheet.locator('video')).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Chiudi' }).click()
  await expect(sheet).toBeHidden()
})

test('a picture that is not a gift is refused, and an older link still opens', async ({ page }) => {
  const plate = await sharp(await readFile(new URL('../public/plates/papaver-rhoeas.webp', import.meta.url)))
    .jpeg()
    .toBuffer()
  const sheet = await openGift(page, plate)
  await expect(sheet.getByRole('alert')).toContainText('non trovo un regalo di FloraDeck')

  // An older gift link: a cut one is explained, a whole one opens its page.
  await sheet.getByText('Ti è arrivato un link invece di un’immagine?').click()
  const field = sheet.getByLabel('Il messaggio con il link')
  await field.fill('https://jonnyjr-02.github.io/floradeck/regalo#g1')
  await sheet.getByRole('button', { name: 'Apri il link' }).click()
  await expect(sheet.getByRole('alert')).toContainText('arrivato tagliato')
  await field.fill('Ti ho regalato una carta: https://example.test/floradeck/regalo#g1.AAAA')
  await sheet.getByRole('button', { name: 'Apri il link' }).click()
  await expect(page).toHaveURL(/\/regalo#g1\.AAAA$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Questo regalo non si apre' })).toBeVisible()
})
