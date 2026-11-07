import { useState } from 'react'
import { Link } from 'wouter'
import { currentPlatform, isInstalled } from '../../pwa/environment'
import { IconClose } from '../../ui/icons'
import { IN_APP } from '../../ui/Page'

const DISMISSED_KEY = 'floradeck:install-nudge-dismissed'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/** Shown on Explore until the app is installed or the user hides it; Settings keeps the guide. */
export function InstallNudge() {
  const [dismissed, setDismissed] = useState(wasDismissed)
  if (dismissed || isInstalled()) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Without storage the card comes back next time: harmless.
    }
    setDismissed(true)
  }

  return (
    <aside className="nudge" aria-labelledby="install-nudge-title">
      <div className="min-w-0 flex-1">
        <h2 id="install-nudge-title" className="font-sans text-[0.9375rem] leading-snug font-semibold tracking-normal">
          Installa FloraDeck sul telefono
        </h2>
        <p className="mt-0.5 text-[0.875rem] leading-snug text-muted">
          {currentPlatform() === 'ios'
            ? "Su iPhone usala dall'icona sulla schermata Home: Safari tiene i suoi dati separati."
            : "Si apre come un'app e funziona anche senza rete."}
        </p>
        <Link href="/installa" state={IN_APP} className="text-link mt-2 inline-block text-[0.875rem]">
          Come si fa
        </Link>
      </div>
      <button
        type="button"
        className="round-btn press size-10 bg-transparent text-ink"
        onClick={dismiss}
        aria-label="Nascondi il suggerimento"
      >
        <IconClose className="size-5" />
      </button>
    </aside>
  )
}
