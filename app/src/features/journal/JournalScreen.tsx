import { Link } from 'wouter'
import { usePhotos, useCards } from '../../db/collection'
import type { CardRecord, PhotoRecord, SightingRecord } from '../../db/db'
import { sightingName, useSightings } from '../../db/sightings'
import { albumById, speciesById } from '../../domain/catalog'
import { diaryGroups } from '../../domain/journal'
import { EmptyState, IN_APP, Page, ScreenHeader } from '../../ui/Page'
import { PhotoThumb } from '../../ui/PhotoThumb'

const day = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' })

function CardEntry({ card, firstOfSpecies, photo }: { card: CardRecord; firstOfSpecies: boolean; photo: PhotoRecord | undefined }) {
  const entry = speciesById(card.speciesId)
  const album = albumById(entry?.albumId)
  return (
    <li>
      <Link href={`/carta/${card.id}`} state={IN_APP} className="journal-row press">
        <span className="journal-row__img">
          <PhotoThumb photo={photo} alt="" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium leading-tight">
            {entry?.commonNameIt ?? 'Specie non più nel catalogo'}
          </span>
          <span className="mt-0.5 block truncate text-[0.8125rem] text-muted">
            {day.format(new Date(card.foundAt))}
            {card.source === 'gift' && card.giftFrom ? ` · da ${card.giftFrom}` : album ? ` · ${album.name}` : ''}
          </span>
        </span>
        <span className="shrink-0 text-[0.75rem] font-semibold text-muted">
          {entry ? (card.source === 'gift' ? 'Regalo' : firstOfSpecies ? 'Nuova' : 'Doppione') : ''}
        </span>
      </Link>
    </li>
  )
}

function SightingEntry({ sighting, photo }: { sighting: SightingRecord; photo: PhotoRecord | undefined }) {
  return (
    <li>
      <Link href={`/avvistamento/${sighting.id}`} state={IN_APP} className="journal-row press">
        <span className="journal-row__img">
          <PhotoThumb photo={photo} alt="" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium leading-tight">{sightingName(sighting)}</span>
          <span className="mt-0.5 block truncate text-[0.8125rem] text-muted">
            {day.format(new Date(sighting.foundAt))} · <i>{sighting.scientific}</i>
          </span>
        </span>
        <span className="shrink-0 text-[0.75rem] font-semibold text-muted">Fuori album</span>
      </Link>
    </li>
  )
}

/** The diary: every card and every plant outside the albums the user named, by month. */
export function JournalScreen() {
  const cards = useCards()
  const sightings = useSightings()
  const photos = usePhotos([
    ...(cards ?? []).flatMap((card) => (card.photoId ? [card.photoId] : [])),
    ...(sightings ?? []).flatMap((sighting) => (sighting.photoId ? [sighting.photoId] : [])),
  ])

  if (cards === undefined || sightings === undefined) {
    return (
      <Page>
        <ScreenHeader title="Diario" />
      </Page>
    )
  }
  if (cards.length === 0 && sightings.length === 0) {
    return (
      <Page>
        <ScreenHeader title="Diario" />
        <EmptyState
          title="Il diario è ancora vuoto"
          action={
            <Link href="/" className="btn press">
              Inizia a esplorare
            </Link>
          }
        >
          <p>Ogni carta che trovi finisce qui, con il giorno dello scatto, e anche le piante fuori album di cui cerchi il nome.</p>
        </EmptyState>
      </Page>
    )
  }

  // A gift goes in the diary on the day it arrived, not the day the other player found it.
  const groups = diaryGroups(
    cards.map((card) => (card.source === 'gift' && card.receivedAt ? { ...card, foundAt: card.receivedAt } : card)),
    sightings,
  )
  const summary = [
    cards.length === 1 ? 'una carta' : cards.length > 1 ? `${cards.length} carte` : '',
    sightings.length === 1 ? 'una pianta fuori album' : sightings.length > 1 ? `${sightings.length} piante fuori album` : '',
  ]
    .filter(Boolean)
    .join(' e ')
  return (
    <Page>
      <ScreenHeader title="Diario">
        <p className="mt-2 text-muted">
          {summary.charAt(0).toUpperCase() + summary.slice(1)}, dalla più recente.
        </p>
      </ScreenHeader>
      {groups.map((group) => (
        <section key={group.key} className="mt-7" aria-labelledby={`month-${group.key}`}>
          <h2 id={`month-${group.key}`} className="text-[1.25rem] leading-tight">
            {group.label}
          </h2>
          <ol role="list" className="mt-3 grid gap-2">
            {group.items.map((item) =>
              item.kind === 'card' ? (
                <CardEntry
                  key={item.card.id}
                  card={item.card}
                  firstOfSpecies={item.firstOfSpecies}
                  photo={item.card.photoId ? photos.get(item.card.photoId) : undefined}
                />
              ) : (
                <SightingEntry
                  key={item.sighting.id}
                  sighting={item.sighting}
                  photo={item.sighting.photoId ? photos.get(item.sighting.photoId) : undefined}
                />
              ),
            )}
          </ol>
        </section>
      ))}
    </Page>
  )
}
