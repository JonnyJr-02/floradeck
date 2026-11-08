/**
 * Photos are stored on the phone at 1080 px on the long side, WebP when the browser can encode it
 * (Chrome) and JPEG otherwise (Safari), plus a small thumbnail for lists and album tiles.
 */

export const PHOTO_LONG_SIDE = 1080
export const THUMBNAIL_LONG_SIDE = 480
const PHOTO_QUALITY = 0.85
const THUMBNAIL_QUALITY = 0.8

export interface PreparedPhoto {
  image: Blob
  thumbnail: Blob
  width: number
  height: number
}

/** Scale (width, height) down so the long side is at most maxLongSide; never scales up. */
export function fitWithin(width: number, height: number, maxLongSide: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) throw new Error('the image has no pixels')
  const scale = Math.min(1, maxLongSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

let webpSupport: boolean | undefined

/** Runtime check: Safari's canvas silently falls back to PNG when asked for WebP. */
export function canEncodeWebp(): boolean {
  if (webpSupport === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  }
  return webpSupport
}

export type PhotoSource = HTMLVideoElement | ImageBitmap

function sourceSize(source: PhotoSource): { width: number; height: number } {
  return source instanceof HTMLVideoElement
    ? { width: source.videoWidth, height: source.videoHeight }
    : { width: source.width, height: source.height }
}

function encode(source: PhotoSource, longSide: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const size = fitWithin(sourceSize(source).width, sourceSize(source).height, longSide)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas 2D is not available')
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, size.width, size.height)
  const type = canEncodeWebp() ? 'image/webp' : 'image/jpeg'
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Free the canvas memory at once: iOS keeps a tight budget for canvases.
        canvas.width = canvas.height = 0
        if (blob) resolve({ blob, ...size })
        else reject(new Error('the photo could not be encoded'))
      },
      type,
      quality,
    )
  })
}

/** Decode a picked file with its EXIF orientation applied. */
export function decodeFile(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

export async function preparePhoto(source: PhotoSource): Promise<PreparedPhoto> {
  const photo = await encode(source, PHOTO_LONG_SIDE, PHOTO_QUALITY)
  const thumbnail = await encode(source, THUMBNAIL_LONG_SIDE, THUMBNAIL_QUALITY)
  return { image: photo.blob, thumbnail: thumbnail.blob, width: photo.width, height: photo.height }
}
