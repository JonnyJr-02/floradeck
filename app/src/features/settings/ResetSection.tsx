import { useState } from 'react'
import { useLocation } from 'wouter'
import { resetProgress } from '../../db/reset'
import { Sheet } from '../../ui/Sheet'

/**
 * At the very bottom of Impostazioni (user's request on 2026-11-16): start the collection again.
 * Two steps, with a reminder to make a backup first; it cannot be undone otherwise.
 */
export function ResetSection() {
  const [, navigate] = useLocation()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function reset() {
    setBusy(true)
    setFailed(false)
    try {
      await resetProgress()
      setConfirming(false)
      navigate('/album', { replace: true })
    } catch {
      setBusy(false)
      setFailed(true)
    }
  }

  return (
    <section className="mt-12 border-t border-line pt-6" aria-labelledby="settings-reset">
      <h2 id="settings-reset" className="text-[1.25rem] leading-tight">
        Ricomincia da capo
      </h2>
      <p className="mt-2 text-muted">
        Toglie tutte le carte, le foto, il diario e i regali non ancora inviati: gli album tornano vuoti. Restano il tuo
        nome, il collegamento con l’altro telefono e il tema.
      </p>
      <button type="button" className="btn btn--danger press mt-4" onClick={() => setConfirming(true)}>
        Azzera tutti i progressi
      </button>
      <Sheet open={confirming} labelledBy="reset-sheet-title" onClose={() => (busy ? undefined : setConfirming(false))}>
        <h2 id="reset-sheet-title" className="text-[1.75rem] leading-[1.05]">
          Azzerare tutti i progressi?
        </h2>
        <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
          Tutte le carte e le loro foto spariscono da questo telefono, insieme al diario e ai regali non ancora inviati.
          Non si può annullare: se vuoi poterle riavere, fai prima un backup qui sopra.
        </p>
        {failed ? (
          <p role="alert" className="mt-3 text-[0.875rem] font-semibold text-accent">
            Non sono riuscito ad azzerare. Riprova.
          </p>
        ) : null}
        <div className="mt-5 grid gap-2.5">
          <button type="button" className="btn press" disabled={busy} onClick={() => void reset()}>
            {busy ? 'Azzero…' : 'Sì, azzera tutto'}
          </button>
          <button type="button" className="btn btn--ghost press" disabled={busy} onClick={() => setConfirming(false)}>
            Annulla
          </button>
        </div>
      </Sheet>
    </section>
  )
}
