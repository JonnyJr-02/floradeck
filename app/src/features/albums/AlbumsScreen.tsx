import { useCards } from '../../db/collection'
import { albums, speciesById, totalSpecies } from '../../domain/catalog'
import { foundPerAlbum } from '../../domain/collection'
import { Page, ScreenHeader } from '../../ui/Page'

const albumOf = (speciesId: string) => speciesById(speciesId)?.albumId

export function AlbumsScreen() {
  const cards = useCards()
  const found = foundPerAlbum(cards ?? [], albumOf)
  const total = [...found.values()].reduce((sum, count) => sum + count, 0)

  return (
    <Page>
      <ScreenHeader title="Album">
        <p className="mt-2 text-muted">
          {total === 1 ? '1 specie trovata' : `${total} specie trovate`} su {totalSpecies}, in {albums.length} album
        </p>
      </ScreenHeader>
      <ol role="list" className="mt-6 grid gap-3" aria-label="I tuoi album">
        {albums.map((album) => {
          const count = found.get(album.id) ?? 0
          return (
            <li key={album.id} className="card">
              <h2 className="text-[1.25rem] leading-tight">{album.name}</h2>
              <p className="mt-1 text-[0.875rem] leading-snug text-muted">{album.description}</p>
              <div className="mt-3 flex items-center gap-3">
                {/* Opening an album, with its slots, arrives in phase 5. */}
                <span className="track flex-1" aria-hidden="true">
                  <i style={{ width: `${(count / album.speciesCount) * 100}%` }} />
                </span>
                <span className="shrink-0 text-[0.875rem] font-semibold text-muted tabular-nums">
                  {count} di {album.speciesCount}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </Page>
  )
}
