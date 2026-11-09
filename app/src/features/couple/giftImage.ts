import type { Species } from '../../domain/catalog'
import { isGiftCode, ShareError } from '../../domain/share'
import { decodeFile, preparePhoto, type PreparedPhoto } from '../../photo/photo'
import { qrModulesUtf8 } from './qr'

/**
 * A gift travels as a picture (CLAUDE.md, Couple): the card's photo on top (a square), then who
 * sends it, the species, the message and a QR code with the gift code. Chat apps deliver pictures
 * whole on every phone; links of 24 KB were cut short. The receiver picks the saved picture in
 * Coppia → «Apri un regalo»: the QR gives the gift, the top square gives the photo.
 *
 * Colours are the light theme's, whatever the phone's theme: the picture lives in a chat.
 */

export const GIFT_IMAGE = { width: 1080, height: 1700, photo: 1080 } as const

const INK = '#1d1a15'
const MUTED = '#655e53'
const ACCENT = '#a83e2b'
const PAPER = '#f2ede3'
const DISPLAY = '"Fraunces Variable", Georgia, serif'
const SANS = '"Figtree Variable", system-ui, sans-serif'

/** Lines of `text` that fit `width`, at most `max` lines, the last one ending in "…" when cut. */
function wrap(context: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (context.measureText(next).width <= width || !line) {
      line = next
      continue
    }
    lines.push(line)
    line = word
    if (lines.length === max) break
  }
  if (lines.length < max && line) lines.push(line)
  const used = lines.join(' ').split(/\s+/).length
  if (used < words.length && lines.length > 0) {
    let last = lines[lines.length - 1]!
    while (last && context.measureText(`${last}…`).width > width) last = last.slice(0, -1)
    lines[lines.length - 1] = `${last.trimEnd()}…`
  }
  return lines
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + w, y, x + w, y + h, r)
  context.arcTo(x + w, y + h, x, y + h, r)
  context.arcTo(x, y + h, x, y, r)
  context.arcTo(x, y, x + w, y, r)
  context.closePath()
}

async function fontsReady() {
  await Promise.all([
    document.fonts.load(`400 64px ${DISPLAY}`),
    document.fonts.load(`600 30px ${SANS}`),
    document.fonts.load(`italic 400 28px ${SANS}`),
  ]).catch(() => undefined)
}

export interface GiftImageInput {
  photo: Blob
  entry: Pick<Species, 'commonNameIt' | 'scientificName'>
  from: string
  message: string
  code: string
}

/** The gift picture as a JPEG. */
export async function renderGiftImage(input: GiftImageInput): Promise<Blob> {
  const { width, height, photo: side } = GIFT_IMAGE
  await fontsReady()
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas 2D is not available')
  context.fillStyle = PAPER
  context.fillRect(0, 0, width, height)

  // The photo, cropped to the top square (cover).
  const bitmap = await decodeFile(input.photo)
  try {
    // Take the centred square of the photo, so nothing spills under the words.
    const crop = Math.min(bitmap.width, bitmap.height)
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, (bitmap.width - crop) / 2, (bitmap.height - crop) / 2, crop, crop, 0, 0, side, side)
  } finally {
    bitmap.close()
  }

  // Words on the left.
  const left = 64
  const column = 470
  let y = side + 84
  context.textBaseline = 'alphabetic'
  context.fillStyle = ACCENT
  context.font = `600 30px ${SANS}`
  context.fillText(input.from ? `Un regalo di ${input.from}` : 'Un regalo per te', left, y, column)
  context.fillStyle = INK
  context.font = `400 60px ${DISPLAY}`
  for (const line of wrap(context, input.entry.commonNameIt, column, 2)) {
    y += 66
    context.fillText(line, left, y)
  }
  context.fillStyle = MUTED
  context.font = `italic 400 28px ${SANS}`
  y += 42
  context.fillText(input.entry.scientificName, left, y, column)
  // The how-to sits at the bottom; the message takes the lines left above it.
  const howTo = height - 78
  if (input.message) {
    context.fillStyle = INK
    context.font = `400 32px ${DISPLAY}`
    y += 22
    const room = Math.max(1, Math.floor((howTo - 40 - y) / 42))
    for (const line of wrap(context, `«${input.message}»`, column, room)) {
      y += 42
      context.fillText(line, left, y)
    }
  }
  context.fillStyle = MUTED
  context.font = `500 24px ${SANS}`
  context.fillText('Aprilo in FloraDeck → Coppia', left, howTo, column)
  context.fillText('→ «Apri un regalo»', left, howTo + 32, column)

  // The QR code on a white square at the bottom right: black on white reads best after compression.
  const box = 456
  const boxX = width - 48 - box
  const boxY = side + (height - side - box) / 2
  context.fillStyle = '#ffffff'
  roundedRect(context, boxX, boxY, box, box, 28)
  context.fill()
  const modules = qrModulesUtf8(input.code, 'M')
  const quiet = 2
  const cell = Math.floor((box - 24) / (modules.length + quiet * 2))
  const origin = (box - cell * modules.length) / 2
  context.fillStyle = '#000000'
  modules.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (dark) context.fillRect(boxX + origin + c * cell, boxY + origin + r * cell, cell, cell)
    }),
  )

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        canvas.width = canvas.height = 0
        if (blob) resolve(blob)
        else reject(new Error('the gift picture could not be encoded'))
      },
      'image/jpeg',
      0.92,
    ),
  )
}

const NOT_A_GIFT =
  'In questa foto non trovo un regalo di FloraDeck. Scegli la foto arrivata in chat, quella con il codice in basso a destra.'

/** Read a saved gift picture: the gift code from its QR, the photo from its top square. */
export async function readGiftImage(file: Blob): Promise<{ code: string; photo: PreparedPhoto }> {
  let bitmap: ImageBitmap
  try {
    bitmap = await decodeFile(file)
  } catch {
    throw new ShareError('Questa non è una foto che riesco ad aprire.')
  }
  try {
    const { default: jsQR } = await import('jsqr')
    // Read the QR at about the size it was drawn (chat apps may have shrunk or grown the picture).
    const scale = Math.min(1, GIFT_IMAGE.width / bitmap.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('canvas 2D is not available')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    // The QR sits in the lower part: search there first (faster), then the whole picture.
    const lower = Math.round(canvas.height * 0.55)
    const bottom = context.getImageData(0, lower, canvas.width, canvas.height - lower)
    let found = jsQR(bottom.data, bottom.width, bottom.height, { inversionAttempts: 'dontInvert' })
    if (!found) {
      const whole = context.getImageData(0, 0, canvas.width, canvas.height)
      found = jsQR(whole.data, whole.width, whole.height, { inversionAttempts: 'attemptBoth' })
    }
    canvas.width = canvas.height = 0
    if (!found) throw new ShareError(NOT_A_GIFT)
    const code = new TextDecoder().decode(new Uint8Array(found.binaryData))
    if (!isGiftCode(code)) throw new ShareError(NOT_A_GIFT)

    // The photo: the top square, at the picture's own resolution.
    const side = Math.min(bitmap.width, bitmap.height)
    const crop = document.createElement('canvas')
    crop.width = crop.height = side
    const cropContext = crop.getContext('2d')
    if (!cropContext) throw new Error('canvas 2D is not available')
    cropContext.drawImage(bitmap, 0, 0, side, side, 0, 0, side, side)
    const square = await createImageBitmap(crop)
    crop.width = crop.height = 0
    try {
      return { code, photo: await preparePhoto(square) }
    } finally {
      square.close()
    }
  } finally {
    bitmap.close()
  }
}
