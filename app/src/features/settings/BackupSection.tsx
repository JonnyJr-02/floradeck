import { useRef, useState } from 'react'
import { backupFileName, BackupError, createBackup, parseBackup, restoreBackup } from '../../db/backup'
import { deleteCardsBy, useCardCountBy } from '../../db/collection'
import { Sheet } from '../../ui/Sheet'

const LAST_BACKUP_KEY = 'floradeck:last-backup'
const longDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

function lastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY)
  } catch {
    return null
  }
}

/** Hand the file to the share sheet (iPhone: «Salva su File», WhatsApp…) or download it. */
async function deliver(blob: Blob, name: string): Promise<boolean> {
  const file = new File([blob], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Backup di FloraDeck' })
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false
      // Some browsers list share but refuse files: fall back to a download.
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}

export function BackupSection() {
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState(lastBackup)
  const fileRef = useRef<HTMLInputElement>(null)

  async function save() {
    setBusy(true)
    setMessage(null)
    try {
      const backup = await createBackup(__APP_VERSION__)
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      if (await deliver(blob, backupFileName())) {
        const now = new Date().toISOString()
        try {
          localStorage.setItem(LAST_BACKUP_KEY, now)
        } catch {
          // Not remembered: harmless.
        }
        setLast(now)
        setMessage(`Backup pronto: ${backup.cards.length === 1 ? '1 carta' : `${backup.cards.length} carte`}.`)
      }
    } catch {
      setMessage('Non sono riuscito a creare il backup. Riprova.')
    } finally {
      setBusy(false)
    }
  }

  async function restore(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await restoreBackup(parseBackup(await file.text()))
      setMessage(
        result.cardsAdded === 0
          ? 'Nessuna carta nuova: erano già tutte qui.'
          : `Ripristinate ${result.cardsAdded === 1 ? '1 carta' : `${result.cardsAdded} carte`}${
              result.cardsAlreadyThere ? ` (${result.cardsAlreadyThere} c’erano già)` : ''
            }.`,
      )
    } catch (error) {
      setMessage(error instanceof BackupError ? error.message : 'Non sono riuscito a leggere il backup.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p className="mt-2 text-muted">
        Carte e foto stanno solo su questo telefono. Salva ogni tanto un backup (su File, Drive o in una chat) per
        non perderle se cambi telefono o se il browser cancella i dati.
      </p>
      {last ? <p className="mt-2 text-[0.875rem] text-muted">Ultimo backup: {longDate.format(new Date(last))}.</p> : null}
      <div className="mt-4 grid gap-2.5">
        <button type="button" className="btn press" disabled={busy} onClick={() => void save()}>
          Salva un backup
        </button>
        <button type="button" className="btn btn--ghost press" disabled={busy} onClick={() => fileRef.current?.click()}>
          Ripristina da un backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            void restore(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>
      <p className="mt-3 text-[0.875rem]" role="status">
        {message}
      </p>
    </>
  )
}

/** While the recogniser is the stand-in, its random cards can be cleared in one go. */
export function TestCardsSection() {
  const count = useCardCountBy('mock')
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState<number | null>(null)
  if (count === 0 && done === null) return null
  return (
    <section className="mt-9" aria-labelledby="settings-test-cards">
      <h2 id="settings-test-cards" className="text-[1.25rem] leading-tight">
        Carte di prova
      </h2>
      <p className="mt-2 text-muted">
        Le carte trovate con il riconoscimento di prova hanno una specie scelta a caso.
        {count > 0 ? ` Ora ce ne sono ${count}.` : ''}
      </p>
      {count > 0 ? (
        <button type="button" className="btn btn--ghost press mt-4" onClick={() => setConfirming(true)}>
          Elimina le carte di prova
        </button>
      ) : null}
      <p className="mt-3 text-[0.875rem]" role="status">
        {done !== null ? `Eliminate ${done === 1 ? '1 carta' : `${done} carte`} di prova.` : ''}
      </p>
      <Sheet open={confirming} labelledBy="delete-test-title" onClose={() => setConfirming(false)}>
        <h2 id="delete-test-title" className="text-[1.75rem] leading-[1.05]">
          Eliminare {count === 1 ? 'la carta' : `le ${count} carte`} di prova?
        </h2>
        <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
          Spariscono con le loro foto e non si possono recuperare, a meno di un backup fatto prima. Le carte
          riconosciute dal modello vero restano.
        </p>
        <div className="mt-5 grid gap-2.5">
          <button
            type="button"
            className="btn press"
            onClick={() => {
              setConfirming(false)
              void deleteCardsBy('mock').then(setDone)
            }}
          >
            Elimina
          </button>
          <button type="button" className="btn btn--ghost press" onClick={() => setConfirming(false)}>
            Annulla
          </button>
        </div>
      </Sheet>
    </section>
  )
}
