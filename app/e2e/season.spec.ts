import { expect, test } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

test('the first opening of a month shows the season first, once', async ({ page }) => {
  await page.goto('./album')
  const month = MONTHS[new Date().getMonth()]!
  await expect(page.getByRole('heading', { level: 1, name: month })).toBeVisible()
  await expect(page.getByText('Di stagione questo mese')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Sezioni' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Inizia a esplorare' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Album' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Album' })).toBeVisible()
})
