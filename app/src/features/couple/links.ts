/**
 * Links between the two phones. The payload rides in the URL fragment (#…), which browsers never
 * send to the web server.
 */

const base = () => `${location.origin}${import.meta.env.BASE_URL}`

export const giftLink = (payload: string) => `${base()}regalo#${payload}`
export const progressLink = (payload: string) => `${base()}coppia/progressi#${payload}`

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/** The phone's share sheet (WhatsApp, Messaggi…), or the clipboard where there is none. */
export async function shareLink(url: string, title: string, text: string): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed'
}

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

/** A .floradeck file holding the same link, for when a chat app shortens long links. */
export async function shareFile(url: string, name: string): Promise<ShareResult> {
  const file = new File([url], name, { type: 'text/plain' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
  return 'shared'
}
