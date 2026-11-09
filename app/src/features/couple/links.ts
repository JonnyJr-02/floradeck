/**
 * Moving things between the two phones: the gift picture through the share sheet, the pairing
 * code's progress link, and the clipboard for the older links' iPhone bridge.
 */

const base = () => `${location.origin}${import.meta.env.BASE_URL}`

/** The link inside the pairing QR code (a phone's own camera app may open it too). */
export const progressLink = (payload: string) => `${base()}coppia/progressi#${payload}`

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older browsers: a hidden textarea and the legacy copy command.
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.append(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

/** Save a file the plain way (download), for when the share sheet cannot take it. */
export function saveFile(file: File) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
}

/**
 * Send a picture with the phone's share sheet (WhatsApp is one tap away there). Only the file:
 * some apps drop a picture that comes with text. Without a share sheet, the picture is saved.
 */
export async function sharePicture(file: File): Promise<ShareResult | 'saved'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  saveFile(file)
  return 'saved'
}
