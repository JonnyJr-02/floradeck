import { describe, expect, it } from 'vitest'
import { fitWithin, PHOTO_LONG_SIDE } from './photo'

describe('photo size', () => {
  it('shrinks a landscape photo to the long side', () => {
    expect(fitWithin(4032, 3024, PHOTO_LONG_SIDE)).toEqual({ width: 1080, height: 810 })
  })

  it('shrinks a portrait photo to the long side', () => {
    expect(fitWithin(3024, 4032, PHOTO_LONG_SIDE)).toEqual({ width: 810, height: 1080 })
  })

  it('never enlarges a small photo', () => {
    expect(fitWithin(640, 480, PHOTO_LONG_SIDE)).toEqual({ width: 640, height: 480 })
  })

  it('keeps at least one pixel on a very thin image', () => {
    expect(fitWithin(10000, 2, 100)).toEqual({ width: 100, height: 1 })
  })

  it('refuses an image without pixels (a camera that is not ready yet)', () => {
    expect(() => fitWithin(0, 0, 100)).toThrow()
  })
})
