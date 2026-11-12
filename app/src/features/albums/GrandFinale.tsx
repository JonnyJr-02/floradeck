import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useCards, useCovers, usePhotos } from '../../db/collection'
import { albums, speciesById, totalSpecies } from '../../domain/catalog'
import { speciesFound } from '../../domain/collection'
import { plateUrl } from '../../domain/plates'
import { PhotoThumb } from '../../ui/PhotoThumb'
import { GOLD_COLOURS, Petals } from './Petals'

const SEEN_KEY = 'floradeck:grand-finale'
const FINALE_COLOURS = [...GOLD_COLOURS, '#c8322a', '#e7a3b8', '#3d5fb8']

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === 'seen'
  } catch {
    return true
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, 'seen')
  } catch {
    // Private mode: the finale may come back once more, harmless.
  }
}

/** Every catalogue species found: every album complete. */
export function useAllComplete(): boolean {
  const cards = useCards()
  return cards !== undefined && speciesFound(cards, speciesById) === totalSpecies
}

/**
 * The finale shows once, the first time every album is complete and `ready` says the moment has
 * come (the last slot filled, or the album list opened afterwards).
 */
export function useGrandFinale(ready: boolean): { show: boolean; close: () => void } {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!ready || seen()) return
    markSeen()
    setShow(true)
  }, [ready])
  return { show, close: () => setShow(false) }
}

/** Fan positions of the six legendary cards, centre out (x, y in rem; rotation in degrees). */
function fan(i: number, count: number): CSSProperties {
  const offset = i - (count - 1) / 2
  return {
    ['--i' as string]: i,
    ['--x' as string]: `${offset * 2.5}rem`,
    ['--y' as string]: `${Math.abs(offset) * 0.7}rem`,
    ['--r' as string]: `${offset * 9}deg`,
  }
}

/**
 * «Tutti gli album completati» (user's request on 2026-11-12): full screen, once. The six
 * legendary cards (the player's own photos) fan out, a sweep of light, gold and petals.
 */
export function GrandFinale({ onClose }: { onClose: () => void }) {
  const cards = useCards()
  const covers = useCovers()
  const legendary = albums.map((album) => album.legendarySpeciesId)
  const coverCards = legendary.map((speciesId) => {
    const own = (cards ?? []).filter((card) => card.speciesId === speciesId)
    return own.find((card) => card.id === covers.get(speciesId)) ?? own[0]
  })
  const photos = usePhotos(coverCards.flatMap((card) => (card?.photoId ? [card.photoId] : [])))
  const [petals, setPetals] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // A modal moment: the app behind is inert, focus on the button, Escape closes; petals after the fan.
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) root.inert = true
    const focus = setTimeout(() => button.current?.focus({ preventScroll: true }), 50)
    const timer = setTimeout(() => setPetals(true), 1300)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      if (root) root.inert = false
      clearTimeout(focus)
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return createPortal(
    <div ref={panel} className="finale" role="dialog" aria-modal="true" aria-labelledby="finale-title" tabIndex={-1}>
      {petals ? <Petals colours={FINALE_COLOURS} /> : null}
      <div className="finale__fan" aria-hidden="true">
        {legendary.map((speciesId, i) => {
          const card = coverCards[i]
          const photo = card?.photoId ? photos.get(card.photoId) : undefined
          const plate = plateUrl(speciesId)
          return (
            <span key={speciesId} className="finale__card" style={fan(i, legendary.length)}>
              {photo ? <PhotoThumb photo={photo} alt="" /> : plate ? <img src={plate} alt="" data-plate="" /> : null}
            </span>
          )
        })}
        <span className="finale__sweep" />
      </div>
      <div className="finale__words grid justify-items-center gap-3">
        <p className="text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[var(--gold-1)]" style={{ ['--i' as string]: 0 }}>
          {totalSpecies} specie su {totalSpecies}
        </p>
        <h2 id="finale-title" className="finale__title" style={{ ['--i' as string]: 1 }}>
          Tutti gli album completati!
        </h2>
        <p className="max-w-[22rem] text-[0.9375rem] leading-snug text-[#c9ccd6]" style={{ ['--i' as string]: 2 }}>
          Ogni fiore, ogni bacca, tutte e sei le leggendarie. Un erbario intero, fatto passeggiando.
        </p>
        <button
          ref={button}
          type="button"
          className="btn btn--gift press mt-3 w-auto px-8"
          style={{ ['--i' as string]: 3 }}
          onClick={onClose}
        >
          Che meraviglia
        </button>
      </div>
    </div>,
    document.body,
  )
}
