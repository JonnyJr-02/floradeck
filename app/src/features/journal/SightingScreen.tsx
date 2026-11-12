import { useState } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import { deleteSighting, sightingName, useSighting } from '../../db/sightings'
import { formatFoundDate } from '../../domain/collection'
import { IconClose } from '../../ui/icons'
import { usePhotoUrl } from '../../ui/PhotoThumb'
import { Sheet } from '../../ui/Sheet'

/** A plant outside the albums, from the diary: the user's photo, the name, Wikipedia, delete. */
export function SightingScreen() {
  const { id = '' } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const data = useSighting(id)
  const photoUrl = usePhotoUrl(data?.photo)
  const [confirming, setConfirming] = useState(false)

  const close = () => {
    const state = window.history.state as { inApp?: boolean } | null
    if (state?.inApp) window.history.back()
    else navigate('/diario', { replace: true })
  }

  if (data === null) return <main className="min-h-dvh bg-paper" aria-busy="true" />
  if (!data) {
    return (
      <main className="page page--plain">
        <h1 className="text-[1.75rem] leading-tight">Non è più nel diario</h1>
        <Link href="/diario" className="btn press mt-6">
          Vai al diario
        </Link>
      </main>
    )
  }
  const { sighting } = data
  const name = sightingName(sighting)

  return (
    <main className="card-view">
      <div className="card-view__hero">
        {photoUrl ? <img src={photoUrl} alt={`La tua foto: ${name}`} /> : null}
        <button type="button" className="round-btn press card-view__close" onClick={close} aria-label="Chiudi">
          <IconClose />
        </button>
      </div>
      <section className="card-view__body">
        <h1 className="text-[2.375rem] leading-[1.02]">{name}</h1>
        {sighting.italian ? <p className="mt-1 text-[0.9375rem] italic text-muted">{sighting.scientific}</p> : null}
        <ul role="list" className="chips mt-3.5">
          <li className="chip">Fuori album</li>
        </ul>
        <p className="mt-3 text-[0.875rem] text-muted">Vista il {formatFoundDate(sighting.foundAt)}</p>
        <p className="mt-3 text-[0.96875rem] leading-normal">
          Non è una delle figurine da collezionare: resta nel diario con la tua foto. Il nome viene dal riconoscimento di
          tutte le piante ed è un’indicazione, non una certezza.
        </p>
        <div className="mt-6 grid gap-2.5">
          <a
            className="btn press"
            href={`https://it.wikipedia.org/w/index.php?search=${encodeURIComponent(sighting.scientific)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Leggi su Wikipedia
          </a>
          <Link href="/diario" className="btn btn--ghost press">
            Vai al diario
          </Link>
        </div>
        <section className="mt-10 border-t border-line pt-6" aria-labelledby="delete-sighting-title">
          <h2 id="delete-sighting-title" className="sr-only">
            Togli dal diario
          </h2>
          <button type="button" className="btn btn--danger press" onClick={() => setConfirming(true)}>
            Togli dal diario
          </button>
        </section>
      </section>
      <Sheet open={confirming} labelledBy="delete-sighting-sheet" onClose={() => setConfirming(false)}>
        <h2 id="delete-sighting-sheet" className="text-[1.75rem] leading-[1.05]">
          Togliere {name} dal diario?
        </h2>
        <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">La foto sparisce. Non si può annullare.</p>
        <div className="mt-5 grid gap-2.5">
          <button
            type="button"
            className="btn press"
            onClick={() => {
              setConfirming(false)
              void deleteSighting(sighting.id).then(() => navigate('/diario', { replace: true }))
            }}
          >
            Togli
          </button>
          <button type="button" className="btn btn--ghost press" onClick={() => setConfirming(false)}>
            Annulla
          </button>
        </div>
      </Sheet>
    </main>
  )
}
