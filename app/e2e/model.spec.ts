import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const fixtures = new URL('../test/fixtures/parity/', import.meta.url)

interface Fixture {
  image: string
  label: string
}

/** The trained model, in the real app: the parity photos (openly licensed, see parity.json) give cards. */
test('the trained model recognises the parity photos', async ({ page }) => {
  test.setTimeout(120_000)
  const parity = JSON.parse(await readFile(new URL('parity.json', fixtures), 'utf8')) as { fixtures: Fixture[] }
  const species = JSON.parse(await readFile(new URL('../../catalog/species.json', import.meta.url), 'utf8')) as Array<{
    id: string
    commonNameIt: string
  }>
  for (const fixture of parity.fixtures.slice(0, 3)) {
    await page.goto('./')
    await page.locator('input[type=file]').setInputFiles(fileURLToPath(new URL(fixture.image, fixtures)))
    await expect(page).toHaveURL(/\/carta\//, { timeout: 60_000 })
    const name = species.find((entry) => entry.id === fixture.label)!.commonNameIt
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  }
})

test('a photo without a plant is not in the catalogue', async ({ page }) => {
  await page.goto('./')
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    const g = canvas.getContext('2d')!
    for (let y = 0; y < 600; y += 40)
      for (let x = 0; x < 800; x += 40) {
        g.fillStyle = (x + y) % 80 === 0 ? '#8a8a8a' : '#d8d2c4'
        g.fillRect(x, y, 40, 40)
      }
    return canvas.toDataURL('image/jpeg', 0.9)
  })
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'pavimento.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(data.split(',')[1]!, 'base64') })
  await expect(page.getByRole('dialog', { name: /Non la trovo nel catalogo|Non sono sicuro/ })).toBeVisible({ timeout: 60_000 })
  await expect(page).not.toHaveURL(/\/carta\//)
})

test('the all-plants model downloads once and names a plant on request', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'android', 'the 95 MB download and the big model run on Chrome only here')
  test.setTimeout(240_000)
  await page.goto('./impostazioni')
  await page.getByRole('button', { name: /^Scarica \(95 MB\)$/ }).click()
  await expect(page.getByText('Scaricato: pronto anche senza rete.')).toBeVisible({ timeout: 120_000 })

  // Force «Non la trovo nel catalogo» with the stand-in, then check the name search starts only on the tap.
  await page.goto('./')
  await page.evaluate(() => {
    localStorage.setItem('floradeck:recognizer', 'mock')
    localStorage.setItem('floradeck:mock-scenario', 'out')
  })
  await page.reload()
  const photo = await readFile(new URL('679101978.jpg', fixtures))
  await page.locator('input[type=file]').setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: photo })
  const sheet = page.getByRole('dialog', { name: 'Non la trovo nel catalogo' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('list', { name: 'I nomi più probabili' })).toHaveCount(0)
  // iNaturalist stands in: every name it is asked about gets one openly licensed photo.
  const picture = await readFile(new URL('../public/plates/papaver-rhoeas.webp', import.meta.url))
  await page.context().route('https://api.inaturalist.org/v1/taxa?**', async (route) => {
    const name = new URL(route.request().url()).searchParams.get('q') ?? ''
    await route.fulfill({
      json: {
        results: [
          {
            id: 1,
            name,
            default_photo: {
              medium_url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.webp',
              attribution: '(c) Prova, some rights reserved (CC BY)',
              license_code: 'cc-by',
            },
          },
        ],
      },
    })
  })
  // The context, not the page: image requests can pass through the service worker.
  await page.context().route('https://inaturalist-open-data.s3.amazonaws.com/**', (route) =>
    route.fulfill({ body: picture, contentType: 'image/webp' }),
  )
  await sheet.getByRole('button', { name: 'Cerca il nome tra tutte le piante' }).click()
  const names = sheet.getByRole('list', { name: 'I nomi più probabili' })
  await expect(names.getByRole('listitem')).toHaveCount(3, { timeout: 120_000 })
  // The parity photo is a mullein (Verbascum): the big model should say so too.
  await expect(names.getByRole('listitem').first()).toContainText(/Verbascum/)
  // Each name has a photo to compare with: the card's own for a name that is also a card, else iNaturalist's, credited.
  await expect
    .poll(() => names.locator('img').evaluateAll((images) => images.filter((image) => (image as HTMLImageElement).naturalWidth > 0).length))
    .toBe(3)
  const rows = await names.getByRole('listitem').allTextContents()
  for (const row of rows) expect(row).toMatch(/È una figurina|Foto: Prova · CC BY · iNaturalist/)

  // The mullein's names are mostly cards (the «Verbasco» genus card): tapping one puts the card in the
  // album; a name outside the albums opens Wikipedia first and is kept in the diary until then.
  await page.context().route('https://it.wikipedia.org/**', (route) => route.fulfill({ body: '<title>Wikipedia</title>', contentType: 'text/html' }))
  const outside = names.getByRole('link').first()
  let popup = page.waitForEvent('popup')
  await outside.click()
  await (await popup).close()
  await expect(outside).toContainText('Salvata nel diario')
  await names.getByRole('button', { name: /Verbascum.*È una figurina/ }).first().click()
  await expect(page).toHaveURL(/\/carta\//)
  await expect(page.getByRole('heading', { level: 1, name: 'Verbasco' })).toBeVisible()
  // The card won: the same shot is not also a diary sighting.
  await page.goto('./diario')
  await expect(page.getByRole('link', { name: /Verbasco.*Nuova/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Fuori album/ })).toHaveCount(0)

  // The red valerian: the big model says «Valeriana rubra», the catalogue «Centranthus ruber».
  await page.goto('./')
  await page.locator('input[type=file]').setInputFiles(fileURLToPath(new URL('81024977.jpg', fixtures)))
  await sheet.getByRole('button', { name: 'Cerca il nome tra tutte le piante' }).click()
  await expect(names.getByRole('button', { name: /Valeriana rossa.*È una figurina/ })).toBeVisible({ timeout: 120_000 })
  // Two names outside the albums tapped in turn: one diary entry, with the last name.
  const links = names.getByRole('link')
  await expect(links).toHaveCount(2)
  popup = page.waitForEvent('popup')
  await links.nth(0).click()
  await (await popup).close()
  popup = page.waitForEvent('popup')
  await links.nth(1).click()
  await (await popup).close()
  const lastName = (await links.nth(1).locator('span.font-medium').first().textContent())!.trim()
  await sheet.getByRole('button', { name: 'Scatta di nuovo' }).click()
  await page.goto('./diario')
  const sighting = page.getByRole('link', { name: /Fuori album/ })
  await expect(sighting).toHaveCount(1)
  await expect(sighting).toContainText(lastName)
  await sighting.click()
  await expect(page.getByRole('heading', { level: 1, name: lastName })).toBeVisible()
  await page.getByRole('button', { name: 'Togli dal diario' }).click()
  await page.getByRole('dialog', { name: /Togliere/ }).getByRole('button', { name: 'Togli' }).click()
  await expect(page).toHaveURL(/\/diario$/)
  await expect(page.getByRole('link', { name: /Fuori album/ })).toHaveCount(0)

  await page.goto('./impostazioni')
  await page.getByRole('button', { name: /^Elimina e libera/ }).click()
  await expect(page.getByRole('button', { name: /^Scarica \(95 MB\)$/ })).toBeVisible()
})
