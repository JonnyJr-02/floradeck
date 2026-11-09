import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'wouter'
import { usePartner } from '../../db/couple'
import { db } from '../../db/db'
import { speciesById } from '../../domain/catalog'
import { formatFoundDate } from '../../domain/collection'
import { decodeGift, type Gift } from '../../domain/share'
import { BackHeader, Page } from '../../ui/Page'
import { GiftPreview } from './GiftPreview'
import { copyText, giftLink, shareFile, shareLink, type ShareResult } from './links'

const MESSAGES: Record<ShareResult, string | null> = {
  shared: null,
  copied: 'Link copiato: incollalo nella chat.',
  cancelled: null,
  failed: 'Non sono riuscito a copiare il link: prova «Invia come file».',
}

/** A gift already made: send its link, now or again later (the same link, valid once). */
export function SentGiftScreen() {
  const { id = '' } = useParams<{ id: string }>()
  const record = useLiveQuery(() => db.sentGifts.get(id), [id], null)
  const partner = usePartner()
  const [status, setStatus] = useState<string | null>(null)
  const [fresh] = useState(() => (window.history.state as { fresh?: boolean } | null)?.fresh === true)
  const gift = useMemo<Gift | undefined>(() => {
    if (!record) return undefined
    try {
      return decodeGift(record.payload)
    } catch {
      return undefined
    }
  }, [record])

  if (record === null) return <main className="page" aria-busy="true" />
  const entry = gift ? speciesById(gift.speciesId) : undefined
  if (!record || !gift || !entry) {
    return (
      <Page>
        <BackHeader title="Regalo" fallback="/coppia" />
        <p className="mt-6 text-muted">Questo regalo non è più su questo telefono.</p>
        <Link href="/coppia" className="btn press mt-6">
          Vai a Coppia
        </Link>
      </Page>
    )
  }

  const url = giftLink(record.payload)
  const to = partner?.name || 'chi gioca con te'
  const fileName = `regalo-${entry.id}.floradeck`

  async function run(action: () => Promise<ShareResult>) {
    setStatus(null)
    setStatus(MESSAGES[await action()])
  }

  return (
    <Page>
      <BackHeader title={fresh ? 'Regalo pronto' : 'Il tuo regalo'} fallback="/coppia" />
      <p className="mt-3 text-muted">
        {fresh
          ? `La carta ha lasciato la tua collezione: ora è in questo link. Mandalo a ${to} su WhatsApp, Messaggi o dove preferisci.`
          : `Preparato il ${formatFoundDate(record.createdAt)}. Se il link si è perso, rimandalo pure: vale sempre una volta sola.`}
      </p>
      <div className="mt-5">
        <GiftPreview gift={gift} entry={entry} heading={[gift.from && `Da ${gift.from}`, partner?.name && `per ${partner.name}`].filter(Boolean).join(' ') || 'Il tuo regalo'} />
      </div>
      <div className="mt-6 grid gap-2.5">
        <button
          type="button"
          className="btn press"
          onClick={() => void run(() => shareLink(url, `Un regalo: ${entry.commonNameIt}`, `Ti ho regalato una carta di FloraDeck: ${entry.commonNameIt}.`))}
        >
          Invia il regalo
        </button>
        <button
          type="button"
          className="btn btn--ghost press"
          onClick={() => void run(async () => ((await copyText(url)) ? 'copied' : 'failed'))}
        >
          Copia il link
        </button>
      </div>
      <p role="status" className="mt-3 min-h-[1.5em] text-[0.875rem] font-semibold">
        {status}
      </p>
      <section className="mt-4 border-t border-line pt-5" aria-labelledby="gift-file-title">
        <h2 id="gift-file-title" className="text-[1.375rem] leading-tight">
          Il link non arriva intero?
        </h2>
        <p className="mt-1 text-[0.875rem] text-muted">
          Alcune chat accorciano i link lunghi. Manda il regalo come file: chi lo riceve lo salva e lo apre da Coppia, con
          «Incolla un link».
        </p>
        <button type="button" className="btn btn--ghost press mt-3" onClick={() => void run(() => shareFile(url, fileName))}>
          Invia come file
        </button>
      </section>
    </Page>
  )
}
