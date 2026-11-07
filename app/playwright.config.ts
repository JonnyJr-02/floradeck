import { defineConfig, devices } from '@playwright/test'

const port = 4173
const baseURL = `http://127.0.0.1:${port}/floradeck/`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // WebKit on Windows crashes when several instances share this laptop: one test at a time.
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    // Android: the Google Chrome installed on this PC, with a Pixel 7 screen and touch.
    { name: 'android', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    // iPhone: Playwright's WebKit, the engine behind Safari. Not a real iPhone.
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
  ],
  // Tests run against the production build, service worker included.
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
