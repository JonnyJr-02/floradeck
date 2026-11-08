import { expect, test } from '@playwright/test'

const sections = ['Esplora', 'Album', 'Diario', 'Coppia']

test('opens on Explore with the four sections at the bottom', async ({ page }) => {
  await page.goto('./')
  const nav = page.getByRole('navigation', { name: 'Sezioni' })
  for (const name of sections) await expect(nav.getByRole('link', { name })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Esplora' })).toHaveAttribute('aria-current', 'page')
  // WebKit on this PC has no camera API: it shows the gallery fallback instead.
  await expect(page.getByRole('heading', { name: /Inquadra un fiore|Fotocamera non disponibile/ })).toBeVisible()
})

test('moves between the sections', async ({ page }) => {
  await page.goto('./')
  const nav = page.getByRole('navigation', { name: 'Sezioni' })

  await nav.getByRole('link', { name: 'Album' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Album' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'I tuoi album' }).getByRole('listitem')).toHaveCount(8)

  await nav.getByRole('link', { name: 'Diario' }).click()
  await expect(page.getByRole('heading', { name: 'Il diario è ancora vuoto' })).toBeVisible()

  await nav.getByRole('link', { name: 'Coppia' }).click()
  await expect(page.getByRole('heading', { name: 'FloraDeck si gioca in due' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Coppia' })).toHaveAttribute('aria-current', 'page')
})

test('opens a deep link directly', async ({ page }) => {
  await page.goto('album')
  await expect(page.getByRole('heading', { level: 1, name: 'Album' })).toBeVisible()
  await page.goto('pagina-che-non-esiste')
  await expect(page).toHaveURL(/\/floradeck\/$/)
})

test('settings open from a section and Back returns to it', async ({ page }) => {
  await page.goto('album')
  await page.getByRole('link', { name: 'Impostazioni' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Impostazioni' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Sezioni' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Indietro' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Album' })).toBeVisible()
})

test('the theme choice survives a reload and colours the status bar', async ({ page }) => {
  await page.goto('impostazioni')
  await page.getByRole('radio', { name: 'Scuro' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('radio', { name: 'Scuro' })).toBeChecked()
  for (const meta of await page.locator('meta[name="theme-color"]').all()) {
    await expect(meta).toHaveAttribute('content', '#0f1320')
  }
  await page.getByRole('radio', { name: 'Chiaro' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('the install guide puts this phone first', async ({ page }, testInfo) => {
  await page.goto('installa')
  const first = page.locator('main section').first()
  if (testInfo.project.name === 'iphone') {
    await expect(first.getByRole('heading', { name: 'Su iPhone, con Safari' })).toBeVisible()
    await expect(first.getByText('Aggiungi alla schermata Home')).toBeVisible()
  } else {
    await expect(first.getByRole('heading', { name: 'Su Android, con Chrome' })).toBeVisible()
    await expect(first.getByText('Installa app')).toBeVisible()
  }
  await expect(first.getByText('Questo telefono')).toBeVisible()
})

test('the install card can be hidden for good', async ({ page }) => {
  await page.goto('./')
  const card = page.getByRole('complementary', { name: 'Installa FloraDeck sul telefono' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Nascondi il suggerimento' }).click()
  await expect(card).toHaveCount(0)
  await page.reload()
  // WebKit on this PC has no camera API: it shows the gallery fallback instead.
  await expect(page.getByRole('heading', { name: /Inquadra un fiore|Fotocamera non disponibile/ })).toBeVisible()
  await expect(card).toHaveCount(0)
})
