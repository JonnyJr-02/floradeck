import { expect, test } from '@playwright/test'

test('the manifest and its icons are served', async ({ page, request }) => {
  await page.goto('./')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()
  const manifestUrl = new URL(href!, page.url())
  const manifest = (await (await request.get(manifestUrl.toString())).json()) as {
    name: string
    lang: string
    display: string
    icons: { src: string; purpose?: string }[]
  }
  expect(manifest).toMatchObject({ name: 'FloraDeck', lang: 'it', display: 'standalone' })
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
  for (const icon of manifest.icons) {
    expect((await request.get(new URL(icon.src, manifestUrl).toString())).ok(), icon.src).toBe(true)
  }
})

test('says when it is ready to work offline', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByText('FloraDeck ora funziona anche senza rete.')).toBeVisible({ timeout: 15_000 })
})

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // The first visit installs the service worker; from the next load on it serves the app.
  await page.reload()
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Sezioni' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Sezioni' }).getByRole('link', { name: 'Album' }).click()
  await expect(page.getByRole('list', { name: 'I tuoi album' }).getByRole('listitem')).toHaveCount(10)
  await page.goto('diario')
  await expect(page.getByRole('heading', { name: 'Il diario è ancora vuoto' })).toBeVisible()
  // Fonts come from the precache too.
  expect(await page.evaluate(() => document.fonts.check('1rem "Fraunces Variable"'))).toBe(true)
  await context.setOffline(false)
})
