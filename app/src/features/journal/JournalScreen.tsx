import { Link } from 'wouter'
import { usePhotos, useCards } from '../../db/collection'
import type { CardRecord } from '../../db/db'
import { albumById, speciesById } from '../../domain/catalog'
import { journalGroups } from '../../domain/journal'
import { EmptyState, IN_APP, Page, ScreenHeader } from '../../ui/Page'
import { PhotoThumb } from '../../ui/PhotoThumb'

const day = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' })

function Entry({ card, firstOfSpecies, photo }: { card: CardRecord; firstOfSpecies: boolean; photo: Parameters<typeof PhotoThumb>[0]['photo'] }) {
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
            {album ? ` · ${album.name}` : ''}
          </span>
        </span>
        <span className="shrink-0 text-[0.75rem] font-semibold text-muted">
          {entry ? (firstOfSpecies ? 'Nuova' : 'Doppione') : ''}
        </span>
      </Link>
    </li>
  )
}

export function JournalScreen() {
  const cards = useCards()
  const photos = usePhotos((cards ?? []).flatMap((card) => (card.photoId ? [card.photoId] : [])))

  if (cards === undefined) return <Page><ScreenHeader title="Diario" /></Page>
  if (cards.length === 0) {
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
          <p>Ogni carta che trovi finisce qui, con il giorno dello scatto.</p>
        </EmptyState>
      </Page>
    )
  }

  const groups = journalGroups(cards)
  return (
    <Page>
      <ScreenHeader title="Diario">
        <p className="mt-2 text-muted">
          {cards.length === 1 ? 'Una scoperta' : `${cards.length} scoperte`}, dalla più recente.
        </p>
      </ScreenHeader>
      {groups.map((group) => (
        <section key={group.key} className="mt-7" aria-labelledby={`month-${group.key}`}>
          <h2 id={`month-${group.key}`} className="text-[1.25rem] leading-tight">
            {group.label}
          </h2>
          <ol role="list" className="mt-3 grid gap-2">
            {group.cards.map(({ card, firstOfSpecies }) => (
              <Entry
                key={card.id}
                card={card}
                firstOfSpecies={firstOfSpecies}
                photo={card.photoId ? photos.get(card.photoId) : undefined}
              />
            ))}
          </ol>
        </section>
      ))}
    </Page>
  )
}
