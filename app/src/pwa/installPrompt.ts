import { useSyncExternalStore } from 'react'

/** Chrome's install event (not in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallAvailability = 'available' | 'installed' | 'unavailable'

let deferred: BeforeInstallPromptEvent | null = null
let installedNow = false
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

/**
 * Chrome fires beforeinstallprompt once, early, and only on Android/desktop. Keep the event
 * so the install screen can show its own button instead of Chrome's mini bar.
 */
export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installedNow = true
    notify()
  })
}

/** Shows Chrome's install dialog; resolves true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred
  if (!event) return false
  deferred = null
  notify()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome === 'accepted'
}

function snapshot(): InstallAvailability {
  if (deferred) return 'available'
  return installedNow ? 'installed' : 'unavailable'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useInstallAvailability(): InstallAvailability {
  return useSyncExternalStore(subscribe, snapshot)
}
