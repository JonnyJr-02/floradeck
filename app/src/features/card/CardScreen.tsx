import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import { setCover, useCard, useCovers, usePhotos, useSpeciesCards } from '../../db/collection'
import { speciesById } from '../../domain/catalog'
import { formatFoundDate } from '../../domain/collection'
import { IconClose } from '../../ui/icons'
import { IN_APP } from '../../ui/Page'
import { PhotoThumb, usePhotoUrl } from '../../ui/PhotoThumb'
import { GOLD_COLOURS, Petals } from '../albums/Petals'
import { DeleteCard } from './DeleteCard'
import { RarityFrame } from './RarityFrame'
import { at, SpeciesSheet, SpeciesTitle } from './SpeciesSheet'

/** Play the unpacking only on arrival from a discovery, never again on Back/forward or reload. */
function useRevealOnce(): boolean {
  const [reveal] = useState(() => {
    const state = window.history.state as { reveal?: boolean } | null
    return state?.reveal === true
  })
  useEffect(() => {
    if (!reveal) return
    const state = (window.history.state ?? {}) as Record<string, unknown>
    window.history.replaceState({ ...state, reveal: false }, '')
  }, [reveal])
  return reveal
}

export function closeDetail(navigate: (to: string, options?: { replace?: boolean }) => void) {
  const state = window.history.state as { inApp?: boolean } | null
  if (state?.inApp) window.history.back()
  else navigate('/album', { replace: true })
}

/** Your other photos of the same species, with the cover marked; any of them can become the cover. */
function Copies({ speciesId, currentId }: { speciesId: string; currentId: string }) {
  const cards = useSpeciesCards(speciesId)
  const covers = useCovers()
  const photos = usePhotos((cards ?? []).flatMap((card) => (card.photoId ? [card.photoId] : [])))
  if (!cards || cards.length < 2) return null
  const coverId = covers.get(speciesId) ?? cards[0]?.id
  return (
    <section className="reveal-item mt-8" aria-labelledby="copies-title">
      <h2 id="copies-title" className="text-[1.375rem] leading-tight">
        Le tue foto ({cards.length})
      </h2>
      <p className="mt-1 text-[0.875rem] text-muted">
        La copertina rappresenta la specie nell&apos;album; le altre sono doppioni da regalare.
      </p>
      <ul role="list" className="copies mt-3">
        {cards.map((card) => (
          <li key={card.id}>
            <Link
              href={`/carta/${card.id}`}
              state={IN_APP}
              replace
              className="copies__item press"
              aria-current={card.id === currentId ? 'true' : undefined}
              aria-label={`Foto del ${formatFoundDate(card.foundAt)}${card.id === coverId ? ', copertina' : ''}`}
            >
              <PhotoThumb photo={card.photoId ? photos.get(card.photoId) : undefined} alt="" />
              {card.id === coverId ? <span className="copies__badge">Copertina</span> : null}
            </Link>
          </li>
        ))}
      </ul>
      {currentId !== coverId ? (
        <button type="button" className="btn btn--ghost press mt-4" onClick={() => void setCover(speciesId, currentId)}>
          Usa questa foto come copertina
        </button>
      ) : null}
    </section>
  )
}

export function CardScreen() {
  const { id = '' } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const data = useCard(id)
  const reveal = useRevealOnce()
  const photoUrl = usePhotoUrl(data?.photo)

  if (data === null) return <main className="min-h-dvh bg-paper" aria-busy="true" />
  const entry = data ? speciesById(data.card.speciesId) : undefined
  if (!data || !entry) {
    return (
      <main className="page page--plain">
        <h1 className="text-[1.75rem] leading-tight">Carta non trovata</h1>
        <p className="mt-3 text-muted">
          {data ? 'Questa specie non fa più parte del catalogo.' : 'Questa carta non è più nella collezione.'}
        </p>
        <Link href="/album" className="btn press mt-6">
          Vai agli album
        </Link>
      </main>
    )
  }

  const duplicate = data.copies > 1
  const albumHref = `/album/${entry.albumId}`

  return (
    <main className={reveal ? 'card-view card-view--reveal' : 'card-view'} data-rarity={entry.rarity}>
      {reveal && entry.rarity === 'legendary' && !duplicate ? <Petals colours={GOLD_COLOURS} /> : null}
      <RarityFrame rarity={entry.rarity} reveal={reveal}>
        {photoUrl ? (
          <img src={photoUrl} alt={`La tua foto: ${entry.commonNameIt}`} />
        ) : (
          <div className="grid h-full place-items-center text-muted">Foto non disponibile</div>
        )}
        <button
          type="button"
          className="round-btn press card-view__close"
          onClick={() => closeDetail(navigate)}
          aria-label="Chiudi"
        >
          <IconClose />
        </button>
      </RarityFrame>

      <section className="card-view__body">
        {reveal ? (
          <p className="reveal-item text-[0.875rem] font-semibold text-accent" style={at(0)}>
            {duplicate ? 'Ancora una!' : entry.rarity === 'legendary' ? 'Carta leggendaria!' : 'Nuova carta!'}
          </p>
        ) : null}
        <SpeciesTitle entry={entry} extraChips={duplicate ? <li className="chip">Doppione</li> : null} />
        <p className="reveal-item mt-3 text-[0.875rem] text-muted" style={at(4)}>
          Trovata il {formatFoundDate(data.card.foundAt)}
          {data.card.identifiedBy === 'user' ? ' · specie scelta da te' : ''}
        </p>
        {reveal && duplicate ? (
          <p className="reveal-item mt-2 text-[0.875rem] text-muted" style={at(4)}>
            Ne avevi già {data.copies - 1 === 1 ? 'una' : data.copies - 1}: questa va tra i doppioni, da regalare.
          </p>
        ) : null}
        <p className="reveal-item mt-3 text-[0.96875rem] leading-normal" style={at(5)}>
          {entry.description}
        </p>

        <div className="reveal-item mt-6 grid gap-2.5" style={at(6)}>
          {reveal ? (
            <Link href={albumHref} state={{ inApp: true, fill: entry.id }} replace className="btn press">
              Metti nell&apos;album
            </Link>
          ) : (
            <Link href={albumHref} state={IN_APP} className="btn press">
              Vai all&apos;album
            </Link>
          )}
          <Link href="/" className="btn btn--ghost press">
            Scatta un&apos;altra foto
          </Link>
        </div>

        <Copies speciesId={entry.id} currentId={data.card.id} />
        <SpeciesSheet entry={entry} />
        <DeleteCard cardId={data.card.id} copies={data.copies} speciesName={entry.commonNameIt} albumHref={albumHref} />
      </section>
    </main>
  )
}
