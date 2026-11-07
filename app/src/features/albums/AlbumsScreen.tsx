import { albums, totalSpecies } from '../../domain/catalog'
import { Page, ScreenHeader } from '../../ui/Page'

export function AlbumsScreen() {
  return (
    <Page>
      <ScreenHeader title="Album">
        <p className="mt-2 text-muted">
          0 carte su {totalSpecies}, in {albums.length} album
        </p>
      </ScreenHeader>
      <ol role="list" className="mt-6 grid gap-3" aria-label="I tuoi album">
        {albums.map((album) => (
          <li key={album.id} className="card">
            <h2 className="text-[1.25rem] leading-tight">{album.name}</h2>
            <p className="mt-1 text-[0.875rem] leading-snug text-muted">{album.description}</p>
            <div className="mt-3 flex items-center gap-3">
              {/* The bar fills from the collection in phase 5. */}
              <span className="track flex-1" aria-hidden="true">
                <i style={{ width: '0%' }} />
              </span>
              <span className="shrink-0 text-[0.875rem] font-semibold text-muted tabular-nums">
                0 di {album.speciesCount}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </Page>
  )
}
