import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useCards, useCovers, usePhotos } from '../../db/collection'
import type { CardRecord } from '../../db/db'
import { albums, inAlbum, speciesById, totalSpecies, type Album } from '../../domain/catalog'
import { foundPerAlbum, speciesFound } from '../../domain/collection'
import { PhotoThumb } from '../../ui/PhotoThumb'
import { GrandFinale } from './GrandFinale'
import { Petals } from './Petals'

/**
 * Full-screen celebrations (user's request on 2026-11-16): one for each album completed, in that
 * album's colour, and after the last album the grand finale. Each shows once: the albums already
 * celebrated and the finale are remembered on the phone (cleared by «Azzera tutti i progressi»).
 * Whichever album screen is open when an album becomes complete plays it, so an album completed by
 * a gift is celebrated too.
 */

export const CELEBRATED_KEY = 'floradeck:albums-celebrated'
export const FINALE_KEY = 'floradeck:grand-finale'

function readCelebrated(): Set<string> {
  try {
    const value = JSON.parse(localStorage.getItem(CELEBRATED_KEY) ?? '[]') as unknown
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function remember(albumIds: readonly string[], finale: boolean) {
  try {
    localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...new Set([...readCelebrated(), ...albumIds])]))
    if (finale) localStorage.setItem(FINALE_KEY, 'seen')
  } catch {
    // Private mode: a celebration may come back once more, harmless.
  }
}

function finaleSeen(): boolean {
  try {
    return localStorage.getItem(FINALE_KEY) === 'seen'
  } catch {
    return true
  }
}

/** The album's own colour for its celebration, with words that read on it. */
const PALETTES: Record<string, { bg: string; ink: string; petals: string[] }> = {
  bianchi: { bg: '#f4f1ea', ink: '#1d1a15', petals: ['#ffffff', '#f3dc8f', '#e8e1d3', '#c9a24a'] },
  gialli: { bg: '#e9c43c', ink: '#2a1f0a', petals: ['#fff4cf', '#f3dc8f', '#e68a2e', '#ffffff'] },
  rosa: { bg: '#e7a3b8', ink: '#3a1420', petals: ['#ffffff', '#f7d2de', '#c8507a', '#f3dc8f'] },
  'rossi-arancio': { bg: '#b0321f', ink: '#fff4ea', petals: ['#e68a2e', '#f3dc8f', '#ffffff', '#7a1d12'] },
  viola: { bg: '#5b3f7a', ink: '#f5eefa', petals: ['#c9b3e6', '#ffffff', '#f3dc8f', '#8a6ab0'] },
  'blu-azzurri': { bg: '#2f4f9e', ink: '#eef2ff', petals: ['#9fc3f0', '#ffffff', '#f3dc8f', '#5b7fd0'] },
}
const FALLBACK = { bg: '#a83e2b', ink: '#f2ede3', petals: ['#ffffff', '#f3dc8f'] }

/** A modal moment: the app behind is inert, focus on the button, Escape closes. */
function useModal(onClose: () => void) {
  const button = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) root.inert = true
    const focus = setTimeout(() => button.current?.focus({ preventScroll: true }), 50)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      if (root) root.inert = false
      clearTimeout(focus)
      document.removeEventListener('keydown', onKey)
    }
  }, [])
  return button
}

