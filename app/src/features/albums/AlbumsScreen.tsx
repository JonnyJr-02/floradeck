import { Link } from 'wouter'
import { useCards } from '../../db/collection'
import { duplicateCount, missingInSeason, shortMonths } from '../../domain/album'
import { albumById, albums, species, speciesById, totalSpecies } from '../../domain/catalog'
import { foundPerAlbum } from '../../domain/collection'
import { plateUrl } from '../../domain/plates'
import { IN_APP, Page, ScreenHeader } from '../../ui/Page'

const albumOf = (speciesId: string) => speciesById(speciesId)?.albumId
const albumOrder = (albumId: string) => albumById(albumId)?.order ?? 0
const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const legendary = species.find((entry) => entry.rarity === 'legendary')

/** "In fiore questo mese": missing species that flower (or fruit) now, so you know what to look for. */
function InSeason({ owned }: { owned: Parameters<typeof missingInSeason>[0] }) {
  const month = new Date().getMonth() + 1
  const list = missingInSeason(owned, month, species, albumOrder)
  if (list.length === 0) return null
  return (
    <section className="mt-7" aria-labelledby="season-title">
      <h2 id="season-title" className="text-[1.375rem] leading-tight">
        Di stagione a {MONTH_NAMES[month - 1]}
      </h2>
      <p className="mt-1 text-[0.875rem] text-muted">
        {list.length === 1 ? 'Una specie da trovare è' : `${list.length} specie da trovare sono`} in fiore o con i
        frutti adesso.
      </p>
      <ul role="list" className="season-strip mt-3">
        {list.map((entry) => {
          const url = plateUrl(entry.id)
          return (
            <li key={entry.id}>
              <Link href={`/specie/${entry.id}`} state={IN_APP} className="season-strip__item press">
                <span className="season-strip__img">{url ? <img src={url} alt="" loading="lazy" /> : null}</span>
                <span className="season-strip__name">{entry.commonNameIt}</span>
                <span className="season-strip__meta">{shortMonths(entry.bloomMonths)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function LegendaryTeaser({ allComplete, found }: { allComplete: boolean; found: string | undefined }) {
  if (!legendary) return null
  if (found) {
    return (
      <Link href={`/carta/${found}`} state={IN_APP} className="card legendary-teaser press mt-3 block">
        <span className="pill">Leggendaria</span>
        <h2 className="mt-2 text-[1.25rem] leading-tight">{legendary.commonNameIt}</h2>
        <p className="mt-1 text-[0.875rem] text-muted">L&apos;hai trovata. Apri la carta e inclina il telefono.</p>
      </Link>
    )
  }
  return (
    <section className="card legendary-teaser mt-3" aria-labelledby="legendary-title">
      <span className="pill">Leggendaria</span>
      <h2 id="legendary-title" className="mt-2 text-[1.25rem] leading-tight">
        Una carta segreta
      </h2>
      <p className="mt-1 text-[0.875rem] leading-snug text-muted">
        {allComplete
          ? `Ecco l'indizio: ${legendary.habitat.toLowerCase()}, ${shortMonths(legendary.bloomMonths)}.`
          : 'Non sta in nessun album. Completali tutti per avere un indizio su dove cercarla.'}
      </p>
    </section>
  )
}

export function AlbumsScreen() {
  const cards = useCards()
  const owned = cards ?? []
  const found = foundPerAlbum(owned, albumOf)
  const total = [...found.values()].reduce((sum, count) => sum + count, 0)
  const duplicates = duplicateCount(owned.filter((card) => speciesById(card.speciesId)))
  const allComplete = albums.every((album) => (found.get(album.id) ?? 0) === album.speciesCount)
  const legendaryCard = owned.find((card) => card.speciesId === legendary?.id)?.id

  return (
    <Page>
      <ScreenHeader title="Album">
        <p className="mt-2 text-muted">
          {total === 1 ? '1 specie trovata' : `${total} specie trovate`} su {totalSpecies}, in {albums.length} album
          {duplicates > 0 ? ` · ${duplicates} ${duplicates === 1 ? 'doppione' : 'doppioni'}` : ''}
        </p>
      </ScreenHeader>
      <ol role="list" className="mt-6 grid gap-3" aria-label="I tuoi album">
        {albums.map((album) => {
          const count = found.get(album.id) ?? 0
          const complete = count === album.speciesCount
          return (
            <li key={album.id}>
              <Link href={`/album/${album.id}`} state={IN_APP} className="card album-row press block">
                <span className="flex items-start justify-between gap-3">
                  <h2 className="text-[1.25rem] leading-tight">{album.name}</h2>
                  {complete ? <span className="pill shrink-0">Completo</span> : null}
                </span>
                <span className="mt-1 block text-[0.875rem] leading-snug text-muted">{album.description}</span>
                <span className="mt-3 flex items-center gap-3">
                  <span className="track flex-1" aria-hidden="true">
                    <i style={{ width: `${(count / album.speciesCount) * 100}%` }} />
                  </span>
                  <span className="shrink-0 text-[0.875rem] font-semibold text-muted tabular-nums">
                    {count} di {album.speciesCount}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      <LegendaryTeaser allComplete={allComplete} found={legendaryCard} />
      <InSeason owned={owned} />
    </Page>
  )
}
