import { useEffect, useState } from 'react'
import { Link, useParams } from 'wouter'
import { markGiftSent, usePartner } from '../../db/couple'
import { db } from '../../db/db'
import { catalogueIds } from '../../domain/couple'
import { speciesById, type Species } from '../../domain/catalog'
import { decodeGift, encodeGiftCode, isGiftCode } from '../../domain/share'
import { BackHeader, Page } from '../../ui/Page'
import { renderGiftImage } from './giftImage'
import { useObjectUrl } from './GiftPreview'
import { saveFile, sharePicture } from './links'

interface Ready {
  file: File
  entry: Species
}

/** The gift picture of a stored gift; an older link gift (photo inside the link) is drawn now. */
async function pictureOf(giftId: string): Promise<Ready | null> {
  const record = await db.sentGifts.get(giftId)
  if (!record) return null
  const entry = speciesById(record.speciesId)
  if (!entry) return null
  const name = `regalo-floradeck-${entry.id}.jpg`
  if (record.image) return { file: new File([record.image], name, { type: record.imageType ?? 'image/jpeg' }), entry }
  if (isGiftCode(record.payload)) return null
  const { photo, ...gift } = decodeGift(record.payload)
  const picture = await renderGiftImage({
    photo: new Blob([photo.bytes.slice()], { type: photo.type }),
    entry,
    from: gift.from,
    message: gift.message,
    code: encodeGiftCode(gift, undefined, catalogueIds),
  })
  return { file: new File([picture], name, { type: picture.type }), entry }
}

/**
 * A gift made and not sent yet: its picture, to send on WhatsApp (or any chat). Once it has left
 * the phone the gift is not kept, to save space: the chat holds it. While this page stays open it
 * can still be sent again.
 */
export function SentGiftScreen() {
  const { id = '' } = useParams<{ id: string }>()
  const [ready, setReady] = useState<Ready | null | undefined>(undefined)
  const partner = usePartner()
  const [status, setStatus] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [fresh] = useState(() => (window.history.state as { fresh?: boolean } | null)?.fresh === true)
  const url = useObjectUrl(ready?.file)

  useEffect(() => {
    let live = true
    pictureOf(id).then(
      (found) => live && setReady(found),
      () => live && setReady(null),
    )
    return () => {
      live = false
    }
  }, [id])

  if (ready === undefined) return <main className="page" aria-busy="true" />
  if (!ready) {
    return (
      <Page>
        <BackHeader title="Regalo" fallback="/coppia" />
        <p className="mt-6 text-muted">Questo regalo è già partito: non resta sul telefono, lo tiene la chat.</p>
        <Link href="/coppia" className="btn press mt-6">
          Vai a Coppia
        </Link>
      </Page>
    )
  }

  const to = partner?.name || 'chi gioca con te'
  const { file, entry } = ready

  async function send() {
    setStatus(null)
    const result = await sharePicture(file)
    if (result === 'cancelled') return
    if (result === 'failed') {
      setStatus('Non sono riuscito a inviarla: prova «Salva l’immagine» e mandala dalla galleria.')
      return
    }
    setSent(true)
    setStatus(result === 'saved' ? 'Immagine salvata: mandala su WhatsApp dalla galleria.' : 'Inviato!')
    await markGiftSent(id)
  }

  async function save() {
    saveFile(file)
    setSent(true)
    setStatus('Immagine salvata: mandala su WhatsApp dalla galleria.')
    await markGiftSent(id)
  }

  return (
    <Page>
      <BackHeader title={fresh ? 'Regalo pronto' : 'Regalo da inviare'} fallback="/coppia" />
      <p className="mt-3 text-muted">
        {sent
          ? `${to} salva l’immagine e la apre in FloraDeck, da Coppia → «Apri un regalo».`
          : `Ecco il tuo regalo: ${entry.commonNameIt}. Mandalo a ${to} su WhatsApp come una foto.`}
      </p>
      {url ? <img className="gift-picture mt-5" src={url} alt={`L’immagine del regalo: ${entry.commonNameIt}`} /> : null}
      <div className="mt-6 grid gap-2.5">
        <button type="button" className="btn press" onClick={() => void send()}>
          {sent ? 'Invialo di nuovo' : 'Invia su WhatsApp'}
        </button>
        <p className="text-center text-[0.8125rem] text-muted">Nel menu che si apre scegli WhatsApp, poi la chat.</p>
        <button type="button" className="btn btn--ghost press" onClick={() => void save()}>
          Salva l’immagine
        </button>
      </div>
      <p role="status" className="mt-3 min-h-[1.5em] text-[0.875rem] font-semibold">
        {status}
      </p>
    </Page>
  )
}
