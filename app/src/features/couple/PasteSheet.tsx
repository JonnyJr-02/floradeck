import { useState } from 'react'
import { useLocation } from 'wouter'
import { extractPayload, GIFT_PREFIX, SNAPSHOT_PREFIX } from '../../domain/share'
import { Sheet } from '../../ui/Sheet'

/** Where a pasted FloraDeck link leads: a gift or the other player's progress. */
export function linkTarget(text: string): string | null {
  const gift = extractPayload(text, GIFT_PREFIX)
  if (gift) return `/regalo#${GIFT_PREFIX}${gift}`
  const progress = extractPayload(text, SNAPSHOT_PREFIX)
  if (progress) return `/coppia/progressi#${SNAPSHOT_PREFIX}${progress}`
  return null
}

/**
 * The bridge for links that opened in the wrong place (on iPhone: Safari instead of the Home-screen
 * app) or that a chat cut short: paste the link, or open the .floradeck file.
 */
export function PasteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const canRead = typeof navigator.clipboard?.readText === 'function'

  function openText(value: string) {
    const target = linkTarget(value)
    if (!target) {
      setError('Questo non è un link di FloraDeck: copia tutto il link del regalo e riprova.')
      return
    }
    setText('')
    setError(null)
    onClose()
    navigate(target, { state: { inApp: true } })
  }

  async function paste() {
    setError(null)
    try {
      openText(await navigator.clipboard.readText())
    } catch {
      setError('Non riesco a leggere gli appunti: tieni premuto nel riquadro qui sotto e scegli «Incolla».')
    }
  }

  async function openFile(file: File | undefined) {
    if (!file) return
    if (file.size > 400_000) {
      setError('Questo file è troppo grande per essere un regalo di FloraDeck.')
      return
    }
    openText(await file.text())
  }

  return (
    <Sheet open={open} labelledBy="paste-title" onClose={onClose}>
      <h2 id="paste-title" className="text-[1.75rem] leading-[1.05]">
        Incolla un link
      </h2>
      <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
        Un regalo o dei progressi arrivati in chat: copia il link e aprilo qui. Vale anche un file .floradeck.
      </p>
      <div className="mt-5 grid gap-4">
        {canRead ? (
          <button type="button" className="btn press" onClick={() => void paste()}>
            Incolla dagli appunti
          </button>
        ) : null}
        <form
          className="grid gap-2.5"
          onSubmit={(event) => {
            event.preventDefault()
            openText(text)
          }}
        >
          <label className="field">
            {canRead ? 'Oppure incollalo qui' : 'Incollalo qui'}
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="https://…/regalo#g1…"
            />
          </label>
          <button type="submit" className={canRead ? 'btn btn--ghost press' : 'btn press'} disabled={!text.trim()}>
            Apri
          </button>
        </form>
        <label className="btn btn--ghost press control">
          Apri un file .floradeck
          <input
            type="file"
            className="sr-only"
            onChange={(event) => {
              void openFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
        {error ? (
          <p role="alert" className="text-[0.875rem] font-semibold text-accent">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  )
}
