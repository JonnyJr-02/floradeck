import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { checkGift, GiftError, importGift, type GiftCheck } from '../../db/couple'
import { db } from '../../db/db'
import { speciesById } from '../../domain/catalog'
import { ShareError } from '../../domain/share'
import { decodeFile, preparePhoto } from '../../photo/photo'
import { currentPlatform, isInstalled } from '../../pwa/environment'
import { IN_APP } from '../../ui/Page'
import { GiftPreview } from './GiftPreview'
import { copyText } from './links'

type View = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; check: GiftCheck }

/**
 * Opening a gift link (/regalo#g1.…). On iPhone the link opens in Safari, whose storage is not the
 * Home-screen app's: there the main action copies the gift, to paste it inside the app.
 */
export function ReceiveGiftScreen() {
  const [, navigate] = useLocation()
  // The payload is in the fragment; the whole link is what gets copied into the app.
  const [link] = useState(() => window.location.href)
  const [payload] = useState(() => window.location.hash)
  const [view, setView] = useState<View>({ kind: 'loading' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [bridge] = useState(() => currentPlatform() === 'ios' && !isInstalled())

  useEffect(() => {
    let live = true
    checkGift(payload).then(
      (check) => live && setView({ kind: 'ready', check }),
      (caught: unknown) =>
        live && setView({ kind: 'error', message: caught instanceof ShareError ? caught.message : 'Questo regalo non si apre.' }),
    )
    return () => {
      live = false
    }
  }, [payload])

  const check = view.kind === 'ready' ? view.check : undefined
  const ownSent = useLiveQuery(
    async () => (check?.status === 'own' ? ((await db.sentGifts.get(check.gift.giftId)) ?? null) : null),
    [check],
  )
  const importedCard = useLiveQuery(
    async () => (check?.status === 'imported' && check.cardId ? ((await db.cards.get(check.cardId)) ?? null) : null),
    [check],
  )

  if (view.kind === 'loading') return <main className="page page--plain" aria-busy="true" />
  const entry = check ? speciesById(check.gift.speciesId) : undefined
  if (view.kind === 'error' || !check || !entry) {
    return (
      <main className="page page--plain">
        <h1 className="text-[1.75rem] leading-tight">Questo regalo non si apre</h1>
        <p className="mt-3 text-muted">
          {view.kind === 'error'
            ? view.message
            : 'La carta non c’è nel catalogo di questa app: aggiorna FloraDeck e riapri il regalo.'}
        </p>
        <Link href="/coppia" className="btn press mt-6">
          Vai a Coppia
        </Link>
      </main>
    )
  }

  const { gift } = check
  const from = gift.from ? `Un regalo di ${gift.from}` : 'Un regalo per te'

  async function add() {
    setSaving(true)
    setError(null)
    try {
      const bitmap = await decodeFile(new Blob([gift.photo.bytes.slice()], { type: gift.photo.type }))
      let photo
      try {
        photo = await preparePhoto(bitmap)
      } finally {
        bitmap.close()
      }
      const card = await importGift(gift, photo)
      navigate(`/carta/${card.id}`, { replace: true, state: { reveal: true } })
    } catch (caught) {
      setSaving(false)
      setError(caught instanceof GiftError ? caught.message : 'Non sono riuscito ad aggiungere il regalo. Riprova.')
    }
  }

  async function copyGift() {
    setCopied(null)
    setCopied(
      (await copyText(link))
        ? 'Regalo copiato. Ora apri FloraDeck dalla schermata Home.'
        : 'Non sono riuscito a copiarlo: tieni premuto il link nella chat e scegli «Copia».',
    )
  }

  return (
    <main className="page page--plain">
      {check.status === 'new' ? (
        <>
          <GiftPreview gift={gift} entry={entry} heading={from} headingLevel="h1" />
          {bridge ? (
            <>
              <section className="notice mt-5" aria-labelledby="bridge-title">
                <h2 id="bridge-title" className="text-[1.375rem] leading-tight">
                  Mettilo nell’app
                </h2>
                <p className="mt-1 text-[0.875rem] text-muted">
                  Sei in Safari, e FloraDeck sulla schermata Home ha una collezione tutta sua. Per trovarci il regalo:
                </p>
                <ol className="steps mt-3 text-[0.9375rem]">
                  <li>Tocca «Copia il regalo».</li>
                  <li>Apri FloraDeck dalla schermata Home.</li>
                  <li>In Coppia tocca «Incolla o apri un regalo».</li>
                </ol>
              </section>
              <div className="mt-5 grid gap-2.5">
                <button type="button" className="btn press" onClick={() => void copyGift()}>
                  Copia il regalo
                </button>
                <button type="button" className="btn btn--ghost press" disabled={saving} onClick={() => void add()}>
                  {saving ? 'Lo aggiungo…' : 'Aggiungilo qui in Safari'}
                </button>
              </div>
              <p role="status" className="mt-3 min-h-[1.5em] text-[0.875rem] font-semibold">
                {copied}
              </p>
            </>
          ) : (
            <div className="mt-6 grid gap-2.5">
              <button type="button" className="btn press" disabled={saving} onClick={() => void add()}>
                {saving ? 'Lo aggiungo…' : 'Aggiungi alla collezione'}
              </button>
              <Link href="/" className="btn btn--ghost press">
                Più tardi
              </Link>
            </div>
          )}
          {error ? (
            <p role="alert" className="mt-3 text-[0.875rem] font-semibold text-accent">
              {error}
            </p>
          ) : null}
        </>
      ) : check.status === 'imported' ? (
        <>
          <h1 className="text-[1.75rem] leading-tight">Questo regalo è già nella tua collezione</h1>
          <p className="mt-3 text-muted">
            {entry.commonNameIt}
            {gift.from ? ` di ${gift.from}` : ''} è arrivata una volta, e un regalo vale una volta sola.
          </p>
          <div className="mt-6 grid gap-2.5">
            {importedCard ? (
              <Link href={`/carta/${importedCard.id}`} state={IN_APP} className="btn press">
                Apri la carta
              </Link>
            ) : null}
            <Link href="/album" className={importedCard ? 'btn btn--ghost press' : 'btn press'}>
              Vai agli album
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-[1.75rem] leading-tight">È un regalo che hai fatto tu</h1>
          <p className="mt-3 text-muted">
            Mandalo all’altro telefono: aperto lì, {entry.commonNameIt} arriva nella sua collezione.
          </p>
          <div className="mt-6 grid gap-2.5">
            {ownSent ? (
              <Link href={`/coppia/regalo/${ownSent.giftId}`} state={IN_APP} className="btn press">
                Rivedi il regalo
              </Link>
            ) : null}
            <Link href="/coppia" className={ownSent ? 'btn btn--ghost press' : 'btn press'}>
              Vai a Coppia
            </Link>
          </div>
        </>
      )}
    </main>
  )
}
