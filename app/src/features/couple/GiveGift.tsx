import { useState } from 'react'
import { useLocation } from 'wouter'
import { createGift, GiftError, saveProfile, usePartner, useProfile } from '../../db/couple'
import type { PhotoRecord } from '../../db/db'
import { giftPhoto } from '../../photo/giftPhoto'
import { Sheet } from '../../ui/Sheet'

const MESSAGE_MAX = 200

/**
 * On a duplicate card: give it to the other player. The card leaves this collection when the gift
 * is made (CLAUDE.md, Gifts and couple), then the sent-gift page sends the link.
 */
export function GiveGift({ cardId, photo, speciesName }: { cardId: string; photo: PhotoRecord; speciesName: string }) {
  const [, navigate] = useLocation()
  const profile = useProfile()
  const partner = usePartner()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const needsName = !profile?.name
  const partnerName = partner?.name || 'chi gioca con te'

  function start() {
    setName(profile?.name ?? '')
    setError(null)
    setOpen(true)
  }

  async function give() {
    if (needsName && !name.trim()) {
      setError('Scrivi il tuo nome: lo vede chi riceve il regalo.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (needsName) await saveProfile({ name })
      const small = await giftPhoto(photo)
      const sent = await createGift({ cardId, message, photo: small })
      navigate(`/coppia/regalo/${sent.giftId}`, { replace: true, state: { inApp: true, fresh: true } })
    } catch (caught) {
      setBusy(false)
      setError(caught instanceof GiftError ? caught.message : 'Non sono riuscito a preparare il regalo. Riprova.')
    }
  }

  return (
    <>
      <button type="button" className="btn btn--ghost press" onClick={start}>
        Regala questa carta
      </button>
      <Sheet open={open} labelledBy="give-gift-title" onClose={() => (busy ? undefined : setOpen(false))}>
        <h2 id="give-gift-title" className="text-[1.75rem] leading-[1.05]">
          Regala questa carta
        </h2>
        <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
          {speciesName} con questa foto lascia la tua collezione e diventa un link da mandare a {partnerName}. Vale una
          volta sola: chi lo apre la trova tra le sue carte.
        </p>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void give()
          }}
        >
          {needsName ? (
            <label className="field">
              Il tuo nome
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                autoComplete="given-name"
                enterKeyHint="next"
                required
              />
              <span className="field__note">Lo vede chi riceve il regalo.</span>
            </label>
          ) : null}
          <label className="field">
            Un messaggio, se vuoi
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, MESSAGE_MAX))}
              maxLength={MESSAGE_MAX}
              rows={3}
              placeholder="L’ho trovata pensando a te"
            />
            <span className="field__note">{MESSAGE_MAX - message.length} caratteri liberi</span>
          </label>
          {error ? (
            <p role="alert" className="text-[0.875rem] font-semibold text-accent">
              {error}
            </p>
          ) : null}
          <div className="grid gap-2.5">
            <button type="submit" className="btn press" disabled={busy}>
              {busy ? 'Preparo il regalo…' : 'Crea il regalo'}
            </button>
            <button type="button" className="btn btn--ghost press" disabled={busy} onClick={() => setOpen(false)}>
              Annulla
            </button>
          </div>
        </form>
      </Sheet>
    </>
  )
}
