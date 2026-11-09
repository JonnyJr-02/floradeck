import { useMemo, useState, type CSSProperties } from 'react'
import { Link, Redirect, useLocation, useParams } from 'wouter'
import { useCards, useCovers, usePhotos } from '../../db/collection'
import { usePartner, useProfile } from '../../db/couple'
import type { CardRecord, PhotoRecord } from '../../db/db'
import { albumSlots, type Slot } from '../../domain/album'
import { albumById } from '../../domain/catalog'
import { ownerOf, type Owner } from '../../domain/couple'
import { plateUrl } from '../../domain/plates'
import { IconBack, IconLock } from '../../ui/icons'
import { IN_APP } from '../../ui/Page'
import { PhotoThumb } from '../../ui/PhotoThumb'
import { coupleColours } from './colours'

type Filter = 'all' | 'me' | 'partner' | 'none'

const pad = (n: number) => String(n).padStart(2, '0')

function status(owner: Owner, partnerName: string): string {
  switch (owner) {
    case 'both':
      return 'Tutti e due'
    case 'me':
      return 'Solo tu'
    case 'partner':
      return `Solo ${partnerName}`
    default:
      return 'Da trovare'
  }
}

function Tile({
  slot,
  owner,
  photos,
  partnerName,
  myColour,
  partnerColour,
  legendary,
}: {
  slot: Slot<CardRecord>
  owner: Owner
  photos: Map<string, PhotoRecord>
  partnerName: string
  myColour: string
  partnerColour: string
  legendary: boolean
}) {
  const { species: entry, cover } = slot
  const plate = plateUrl(entry.id)
  const mine = owner === 'me' || owner === 'both'
  const theirs = owner === 'partner' || owner === 'both'
  return (
    <li>
      <Link
        href={cover ? `/carta/${cover.id}` : `/specie/${entry.id}`}
        state={IN_APP}
        className="tile press"
        data-found={owner !== 'none' || undefined}
        data-owner={owner}
      >
        <span className="tile__img">
          {cover ? (
            <PhotoThumb photo={cover.photoId ? photos.get(cover.photoId) : undefined} alt="" />
          ) : plate ? (
            <img className="tile__plate" src={plate} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="tile__blank">{pad(slot.number)}</span>
          )}
          {cover || plate ? <span className="tile__num">{pad(slot.number)}</span> : null}
          {owner === 'none' ? (
            <span className="lock" aria-hidden="true">
              <IconLock />
            </span>
          ) : (
            <span className="owners" aria-hidden="true">
              {mine ? <i className="who-dot" style={{ '--who': myColour } as CSSProperties} /> : null}
              {theirs ? <i className="who-dot" style={{ '--who': partnerColour } as CSSProperties} /> : null}
            </span>
          )}
        </span>
        <span className="tile__name">{entry.commonNameIt}</span>
        <span className="tile__status">
          {legendary ? 'Leggendaria · ' : ''}
          {status(owner, partnerName)}
        </span>
      </Link>
    </li>
  )
}

/** The couple album: one album seen through both collections, read-only (CLAUDE.md, Gifts and couple). */
export function CoupleAlbumScreen() {
  const { id = '' } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const album = albumById(id)
  const cards = useCards()
  const covers = useCovers()
  const partner = usePartner()
  const profile = useProfile()
  const [filter, setFilter] = useState<Filter>('all')

  const slots = useMemo(
    () => (album && cards ? albumSlots(album.id, cards, covers, new Date().getMonth() + 1) : []),
    [album, cards, covers],
  )
  const photos = usePhotos(slots.flatMap((slot) => (slot.cover?.photoId ? [slot.cover.photoId] : [])))
  const mine = useMemo(() => new Set(slots.filter((slot) => slot.cover).map((slot) => slot.species.id)), [slots])
  const theirs = useMemo(() => new Set(partner?.found ?? []), [partner])

  if (!album || partner === undefined) return <Redirect to="/coppia" replace />
  if (partner === null) return <main className="page" aria-busy="true" />

  const partnerName = partner.name || 'l’altro'
  const { me: myColour, partner: partnerColour } = coupleColours(profile?.colour, partner.colour)
  const owners = slots.map((slot) => ownerOf(slot.species.id, mine, theirs))
  const together = owners.filter((owner) => owner !== 'none').length
  const visible = slots
    .map((slot, i) => ({ slot, owner: owners[i]! }))
    .filter(({ owner }) => filter === 'all' || owner === filter)

  const filters: ReadonlyArray<{ value: Filter; label: string }> = [
    { value: 'all', label: 'Tutte' },
    { value: 'me', label: 'Solo tu' },
    { value: 'partner', label: `Solo ${partnerName}` },
    { value: 'none', label: 'Da trovare' },
  ]

  const back = () => {
    const state = window.history.state as { inApp?: boolean } | null
    if (state?.inApp) window.history.back()
    else navigate('/coppia', { replace: true })
  }

  return (
    <main className="page">
      <header className="flex items-start gap-3">
        <button type="button" className="round-btn press" onClick={back} aria-label="Indietro">
          <IconBack />
        </button>
        <div className="min-w-0 pt-1">
          <h1 className="text-[1.875rem] leading-[1.05]">{album.name}</h1>
          <p className="mt-1 text-[0.875rem] text-muted">Album di coppia · tu e {partner.name || 'l’altro telefono'}</p>
        </div>
      </header>
      <div className="album-progress mt-4">
        <b className="tabular-nums">
          {together} di {album.speciesCount}
        </b>
        <span className="track" aria-hidden="true">
          <i style={{ width: `${(together / album.speciesCount) * 100}%` }} />
        </span>
        <span>{together === album.speciesCount ? 'Completo!' : `${album.speciesCount - together} da trovare`}</span>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <i className="who-dot" style={{ '--who': myColour } as CSSProperties} aria-hidden="true" />
          tu
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="who-dot" style={{ '--who': partnerColour } as CSSProperties} aria-hidden="true" />
          {partnerName}
        </span>
        <span>Le foto sono le tue: i progressi dell’altro telefono non portano foto.</span>
      </p>

      <div className="filters mt-4" role="group" aria-label="Mostra">
        {filters.map((option) => (
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

      {visible.length > 0 ? (
        <ol role="list" className="tiles mt-4" aria-label={`Album di coppia: ${album.name}`}>
          {visible.map(({ slot, owner }) => (
            <Tile
              key={slot.species.id}
              slot={slot}
              owner={owner}
              photos={photos}
              partnerName={partnerName}
              myColour={myColour}
              partnerColour={partnerColour}
              legendary={slot.species.id === album.legendarySpeciesId}
            />
          ))}
        </ol>
      ) : (
        <p className="mt-8 text-center text-muted">Nessuna carta qui.</p>
      )}
    </main>
  )
}
