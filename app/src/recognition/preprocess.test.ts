import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { allPlantsView, catalogueView, resize, roundHalfEven, toTensor, type Rgb } from './preprocess'

const fixtures = new URL('../../test/fixtures/parity/', import.meta.url)
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]

async function decode(name: string): Promise<Rgb> {
  const { data, info } = await sharp(await readFile(new URL(name, fixtures)))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { width: info.width, height: info.height, data: new Uint8Array(data) }
}

describe('preprocessing (same as PIL in the Python export)', () => {
  it.each(['679101978', '528587224'])('matches the tensor Python computed for photo %s', async (id) => {
    const parity = JSON.parse(await readFile(new URL('parity.json', fixtures), 'utf8')) as {
      view: { resizeShortSide: number; crop: number; flip: boolean }
    }
    const expected = new Float32Array((await readFile(new URL(`${id}.f32`, fixtures))).buffer.slice(0))
    const tensor = toTensor(catalogueView(await decode(`${id}.jpg`), parity.view), MEAN, STD)
    expect(tensor.length).toBe(expected.length)
    let worst = 0
    let total = 0
    for (let i = 0; i < tensor.length; i++) {
      const diff = Math.abs(tensor[i]! - expected[i]!)
      worst = Math.max(worst, diff)
      total += diff
    }
    // One 8-bit step is 1/255/std ≈ 0.017; JPEG decoders may differ by a step here and there.
    expect(total / tensor.length).toBeLessThan(0.005)
    expect(worst).toBeLessThan(0.1)
  })

  it('keeps a flat colour flat at any size', () => {
    const src: Rgb = { width: 7, height: 5, data: new Uint8Array(7 * 5 * 3).fill(200) }
    for (const filter of ['bilinear', 'bicubic'] as const) {
      const out = resize(src, 3, 9, filter)
      expect(out.width).toBe(3)
      expect(out.height).toBe(9)
      expect(new Set(out.data)).toEqual(new Set([200]))
    }
  })

  it('crops the centre square of the size the models expect', () => {
    const src: Rgb = { width: 1080, height: 810, data: new Uint8Array(1080 * 810 * 3) }
    expect(catalogueView(src, { resizeShortSide: 292, crop: 256, flip: false }).width).toBe(256)
    expect(allPlantsView(src, 336)).toMatchObject({ width: 336, height: 336 })
  })

  it('rounds halves to even like Python', () => {
    expect([0.5, 1.5, 2.5, 2.4, 2.6].map(roundHalfEven)).toEqual([0, 2, 2, 2, 3])
  })
})
