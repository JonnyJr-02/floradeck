import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test'
import { seed, settled } from './helpers'

/**
 * Two phones in one test: two browser contexts with separate storage, the way two phones keep
 * separate collections. navigator.share is replaced by a stub that keeps what was shared, so the
 * test can carry the link from one phone to the other like a chat would.
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
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        ;(window as unknown as { __shared: ShareData[] }).__shared = [data]
      },
    })
  })
}

const lastShared = (page: Page) =>
  page.evaluate(() => {
    const list = (window as unknown as { __shared?: ShareData[] }).__shared ?? []
    return list[list.length - 1]?.url ?? ''
  })

async function axe(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== 'android') return
  await settled(page)
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

/** On the iPhone project the link opens "in Safari": the main button copies, the second adds here. */
const addButton = (page: Page) => page.getByRole('button', { name: /Aggiungi alla collezione|Aggiungilo qui in Safari/ })

test('a duplicate travels to the other phone once and leaves the sender', async ({ page, browser }, testInfo) => {
  await stubShare(page)
  const [, duplicate] = await seed(page, [{ speciesId: 'papaver-rhoeas' }, { speciesId: 'papaver-rhoeas' }])

  // Phone A gives the duplicate.
  await page.goto(`./carta/${duplicate}`)
  await page.getByRole('button', { name: 'Regala questa carta' }).click()
  const sheet = page.getByRole('dialog', { name: 'Regala questa carta' })
  await sheet.getByLabel('Il tuo nome').fill('Gianni')
  await sheet.getByLabel('Un messaggio, se vuoi').fill('Il primo di novembre, per te')
  await sheet.getByRole('button', { name: 'Crea il regalo' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Regalo pronto' })).toBeVisible()
  await expect(page.getByText('«Il primo di novembre, per te»')).toBeVisible()
  await axe(page, testInfo)
  await page.getByRole('button', { name: 'Invia il regalo' }).click()
  const link = await lastShared(page)
  expect(link).toMatch(/\/floradeck\/regalo#g1\./)

  // The duplicate has left phone A: one papavero is left, and the gift can be sent again from Coppia.
  await page.goto(`./carta/${duplicate}`)
  await expect(page.getByRole('heading', { name: 'Carta non trovata' })).toBeVisible()
  await page.goto('./coppia')
  await expect(page.getByRole('link', { name: /Papavero comune.*Rimanda/ })).toBeVisible()

  // Phone B opens the link and adds the card.
  const other = await phone(browser, testInfo)
  await other.goto(link)
  await expect(other.getByText('Un regalo di Gianni')).toBeVisible()
  await expect(other.getByRole('heading', { level: 1, name: 'Papavero comune' })).toBeVisible()
  if (testInfo.project.name === 'iphone') await expect(other.getByRole('heading', { name: 'Mettilo nell’app' })).toBeVisible()
  await axe(other, testInfo)
  await addButton(other).click()
  await expect(other).toHaveURL(/\/carta\//)
  await expect(other.getByText('Un regalo di Gianni!')).toBeVisible()
  await expect(other.getByText('«Il primo di novembre, per te»')).toBeVisible()

  // The same link never counts twice, and the sender cannot take the gift back.
  await other.goto(link)
  await expect(other.getByRole('heading', { name: 'Questo regalo è già nella tua collezione' })).toBeVisible()
  await page.goto(link)
  await expect(page.getByRole('heading', { name: 'È un regalo che hai fatto tu' })).toBeVisible()

  // Phone B's Coppia lists the gift, and its diary marks it.
  await other.goto('./coppia')
  await expect(other.getByRole('link', { name: /Papavero comune.*da Gianni/ })).toBeVisible()
  await other.goto('./diario')
  await expect(other.getByRole('link', { name: /Papavero comune.*Regalo/ })).toBeVisible()
  await other.context().close()
})

test('progress travels by link and fills the couple album', async ({ page, browser }, testInfo) => {
  await stubShare(page)
  await seed(page, [{ speciesId: 'bellis-perennis' }, { speciesId: 'papaver-rhoeas' }])

  // Phone A names itself and shows its code.
  await page.goto('./coppia')
  await page.getByRole('button', { name: /Come ti chiami/ }).click()
  const profile = page.getByRole('dialog', { name: 'Chi gioca su questo telefono' })
  await profile.getByLabel('Il tuo nome').fill('Gianni')
  await profile.getByRole('radio', { name: 'Verde foglia' }).check()
  await profile.getByRole('button', { name: 'Salva' }).click()
  await expect(page.getByText('Tu, su questo telefono')).toBeVisible()
  await page.getByRole('button', { name: 'Mostra il mio codice' }).click()
  const code = page.getByRole('dialog', { name: 'Il tuo codice' })
  await expect(code.getByRole('img', { name: 'Il tuo codice di FloraDeck' })).toBeVisible()
  await code.getByRole('button', { name: 'Mandali come link' }).click()
  const link = await lastShared(page)
  expect(link).toMatch(/\/floradeck\/coppia\/progressi#s1\./)

  // Phone B, with a poppy of its own, reads phone A's progress.
  const other = await phone(browser, testInfo)
  await seed(other, [{ speciesId: 'papaver-rhoeas' }])
  await other.goto(link)
  await expect(other.getByRole('heading', { level: 1, name: 'I progressi di Gianni' })).toBeVisible()
  await expect(other.getByText('2 specie trovate')).toBeVisible()
  await other.getByRole('button', { name: /Salva i suoi progressi|Salvali qui in Safari/ }).click()
  await expect(other.getByRole('heading', { level: 1, name: 'Ora vedi i progressi di Gianni' })).toBeVisible()
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
  await expect(other.getByText('Album di coppia · tu e Gianni')).toBeVisible()
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
  await page.getByRole('button', { name: 'Inquadra il suo codice' }).click()
  const sheet = page.getByRole('dialog', { name: 'Inquadra il suo codice' })
  if (testInfo.project.name === 'android') {
    // Chrome's fake camera: the feed plays inside the frame.
    await expect
      .poll(() => sheet.locator('video').evaluate((video: HTMLVideoElement) => video.readyState >= 2 && video.videoWidth > 0))
      .toBe(true)
  } else {
    // WebKit here has no camera at all.
    await expect(sheet.getByRole('alert')).toContainText('fotocamera')
  }
  await sheet.getByRole('button', { name: 'Annulla' }).click()
  await expect(sheet).toBeHidden()
  // The stream is stopped once the sheet has gone.
  expect(await page.evaluate(() => document.querySelectorAll('video').length)).toBe(0)
})

test('a pasted link opens the gift, and anything else is refused', async ({ page }) => {
  await page.goto('./coppia')
  await page.getByRole('button', { name: 'Incolla un link' }).click()
  const sheet = page.getByRole('dialog', { name: 'Incolla un link' })
  await sheet.getByLabel(/incollalo qui/).fill('ciao, come stai?')
  await sheet.getByRole('button', { name: 'Apri', exact: true }).click()
  await expect(sheet.getByRole('alert')).toContainText('non è un link di FloraDeck')
  await sheet.getByLabel(/incollalo qui/).fill('guarda qui https://example.test/floradeck/regalo#g1.AAAA')
  await sheet.getByRole('button', { name: 'Apri', exact: true }).click()
  await expect(page).toHaveURL(/\/regalo#g1\.AAAA$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Questo regalo non si apre' })).toBeVisible()
})
