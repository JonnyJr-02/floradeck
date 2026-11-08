import { Link, Redirect, useLocation, useParams } from 'wouter'
import { useCovers, useSpeciesCards } from '../../db/collection'
import { speciesById } from '../../domain/catalog'
import { plateUrl } from '../../domain/plates'
import { shortMonths } from '../../domain/album'
import { IconClose } from '../../ui/icons'
import { IN_APP } from '../../ui/Page'
import { closeDetail } from './CardScreen'
import { at, SpeciesSheet, SpeciesTitle } from './SpeciesSheet'

/** A species not found yet: its botanical plate, what to look for, and the sheet. */
export function SpeciesScreen() {
  const { id = '' } = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const entry = speciesById(id)
  const cards = useSpeciesCards(id)
  const covers = useCovers()

  if (!entry) return <Redirect to="/album" replace />
  if (cards === undefined) return <main className="min-h-dvh bg-paper" aria-busy="true" />
  const cover = cards.find((card) => card.id === covers.get(id)) ?? cards[0]
  if (cover) return <Redirect to={`/carta/${cover.id}`} replace state={IN_APP} />

  const url = plateUrl(entry.id)
  const verb = entry.phenology === 'fruiting' ? 'Frutti' : 'In fiore'
  return (
    <main className="card-view" data-rarity={entry.rarity}>
      <div className="card-view__hero card-view__hero--plate" data-rarity={entry.rarity}>
        {url ? (
          <img src={url} alt={`Tavola botanica: ${entry.commonNameIt}`} />
        ) : (
          <div className="grid h-full place-items-center px-8 text-center text-muted">
            Tavola botanica non ancora disponibile
          </div>
        )}
        <button
          type="button"
          className="round-btn press card-view__close"
          onClick={() => closeDetail(navigate)}
          aria-label="Chiudi"
        >
          <IconClose />
        </button>
      </div>

      <section className="card-view__body">
        <p className="text-[0.875rem] font-semibold text-accent">Da trovare</p>
        <SpeciesTitle entry={entry} />
        <p className="mt-3 text-[0.875rem] text-muted" style={at(4)}>
          {verb}: {shortMonths(entry.bloomMonths)} · {entry.habitat}
        </p>
        <p className="mt-3 text-[0.96875rem] leading-normal">{entry.description}</p>
        <div className="mt-6">
          <Link href="/" className="btn press">
            Vai a cercarla
          </Link>
        </div>
        <SpeciesSheet entry={entry} showPlate={false} />
      </section>
    </main>
  )
}
