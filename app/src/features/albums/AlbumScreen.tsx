import { useEffect, useMemo, useState } from 'react'
import { Link, Redirect, useLocation, useParams } from 'wouter'
import { useCards, useCovers, usePhotos } from '../../db/collection'
import type { CardRecord, PhotoRecord } from '../../db/db'
import {
  albumSlots,
  COLOR_SWATCHES,
  filterSlots,
  shortMonths,
  type Slot,
  type SlotFilter,
} from '../../domain/album'
import { albumById } from '../../domain/catalog'
import { plateUrl } from '../../domain/plates'
import { IconBack } from '../../ui/icons'
import { IN_APP } from '../../ui/Page'
import { PhotoThumb } from '../../ui/PhotoThumb'
import { Petals } from './Petals'

const FILTERS: ReadonlyArray<{ value: SlotFilter; label: string }> = [
  { value: 'all', label: 'Tutte' },
  { value: 'found', label: 'Trovate' },
  { value: 'missing', label: 'Da trovare' },
  { value: 'season', label: 'Di stagione' },
]

const pad = (n: number | null) => String(n ?? 0).padStart(2, '0')

/** The species just added ("Metti nell'album"): its slot fills once, then the state is cleared. */
function useFillOnce(): string | null {
  const [fill] = useState(() => {
    const state = window.history.state as { fill?: string } | null
    return typeof state?.fill === 'string' ? state.fill : null
  })
  useEffect(() => {
    if (!fill) return
    const state = (window.history.state ?? {}) as Record<string, unknown>
    window.history.replaceState({ ...state, fill: null }, '')
  }, [fill])
  return fill
}

function Hint({ slot }: { slot: Slot<CardRecord> }) {
  const { species: entry } = slot
  return (
    <span className="tile__hint">
      <span>
        {entry.dominantColors.map((colour) => (
          <i key={colour} className="dot" style={{ background: COLOR_SWATCHES[colour] }} />
        ))}
        {entry.dominantColors.join(' o ')}
      </span>
      <span>{shortMonths(entry.bloomMonths)}</span>
    </span>
  )
}

function SlotImage({ slot, photos }: { slot: Slot<CardRecord>; photos: Map<string, PhotoRecord> }) {
  const { species: entry, cover } = slot
  if (cover) return <PhotoThumb photo={cover.photoId ? photos.get(cover.photoId) : undefined} alt="" />
  const url = plateUrl(entry.id)
  return url ? (
    <img className="tile__plate" src={url} alt="" loading="lazy" decoding="async" />
  ) : (
    <span className="tile__blank">{pad(entry.number)}</span>
  )
}

function Tile({
  slot,
  photos,
  filling,
}: {
  slot: Slot<CardRecord>
  photos: Map<string, PhotoRecord>
  filling: boolean
}) {
  const { species: entry, cover, cards } = slot
  const href = cover ? `/carta/${cover.id}` : `/specie/${entry.id}`
  const extra = cards.length > 1 ? `, ${cards.length - 1} ${cards.length === 2 ? 'doppione' : 'doppioni'}` : ''
  return (
    <li>
      <Link
        href={href}
        state={IN_APP}
        className="tile press"
        data-found={cover ? true : undefined}
        data-filling={filling || undefined}
      >
        <span className="tile__img">
          <SlotImage slot={slot} photos={photos} />
          {cover || plateUrl(entry.id) ? <span className="tile__num">{pad(entry.number)}</span> : null}
          {cards.length > 1 ? (
            <span className="tile__dup" aria-hidden="true">
              +{cards.length - 1}
            </span>
          ) : null}
        </span>
        <span className="tile__name">
          {entry.commonNameIt}
          <span className="sr-only">{cover ? `trovata${extra}` : 'da trovare'}</span>
        </span>
        {cover ? null : <Hint slot={slot} />}
      </Link>
    </li>
  )
}

