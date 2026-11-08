import { useState } from 'react'
import { useLocation } from 'wouter'
import { deleteCard } from '../../db/collection'
import { Sheet } from '../../ui/Sheet'

/** At the bottom of a card: remove it, as if it had never been found (with a confirmation). */
export function DeleteCard({
  cardId,
  copies,
  speciesName,
  albumHref,
}: {
  cardId: string
  copies: number
  speciesName: string
  albumHref: string
}) {
  const [, navigate] = useLocation()
  const [confirming, setConfirming] = useState(false)
  const last = copies <= 1

  async function remove() {
    setConfirming(false)
    await deleteCard(cardId)
    navigate(albumHref, { replace: true })
  }

  return (
    <section className="mt-10 border-t border-line pt-6" aria-labelledby="delete-card-title">
      <h2 id="delete-card-title" className="sr-only">
        Elimina la carta
      </h2>
      <button type="button" className="btn btn--ghost press" onClick={() => setConfirming(true)}>
        Elimina questa carta
      </button>
      <Sheet open={confirming} labelledBy="delete-card-sheet" onClose={() => setConfirming(false)}>
        <h2 id="delete-card-sheet" className="text-[1.75rem] leading-[1.05]">
          Eliminare questa carta?
        </h2>
        <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
          {last
            ? `La foto sparisce e ${speciesName} torna tra le specie da trovare, come se non l'avessi mai trovata.`
            : `La foto sparisce; ti restano ${copies - 1 === 1 ? 'un’altra carta' : `altre ${copies - 1} carte`} di ${speciesName}.`}{' '}
          Non si può annullare, a meno di un backup fatto prima.
        </p>
        <div className="mt-5 grid gap-2.5">
          <button type="button" className="btn press" onClick={() => void remove()}>
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
