import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const screens = [
  { path: './', name: 'Esplora' },
  { path: 'album', name: 'Album' },
  { path: 'diario', name: 'Diario' },
  { path: 'coppia', name: 'Coppia' },
  { path: 'impostazioni', name: 'Impostazioni' },
  { path: 'installa', name: 'Installa FloraDeck' },
]

for (const colorScheme of ['light', 'dark'] as const) {
  for (const screen of screens) {
    test(`${screen.name} has no WCAG A/AA violations (${colorScheme})`, async ({ page }, testInfo) => {
      // Contrast and markup are the same in both engines: run the scan once, on Chrome.
      test.skip(testInfo.project.name !== 'android', 'scanned on the Android project only')
      await page.emulateMedia({ colorScheme })
      await page.goto(screen.path)
      await expect(page.getByRole('heading', { level: 1, name: screen.name })).toBeAttached()
      await page.evaluate(() => document.fonts.ready)
      // A message caught mid-fade reads as low contrast: scan once every transition has ended.
      await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'))
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      const found = results.violations.map(
        (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
      )
      expect(found).toEqual([])
    })
  }
}