function RareSlot({ slot, photos, filling }: { slot: Slot<CardRecord>; photos: Map<string, PhotoRecord>; filling: boolean }) {
  const { species: entry, cover } = slot
  return (
    <Link
      href={cover ? `/carta/${cover.id}` : `/specie/${entry.id}`}
      state={IN_APP}
      className="rare-slot press"
      data-found={cover ? true : undefined}
      data-filling={filling || undefined}
    >
      <span className="rare-slot__img">
        <SlotImage slot={slot} photos={photos} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[1.125rem] leading-tight">
          {entry.commonNameIt}
          <span className="sr-only">specie rara dell&apos;album, {cover ? 'trovata' : 'da trovare'}</span>
        </span>
        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">
          {cover ? 'Trovata!' : `${entry.dominantColors.join(' o ')} · ${shortMonths(entry.bloomMonths)}`}
        </span>
      </span>
      <span className="pill">Rara</span>
    </Link>
  )
}

export function AlbumScreen() {
  const { id = '' } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const album = albumById(id)
  const cards = useCards()
  const covers = useCovers()
  const fill = useFillOnce()
  const [filter, setFilter] = useState<SlotFilter>('all')
  const month = new Date().getMonth() + 1

  const slots = useMemo(
    () => (album && cards ? albumSlots(album.id, cards, covers, month) : []),
    [album, cards, covers, month],
  )
  const photoIds = slots.flatMap((slot) => (slot.cover?.photoId ? [slot.cover.photoId] : []))
  const photos = usePhotos(photoIds)

  const found = slots.filter((slot) => slot.cover).length
  const complete = album !== undefined && found === album.speciesCount
  const filledSlot = fill ? slots.find((slot) => slot.species.id === fill) : undefined
  // The celebration plays when the card just added was the last one missing.
  const celebrate = complete && filledSlot !== undefined && filledSlot.cards.length === 1

  useEffect(() => {
    if (!filledSlot) return
    document.querySelector('[data-filling]')?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [filledSlot])

  if (!album) return <Redirect to="/album" replace />

  const rare = slots.find((slot) => slot.species.id === album.rareSpeciesId)
  const visible = filterSlots(slots, filter)
  const grid = visible.filter((slot) => slot !== rare)
  const showRare = rare !== undefined && visible.includes(rare)

  const back = () => {
    const state = window.history.state as { inApp?: boolean } | null
    if (state?.inApp) window.history.back()
    else navigate('/album', { replace: true })
  }

  return (
    <main className="page">
      <header className="flex items-start gap-3">
        <button type="button" className="round-btn press" onClick={back} aria-label="Indietro">
          <IconBack />
        </button>
        <div className="min-w-0 pt-1">
          <h1 className="text-[1.875rem] leading-[1.05]">{album.name}</h1>
        </div>
      </header>
      <div className="album-progress mt-4">
        <b className="tabular-nums">
          {found} di {album.speciesCount}
        </b>
        <span className="track" aria-hidden="true">
          <i style={{ width: `${(found / album.speciesCount) * 100}%` }} />
        </span>
        <span>{complete ? 'Completo!' : `${album.speciesCount - found} da trovare`}</span>
      </div>

      {complete ? (
        <p className="album-done mt-4" role={celebrate ? 'status' : undefined}>
          Album completato: hai trovato tutte le {album.speciesCount} specie.
        </p>
      ) : null}
      {celebrate ? <Petals /> : null}

      <div className="filters mt-4" role="group" aria-label="Mostra">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="chip chip--toggle press"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {showRare && rare ? <RareSlot slot={rare} photos={photos} filling={rare.species.id === fill} /> : null}

      {grid.length > 0 ? (
        <ol role="list" className="tiles mt-4" aria-label={`Carte di ${album.name}`}>
          {grid.map((slot) => (
            <Tile key={slot.species.id} slot={slot} photos={photos} filling={slot.species.id === fill} />
          ))}
        </ol>
      ) : (
        <p className="mt-8 text-center text-muted">
          {filter === 'found'
            ? 'Nessuna carta ancora: inizia da Esplora.'
            : filter === 'missing'
              ? 'Le hai trovate tutte!'
              : 'Nessuna specie di questo album è di stagione questo mese.'}
        </p>
      )}
    </main>
  )
}
