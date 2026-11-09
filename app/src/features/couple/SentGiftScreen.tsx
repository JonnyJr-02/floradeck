import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'wouter'
import { markGiftSent, usePartner } from '../../db/couple'
import { db, type SentGiftRecord } from '../../db/db'
import { speciesById } from '../../domain/catalog'
import { decodeGift, type Gift } from '../../domain/share'
import { BackHeader, Page } from '../../ui/Page'
import { GiftPreview } from './GiftPreview'
import { copyText, giftLink, shareFile, shareLink, type ShareResult } from './links'

const MESSAGES: Record<ShareResult, string | null> = {
  shared: 'Inviato. Se il link si perde, inoltra di nuovo il messaggio dalla chat.',
  copied: 'Link copiato: incollalo nella chat.',
  cancelled: null,
  failed: 'Non sono riuscito a copiare il link: prova «Invia come file».',
}

/**
 * A gift made and not sent yet. Once its link has left the phone (share sheet, copy or file) the
 * gift is not kept, to save space: the chat holds it. While this page stays open it can still be
 * sent again.
 */
export function SentGiftScreen() {
  const { id = '' } = useParams<{ id: string }>()
  // Read once: after sending, the record goes, but the open page keeps the link.
  const [record, setRecord] = useState<SentGiftRecord | null | undefined>(undefined)
  const partner = usePartner()
  const [status, setStatus] = useState<string | null>(null)
  const [fresh] = useState(() => (window.history.state as { fresh?: boolean } | null)?.fresh === true)

  useEffect(() => {
    let live = true
    void db.sentGifts.get(id).then((found) => live && setRecord(found ?? null))
    return () => {
      live = false
    }
  }, [id])

  const gift = useMemo<Gift | undefined>(() => {
    if (!record) return undefined
    try {
      return decodeGift(record.payload)
    } catch {
      return undefined
    }
  }, [record])

  if (record === undefined) return <main className="page" aria-busy="true" />
  const entry = gift ? speciesById(gift.speciesId) : undefined
  if (!record || !gift || !entry) {
    return (
      <Page>
        <BackHeader title="Regalo" fallback="/coppia" />
        <p className="mt-6 text-muted">
          Questo regalo è già partito e non resta sul telefono. Se il link si è perso, inoltra di nuovo il messaggio dalla
          chat in cui l’hai mandato.
        </p>
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
    const result = await action()
    setStatus(MESSAGES[result])
    if (result === 'shared' || result === 'copied') await markGiftSent(id)
  }

  return (
    <Page>
      <BackHeader title={fresh ? 'Regalo pronto' : 'Regalo da inviare'} fallback="/coppia" />
      <p className="mt-3 text-muted">
        {fresh ? 'La carta ha lasciato la tua collezione: ora è in questo link. ' : ''}
        Mandalo a {to} su WhatsApp, Messaggi o dove preferisci. Appena è partito non resta sul telefono: lo tiene la
        chat.
      </p>
      <div className="mt-5">
        <GiftPreview
          gift={gift}
          entry={entry}
          heading={
            [gift.from && `Da ${gift.from}`, partner?.name && `per ${partner.name}`].filter(Boolean).join(' ') ||
            'Il tuo regalo'
          }
        />
      </div>
      <div className="mt-6 grid gap-2.5">
        <button
          type="button"
          className="btn press"
          onClick={() =>
            void run(() =>
              shareLink(url, `Un regalo: ${entry.commonNameIt}`, `Ti ho regalato una carta di FloraDeck: ${entry.commonNameIt}.`),
            )
          }
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
