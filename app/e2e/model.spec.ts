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
  await sheet.getByRole('button', { name: 'Cerca il nome tra tutte le piante' }).click()
  const names = sheet.getByRole('list', { name: 'I nomi più probabili' })
  await expect(names.getByRole('listitem')).toHaveCount(3, { timeout: 120_000 })
  // The parity photo is a mullein (Verbascum): the big model should say so too.
  await expect(names.getByRole('listitem').first()).toContainText(/Verbascum/)

  await page.goto('./impostazioni')
  await page.getByRole('button', { name: /^Elimina e libera/ }).click()
  await expect(page.getByRole('button', { name: /^Scarica \(95 MB\)$/ })).toBeVisible()
})
