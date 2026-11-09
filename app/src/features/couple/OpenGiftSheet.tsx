import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { checkGiftInfo, GiftError, importGift, receiveProgress, type GiftCheck } from '../../db/couple'
import { speciesById } from '../../domain/catalog'
import { catalogueIds } from '../../domain/couple'
import { decodeGiftCode, extractPayload, GIFT_PREFIX, ShareError, SNAPSHOT_PREFIX, type Snapshot } from '../../domain/share'
import type { PreparedPhoto } from '../../photo/photo'
import { IN_APP } from '../../ui/Page'
import { Sheet } from '../../ui/Sheet'
import { readGiftImage } from './giftImage'
import { GiftPreview, useObjectUrl } from './GiftPreview'

/** Where an older FloraDeck link leads: a gift link or a progress link. */
export function linkTarget(text: string): string | null {
  const gift = extractPayload(text, GIFT_PREFIX)
  if (gift) return `/regalo#${GIFT_PREFIX}${gift}`
  const progress = extractPayload(text, SNAPSHOT_PREFIX)
  if (progress) return `/coppia/progressi#${SNAPSHOT_PREFIX}${progress}`
  return null
}

type Step =
  | { kind: 'pick' }
  | { kind: 'reading' }
  | { kind: 'preview'; check: GiftCheck; photo: PreparedPhoto; progress?: Snapshot }

/**
 * «Apri un regalo»: pick the gift picture saved from the chat; the app reads the gift from its QR
 * code and the photo from its top, shows it, and adds it once. Older gift links are still accepted.
 */
export function OpenGiftSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation()
  const [step, setStep] = useState<Step>({ kind: 'pick' })
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [link, setLink] = useState('')
  const photoUrl = useObjectUrl(step.kind === 'preview' ? step.photo.image : undefined)

  useEffect(() => {
    if (!open) return
    setStep({ kind: 'pick' })
    setError(null)
    setAdding(false)
    setLink('')
  }, [open])

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    setStep({ kind: 'reading' })
    try {
      const { code, photo } = await readGiftImage(file)
      const { gift, progress } = decodeGiftCode(code, catalogueIds)
      if (!speciesById(gift.speciesId)) throw new ShareError('Questa carta non c’è nel catalogo di questa app: aggiorna FloraDeck e riprova.')
      setStep({ kind: 'preview', check: await checkGiftInfo(gift), photo, progress })
    } catch (caught) {
      setStep({ kind: 'pick' })
      setError(caught instanceof ShareError ? caught.message : 'Non sono riuscito ad aprire questa immagine. Riprova.')
    }
  }

  async function add() {
    if (step.kind !== 'preview') return
    setAdding(true)
    setError(null)
    try {
      const card = await importGift(step.check.gift, step.photo)
      await receiveProgress(step.progress)
      onClose()
      navigate(`/carta/${card.id}`, { state: { inApp: true, reveal: true } })
    } catch (caught) {
      setAdding(false)
      setError(caught instanceof GiftError ? caught.message : 'Non sono riuscito ad aggiungere il regalo. Riprova.')
    }
  }

  const entry = step.kind === 'preview' ? speciesById(step.check.gift.speciesId) : undefined

  return (
    <Sheet open={open} labelledBy="open-gift-title" onClose={onClose} tall>
      <h2 id="open-gift-title" className="text-[1.75rem] leading-[1.05]">
        Apri un regalo
      </h2>
      {step.kind === 'preview' && entry ? (
        <>
          <div className="mt-4">
            <GiftPreview
              gift={step.check.gift}
              entry={entry}
              photoUrl={photoUrl}
              heading={step.check.gift.from ? `Un regalo di ${step.check.gift.from}` : 'Un regalo per te'}
              headingLevel="h3"
            />
          </div>
          {step.check.status === 'new' ? (
            <button type="button" className="btn btn--gift press mt-5" disabled={adding} onClick={() => void add()}>
              {adding ? 'Lo aggiungo…' : 'Aggiungi alla collezione'}
            </button>
          ) : step.check.status === 'imported' ? (
            <>
              <p className="notice mt-5 text-[0.9375rem]">Questo regalo è già nella tua collezione: un regalo vale una volta sola.</p>
              {step.check.cardId ? (
                <Link href={`/carta/${step.check.cardId}`} state={IN_APP} className="btn press mt-3" onClick={onClose}>
                  Apri la carta
                </Link>
              ) : null}
            </>
          ) : (
            <p className="notice mt-5 text-[0.9375rem]">
              È un regalo che hai fatto tu: mandalo all’altro telefono, sarà lui ad aprirlo.
            </p>
          )}
          <button type="button" className="btn btn--ghost press mt-2.5" onClick={() => setStep({ kind: 'pick' })}>
            Scegli un’altra immagine
          </button>
        </>
      ) : (
        <>
          <ol className="steps mt-4 text-[0.9375rem]">
            <li>Su WhatsApp apri l’immagine del regalo e salvala (su iPhone: Condividi → Salva immagine).</li>
            <li>Sceglila qui sotto.</li>
          </ol>
          <label className="btn btn--gift press control mt-5" aria-disabled={step.kind === 'reading' || undefined}>
            {step.kind === 'reading' ? 'Apro il regalo…' : 'Scegli l’immagine del regalo'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={step.kind === 'reading'}
              onChange={(event) => {
                void pick(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
          <details className="mt-6 text-[0.875rem]">
            <summary className="cursor-pointer font-semibold">Ti è arrivato un link invece di un’immagine?</summary>
            <p className="mt-2 text-muted">
              Sono i regali delle versioni precedenti. Su WhatsApp tieni premuto il messaggio intero, scegli «Copia» e
              incollalo qui.
            </p>
            <form
              className="mt-3 grid gap-2.5"
              onSubmit={(event) => {
                event.preventDefault()
                const target = linkTarget(link)
                if (!target) {
                  setError(
                    /regalo#g1\.?\s*$/.test(link.trim())
                      ? 'Il link è arrivato tagliato: WhatsApp accorcia i link molto lunghi. Copia il messaggio intero (tienilo premuto → Copia), non solo il link. Se anche così non va, il regalo è andato perso: i nuovi arrivano come immagini.'
                      : 'Questo non è un link di FloraDeck.',
                  )
                  return
                }
                onClose()
                navigate(target, { state: { inApp: true } })
              }}
            >
              <label className="field">
                Il messaggio con il link
                <textarea
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  rows={3}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
              <button type="submit" className="btn btn--ghost press" disabled={!link.trim()}>
                Apri il link
              </button>
            </form>
          </details>
        </>
      )}
      {error ? (
        <p role="alert" className="mt-4 text-[0.875rem] font-semibold text-accent">
          {error}
        </p>
      ) : null}
    </Sheet>
  )
}
