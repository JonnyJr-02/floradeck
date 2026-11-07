import { useRegisterSW } from 'virtual:pwa-register/react'
import { Toast, ToastRegion } from '../ui/Toast'

// An installed app can stay open for days: look for a new version every hour.
const UPDATE_CHECK_MS = 60 * 60 * 1000

/** Registers the service worker and tells the user when the app works offline or has an update. */
export function PwaStatus() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      window.setInterval(() => {
        if (navigator.onLine) void registration.update()
      }, UPDATE_CHECK_MS)
    },
  })

  return (
    <ToastRegion>
      {needRefresh ? (
        <Toast
          message="È pronta una nuova versione di FloraDeck."
          actionLabel="Aggiorna"
          onAction={() => void updateServiceWorker(true)}
          onClose={() => setNeedRefresh(false)}
        />
      ) : offlineReady ? (
        <Toast
          message="FloraDeck ora funziona anche senza rete."
          autoHideMs={6000}
          onClose={() => setOfflineReady(false)}
        />
      ) : null}
    </ToastRegion>
  )
}
