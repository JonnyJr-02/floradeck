import { useState, type CSSProperties } from 'react'
import { useCards } from '../../db/collection'
import { missingInSeason } from '../../domain/album'
import { albumById, species } from '../../domain/catalog'
import { SpeciesPicture } from '../../ui/SpeciesPicture'

/**
 * Once a month, from the 1st, the first opening shows what is in season before the app itself
 * (the user's request of 2026-11-09); afterwards the same list stays under the albums.
 * localStorage `floradeck:season-seen` holds the last month shown ("2026-11"); "off" turns it off
 * (the E2E tests use it).
 */

export const SEASON_KEY = 'floradeck:season-seen'
const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const SHOWN = 9

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function seasonIntroDue(stored: string | null, today: Date): boolean {
  return stored !== 'off' && stored !== monthKey(today)
}

function readStored(): string | null {
  try {
    return localStorage.getItem(SEASON_KEY)
  } catch {
    return 'off'
  }
}

export function useSeasonIntro(today = new Date()) {
  const [due, setDue] = useState(() => seasonIntroDue(readStored(), today))
  const dismiss = () => {
    try {
      localStorage.setItem(SEASON_KEY, monthKey(today))
    } catch {
      // not remembered: it shows again next time
    }
    setDue(false)
  }
  return { due, dismiss }
}

const albumOrder = (albumId: string) => albumById(albumId)?.order ?? 0
const at = (i: number) => ({ '--i': i }) as CSSProperties

export function SeasonIntro({ onDone, today = new Date() }: { onDone: () => void; today?: Date }) {
  const cards = useCards()
  const month = today.getMonth() + 1
  const list = cards ? missingInSeason(cards, month, species, albumOrder) : []
  const name = MONTH_NAMES[month - 1] ?? ''
  return (
    <main className="page page--plain season-intro">
      <p className="text-[0.875rem] font-semibold text-accent">Di stagione questo mese</p>
      <h1 className="mt-1 text-[2.5rem] leading-[1.02]">{name.charAt(0).toUpperCase() + name.slice(1)}</h1>
      {cards === undefined ? null : list.length === 0 ? (
        <p className="mt-3 text-muted">Hai già trovato tutte le specie in fiore o con i frutti in questo mese. Complimenti!</p>
      ) : (
        <>
          <p className="mt-3 text-muted">
            {list.length === 1 ? 'Questa specie che ti manca è' : `Queste ${list.length} specie che ti mancano sono`} in fiore
            o con i frutti adesso: è il momento giusto per cercarle. Le ritrovi sotto gli album.
          </p>
          <ul role="list" className="tiles mt-5" aria-label={`Di stagione a ${name}`}>
            {list.slice(0, SHOWN).map((entry, i) => {
              return (
                <li key={entry.id} className="season-intro__item" style={at(i)}>
                  <SpeciesPicture speciesId={entry.id} className="tile__img candidate__picture" />
                  <span className="tile__name mt-1.5 block">{entry.commonNameIt}</span>
                </li>
              )
            })}
          </ul>
          {list.length > SHOWN ? (
            <p className="mt-3 text-[0.875rem] text-muted">e altre {list.length - SHOWN}, sotto gli album.</p>
          ) : null}
        </>
      )}
      <button type="button" className="btn press mt-7" onClick={onDone}>
        Inizia a esplorare
      </button>
    </main>
  )
}
