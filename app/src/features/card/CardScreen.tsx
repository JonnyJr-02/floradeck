import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useLocation, useParams } from 'wouter'
import { photoBlob, useCard } from '../../db/collection'
import { albumById, speciesById, type Species } from '../../domain/catalog'
import { cardNumberLabel, formatFoundDate, rarityLabel } from '../../domain/collection'
import { formatMonths } from '../../domain/seasonality'
import { IconClose } from '../../ui/icons'
import { IN_APP } from '../../ui/Page'

/** Position in the unpacking stagger (styles.css, .reveal-item); later items share the last slot. */
const at = (i: number) => ({ '--i': i }) as CSSProperties

function useObjectUrl(blob: Blob | undefined): string | undefined {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  return url
}

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

/** Safety lines: picking warnings for wild plants, and toxicity. Never claims a plant is edible. */
function SafetyNotes({ entry }: { entry: Species }) {
  const notes: string[] = []
  if (!entry.cultivated) {
    if (entry.protected === true) notes.push('Specie protetta: fotografala, non raccoglierla.')
    else if (entry.protected === null)
      notes.push('In alcune regioni potrebbe essere protetta: fotografala, non raccoglierla.')
    else notes.push('Fotografala, non raccoglierla.')
  }
  if (entry.protectionNote) notes.push(entry.protectionNote)
  if (entry.toxic) notes.push(entry.toxicNote || 'Pianta tossica: non assaggiarla.')
  if (notes.length === 0) return null
  return (
    <div className="notice reveal-item mt-6 grid gap-1">
      {notes.map((note) => (
        <p key={note} className="text-[0.9375rem] leading-snug">
          {note}
        </p>
      ))}
    </div>
  )
}

function Facts({ entry }: { entry: Species }) {
  const months = formatMonths(entry.bloomMonths)
  const rows: Array<[string, string]> = [
    [entry.phenology === 'fruiting' ? 'Frutti' : 'Fioritura', months],
    ['Dove cresce', entry.habitat],
    ['Altitudine', entry.altitude],
    ['In Italia', entry.regions],
    ['Dimensioni', entry.sizeNote],
  ]
  return (
    <dl className="facts reveal-item mt-6">
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{label === 'Fioritura' || label === 'Frutti' ? value.charAt(0).toUpperCase() + value.slice(1) : value}</dd>
          </div>
        ))}
    </dl>
  )
}

export function CardScreen() {
  const { id = '' } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const data = useCard(id)
  const reveal = useRevealOnce()
  const photo = data?.photo
  const blob = useMemo(() => (photo ? photoBlob(photo) : undefined), [photo])
  const photoUrl = useObjectUrl(blob)

  if (data === null) return <main className="min-h-dvh bg-paper" aria-busy="true" />
  const entry = data ? speciesById(data.card.speciesId) : undefined
  if (!data || !entry) {
    return (
      <main className="page page--plain">
        <h1 className="text-[1.75rem] leading-tight">Carta non trovata</h1>
        <p className="mt-3 text-muted">Questa carta non è più nella collezione.</p>
        <Link href="/album" className="btn press mt-6">
          Vai agli album
        </Link>
      </main>
    )
  }

  const album = albumById(entry.albumId)
  const number = cardNumberLabel(entry, album)
  const duplicate = data.copies > 1
  const close = () => {
    const state = window.history.state as { inApp?: boolean } | null
    if (state?.inApp) window.history.back()
    else navigate('/', { replace: true })
  }

  return (
    <main className={reveal ? 'card-view card-view--reveal' : 'card-view'}>
      <div className="card-view__hero">
        {photoUrl ? (
          <img src={photoUrl} alt={`La tua foto: ${entry.commonNameIt}`} />
        ) : (
          <div className="grid h-full place-items-center text-muted">Foto non disponibile</div>
        )}
        <button type="button" className="round-btn press card-view__close" onClick={close} aria-label="Chiudi">
          <IconClose />
        </button>
      </div>

      <section className="card-view__body">
        {reveal ? (
          <p className="reveal-item text-[0.875rem] font-semibold text-accent" style={at(0)}>
            {duplicate ? 'Ancora una!' : 'Nuova carta!'}
          </p>
        ) : null}
        <h1 className="reveal-item text-[2.375rem] leading-[1.02]" style={at(1)}>{entry.commonNameIt}</h1>
        <p className="reveal-item mt-1 text-[0.9375rem] italic text-muted" style={at(2)}>
          {entry.scientificName} · {entry.family}
        </p>
        <ul role="list" className="chips reveal-item mt-3.5" style={at(3)}>
          <li className="chip chip--rarity" data-rarity={entry.rarity}>
            {rarityLabel(entry.rarity)}
          </li>
          {number ? <li className="chip">{number}</li> : null}
          {album ? <li className="chip">{album.name}</li> : null}
          {duplicate ? <li className="chip">Doppione</li> : null}
        </ul>
        <p className="reveal-item mt-3 text-[0.875rem] text-muted" style={at(4)}>
          Trovata il {formatFoundDate(data.card.foundAt)}</p>
        {duplicate ? (
          <p className="reveal-item mt-2 text-[0.875rem] text-muted" style={at(4)}>
            Ne avevi già {data.copies - 1 === 1 ? 'una' : data.copies - 1}: questa va tra i doppioni, da regalare.
          </p>
        ) : null}
        <p className="reveal-item mt-3 text-[0.96875rem] leading-normal" style={at(5)}>{entry.description}</p>

        <div className="reveal-item mt-6 grid gap-2.5" style={at(6)}>
          <Link href="/album" state={IN_APP} className="btn press">
            Metti nell&apos;album
          </Link>
          <Link href="/" className="btn btn--ghost press">
            Scatta un&apos;altra foto
          </Link>
        </div>

        <h2 className="reveal-item mt-9 text-[1.375rem] leading-tight">Scheda</h2>
        <Facts entry={entry} />
        {entry.funFact ? <p className="reveal-item mt-5 leading-normal">{entry.funFact}</p> : null}
        <SafetyNotes entry={entry} />
        {entry.textStatus !== 'verificato' ? (
          <p className="reveal-item mt-5 text-[0.8125rem] text-muted">Testi della scheda ancora da verificare.</p>
        ) : null}
      </section>
    </main>
  )
}
