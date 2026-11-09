import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { catalogueIds, mySnapshot } from '../../domain/couple'
import { species } from '../../domain/catalog'
import { encodeSnapshot } from '../../domain/share'
import { qrModules, qrPath } from './qr'

/** Draw the modules the way the screen shows them (quiet zone, 4 px a module) and read them back. */
function scan(text: string): string | undefined {
  const modules = qrModules(text)
  const scale = 4
  const quiet = 4
  const side = (modules.length + quiet * 2) * scale
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255)
  modules.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (!dark) return
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const at = (((r + quiet) * scale + y) * side + (c + quiet) * scale + x) * 4
          pixels[at] = pixels[at + 1] = pixels[at + 2] = 0
        }
      }
    }),
  )
  return jsQR(pixels, side, side)?.data
}

describe('pairing QR code', () => {
  it('carries a whole progress link that the scanner reads back', () => {
    const snapshot = mySnapshot(
      { id: crypto.randomUUID(), name: 'Una persona con un nome lungo quaranta!', colour: '#3d5fb8' },
      species.slice(0, 120).map((entry) => ({ speciesId: entry.id, foundAt: '' })),
    )
    const link = `https://jonnyjr-02.github.io/floradeck/coppia/progressi#${encodeSnapshot(snapshot, catalogueIds)}`
    expect(scan(link)).toBe(link)
    // Small enough to scan from a phone screen at arm's length.
    expect(qrPath(link).size).toBeLessThanOrEqual(77)
  })
})
