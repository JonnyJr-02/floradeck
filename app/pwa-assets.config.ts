import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Run `npm run icons` after changing public/favicon.svg; the PNGs are committed.
const PAPER = '#f2ede3'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: PAPER } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: PAPER } },
  },
  images: ['public/favicon.svg'],
})
