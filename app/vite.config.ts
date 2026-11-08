import { readFileSync } from 'node:fs'
import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// GitHub Pages serves the app from /<repository>/; the deploy workflow passes BASE_PATH.
const base = process.env.BASE_PATH ?? '/floradeck/'

// Page background of the light theme: splash screen and browser chrome before the CSS loads.
const PAPER = '#f2ede3'

// GitHub Pages answers unknown paths with 404.html. A copy of the app there lets deep links
// open before the service worker is installed (afterwards the service worker serves them).
function githubPagesFallback(): Plugin {
  return {
    name: 'floradeck:github-pages-fallback',
    apply: 'build',
    async writeBundle({ dir = 'dist' }) {
      await copyFile(resolve(dir, 'index.html'), resolve(dir, '404.html'))
    },
  }
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    // The catalogue in ../catalog is the single source of truth, imported at build time.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), fileURLToPath(new URL('../catalog', import.meta.url))] },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // globPatterns below already precache everything in public/, icons included.
      includeManifestIcons: false,
      manifest: {
        id: base,
        name: 'FloraDeck',
        short_name: 'FloraDeck',
        description: "Fiori e piante d'Italia da fotografare e collezionare come figurine, in due.",
        lang: 'it',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: PAPER,
        theme_color: PAPER,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,txt,webp}'],
        globIgnores: ['404.html'],
        cleanupOutdatedCaches: true,
      },
    }),
    githubPagesFallback(),
  ],
})
