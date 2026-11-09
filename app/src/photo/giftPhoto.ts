import { photoBlob } from '../db/collection'
import type { PhotoRecord } from '../db/db'
import { canEncodeWebp, fitWithin } from './photo'

/** A gift travels inside a link, so its photo is shrunk under 18 KB (the spec asks for 15–20 KB). */
export const GIFT_PHOTO_MAX_BYTES = 18_000
const SIZES = [640, 560, 480, 400, 320] as const
const QUALITIES = [0.72, 0.6, 0.5] as const

function encode(bitmap: ImageBitmap, longSide: number, quality: number): Promise<Blob> {
  const size = fitWithin(bitmap.width, bitmap.height, longSide)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas 2D is not available')
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, size.width, size.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        canvas.width = canvas.height = 0
        if (blob) resolve(blob)
        else reject(new Error('the photo could not be encoded'))
      },
      canEncodeWebp() ? 'image/webp' : 'image/jpeg',
      quality,
    ),
  )
}

/** The largest, best version of the card's photo that fits in a gift link. */
export async function giftPhoto(record: PhotoRecord): Promise<{ type: string; bytes: Uint8Array }> {
  const bitmap = await createImageBitmap(photoBlob(record, 'image'))
  try {
    let last: Blob | null = null
    for (const size of SIZES) {
      for (const quality of QUALITIES) {
        last = await encode(bitmap, size, quality)
        if (last.size <= GIFT_PHOTO_MAX_BYTES) return { type: last.type, bytes: new Uint8Array(await last.arrayBuffer()) }
      }
    }
    // Even the smallest try is a little bigger: send it anyway, the link just grows.
    return { type: last!.type, bytes: new Uint8Array(await last!.arrayBuffer()) }
  } finally {
    bitmap.close()
  }
}