/** One album complete: its colour fills the screen, five of the player's photos rise, petals. */
function AlbumCelebration({ album, cards, onClose }: { album: Album; cards: CardRecord[]; onClose: () => void }) {
  const covers = useCovers()
  const button = useModal(onClose)
  const palette = PALETTES[album.id] ?? FALLBACK
  // Five of this album's cards, spread across it: the player's cover photo of each species.
  const shown = useMemo(() => {
    const bySpecies = new Map<string, CardRecord[]>()
    for (const card of cards) {
      if (!speciesById(card.speciesId) || !inAlbum(speciesById(card.speciesId)!, album.id)) continue
      bySpecies.set(card.speciesId, [...(bySpecies.get(card.speciesId) ?? []), card])
    }
    const ids = [...bySpecies.keys()].sort((a, b) => inAlbum(speciesById(a)!, album.id)!.number - inAlbum(speciesById(b)!, album.id)!.number)
    const step = Math.max(1, Math.floor(ids.length / 5))
    return ids
      .filter((_, i) => i % step === 0)
      .slice(0, 5)
      .map((id) => {
        const own = bySpecies.get(id)!
        return own.find((card) => card.id === covers.get(id)) ?? own[0]!
      })
  }, [cards, covers, album.id])
  const photos = usePhotos(shown.flatMap((card) => (card.photoId ? [card.photoId] : [])))

  return createPortal(
    <div
      className="celebration"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      style={{ ['--bg' as string]: palette.bg, ['--ink' as string]: palette.ink } as CSSProperties}
    >
      <Petals colours={palette.petals} />
      <div className="celebration__cards" aria-hidden="true">
        {shown.map((card, i) => (
          <span
            key={card.id}
            className="celebration__card"
            style={{ ['--i' as string]: i, ['--r' as string]: `${(i - (shown.length - 1) / 2) * 5}deg` } as CSSProperties}
          >
            <PhotoThumb photo={card.photoId ? photos.get(card.photoId) : undefined} alt="" />
          </span>
        ))}
      </div>
      <div className="celebration__words grid justify-items-center gap-2">
        <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em]" style={{ ['--i' as string]: 0 } as CSSProperties}>
          Album completato
        </p>
        <h2 id="celebration-title" className="celebration__title" style={{ ['--i' as string]: 1 } as CSSProperties}>
          {album.name}
        </h2>
        <p className="text-[0.9375rem]" style={{ ['--i' as string]: 2 } as CSSProperties}>
          Tutte le {album.speciesCount} specie, leggendaria compresa.
        </p>
        <button
          ref={button}
          type="button"
          className="celebration__button press mt-4"
          style={{ ['--i' as string]: 3 } as CSSProperties}
          onClick={onClose}
        >
          Che bello!
        </button>
      </div>
    </div>,
    document.body,
  )
}

type Moment = { kind: 'album'; album: Album } | { kind: 'finale' }

/**
 * Plays what is due, one after another: each newly completed album, then the finale when every
 * album is complete. `delay` lets a slot that just filled be seen first.
 */
export function Celebrations({ delay = 300 }: { delay?: number }) {
  const cards = useCards()
  const [queue, setQueue] = useState<Moment[]>([])
  const counts = useMemo(() => (cards ? foundPerAlbum(cards, (id) => speciesById(id)?.albums) : null), [cards])

  useEffect(() => {
    if (!cards || !counts) return
    const done = albums.filter((album) => (counts.get(album.id) ?? 0) === album.speciesCount)
    const celebrated = readCelebrated()
    const due: Moment[] = done.filter((album) => !celebrated.has(album.id)).map((album) => ({ kind: 'album', album }))
    const finale = speciesFound(cards, speciesById) === totalSpecies && !finaleSeen()
    if (finale) due.push({ kind: 'finale' })
    if (due.length === 0) return
    // Remembered as they start: leaving the screen half-way never plays them twice.
    const timer = setTimeout(() => {
      remember(
        due.flatMap((moment) => (moment.kind === 'album' ? [moment.album.id] : [])),
        finale,
      )
      setQueue((current) => [...current, ...due])
    }, delay)
    return () => clearTimeout(timer)
  }, [cards, counts, delay])

  const next = () => setQueue((current) => current.slice(1))
  const moment = queue[0]
  if (!moment || !cards) return null
  return moment.kind === 'album' ? (
    <AlbumCelebration key={moment.album.id} album={moment.album} cards={cards} onClose={next} />
  ) : (
    <GrandFinale onClose={next} />
  )
}
