import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/** A JPEG drawn in the page: a red six-petal flower on green, like a phone photo (4:3). */
async function flowerPhoto(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 1200
    const g = canvas.getContext('2d')!
    g.fillStyle = '#4f6f2a'
    g.fillRect(0, 0, 1600, 1200)
    g.fillStyle = '#c8322a'
    for (let i = 0; i < 6; i++) {
      g.save()
      g.translate(800, 600)
      g.rotate((i * Math.PI) / 3)
      g.beginPath()
      g.ellipse(0, -170, 120, 190, 0, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    return canvas.toDataURL('image/jpeg', 0.9)
  })
  return Buffer.from(dataUrl.split(',')[1]!, 'base64')
}

async function forceScenario(page: Page, scenario: 'sure' | 'unsure' | 'out') {
  await page.goto('./')
  await page.evaluate((value) => localStorage.setItem('floradeck:mock-scenario', value), scenario)
  await page.reload()
}

async function pickFromGallery(page: Page) {
  const buffer = await flowerPhoto(page)
  await page.locator('input[type=file]').setInputFiles({ name: 'fiore.jpg', mimeType: 'image/jpeg', buffer })
}

async function settled(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'))
}

async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((node) => node.target.join(' ')).join(', ')}`)
}

test('a sure recognition from the gallery becomes a card in the album', async ({ page }) => {
  await forceScenario(page, 'sure')
  await pickFromGallery(page)
  await expect(page).toHaveURL(/\/carta\/[0-9a-f-]+$/)
  await expect(page.getByText('Nuova carta!')).toBeVisible()
  await expect(page.getByRole('img', { name: /^La tua foto: / })).toBeVisible()
  await expect(page.getByText(/^Trovata il /)).toBeVisible()

  await page.getByRole('link', { name: "Metti nell'album" }).click()
  await expect(page).toHaveURL(/\/album\/[a-z-]+$/)
  await expect(page.getByText(/^1 di \d+$/)).toBeVisible()
  await page.getByRole('navigation', { name: 'Sezioni' }).getByRole('link', { name: 'Album' }).click()
  await expect(page.getByText('1 specie trovata su 210, in 6 album')).toBeVisible()
})

test('the unpacking plays once, not again after a reload', async ({ page }) => {
  await forceScenario(page, 'sure')
  await pickFromGallery(page)
  await expect(page.locator('.card-view--reveal')).toBeVisible()
  await page.reload()
  await expect(page.locator('.card-view')).toBeVisible()
  await expect(page.locator('.card-view--reveal')).toHaveCount(0)
  await expect(page.getByText('Nuova carta!')).toHaveCount(0)
})

test('"Non sono sicuro" offers three species and keeps the one chosen', async ({ page }) => {
  await forceScenario(page, 'unsure')
  await pickFromGallery(page)
  const sheet = page.getByRole('dialog', { name: 'Non sono sicuro' })
  await expect(sheet).toBeVisible()
  const choices = sheet.getByRole('list', { name: 'Le specie più probabili' }).getByRole('button')
  await expect(choices).toHaveCount(3)
  const name = (await choices.nth(1).locator('span span').first().innerText()).trim()
  await choices.nth(1).click()
  await expect(page).toHaveURL(/\/carta\//)
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
})

test('shooting again from "Non sono sicuro" saves nothing', async ({ page }) => {
  await forceScenario(page, 'unsure')
  await pickFromGallery(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Scatta di nuovo' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('navigation', { name: 'Sezioni' }).getByRole('link', { name: 'Album' }).click()
  await expect(page.getByText('0 specie trovate su 210, in 6 album')).toBeVisible()
})

test('a photo outside the catalogue gets shooting tips and no card', async ({ page }) => {
  await forceScenario(page, 'out')
  await pickFromGallery(page)
  const sheet = page.getByRole('dialog', { name: 'Non la trovo nel catalogo' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText('Avvicinati: un fiore solo, al centro.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(page).toHaveURL(/\/floradeck\/$/)
})

test('the live camera shoots a card (Chrome fake camera)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'android', 'only Chrome has a fake camera')
  await forceScenario(page, 'sure')
  await page.getByRole('button', { name: 'Apri la fotocamera' }).click()
  await expect(page.getByText('Avvicinati: un fiore solo, al centro', { exact: true })).toBeVisible()
  const shutter = page.getByRole('button', { name: 'Scatta una foto' })
  await expect(shutter).toBeEnabled()
  await page.waitForFunction(() => (document.querySelector('video')?.videoWidth ?? 0) > 0)
  await shutter.click()
  await expect(page).toHaveURL(/\/carta\//)

  // Allowed once: the viewfinder opens on its own next time.
  await page.goto('./')
  await expect(shutter).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Apri la fotocamera' })).toHaveCount(0)
})

test('without a camera the gallery still works', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone', 'WebKit here has no camera')
  await forceScenario(page, 'sure')
  const open = page.getByRole('button', { name: 'Apri la fotocamera' })
  if (await open.isVisible()) await open.click()
  await expect(page.getByRole('heading', { name: /La fotocamera è bloccata|Fotocamera non disponibile/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Scatta una foto' })).toBeDisabled()
  await pickFromGallery(page)
  await expect(page).toHaveURL(/\/carta\//)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`result sheets and the card have no WCAG A/AA violations (${colorScheme})`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'android', 'scanned on the Android project only')
    await page.emulateMedia({ colorScheme })
    for (const scenario of ['unsure', 'out'] as const) {
      await forceScenario(page, scenario)
      await pickFromGallery(page)
      await expect(page.getByRole('dialog')).toBeVisible()
      await settled(page)
      expect(await axeViolations(page), scenario).toEqual([])
    }
    await forceScenario(page, 'sure')
    await pickFromGallery(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await settled(page)
    expect(await axeViolations(page), 'card').toEqual([])
  })
}
