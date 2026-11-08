import type { CSSProperties, ReactNode } from 'react'
import { albumById, type Species } from '../../domain/catalog'
import { cardNumberLabel, rarityLabel } from '../../domain/collection'
import { plateCredit, plateFor, plateUrl } from '../../domain/plates'
import { formatMonths } from '../../domain/seasonality'

/** Position in the unpacking stagger (styles.css, .reveal-item); later items share the last slot. */
export const at = (i: number) => ({ '--i': i }) as CSSProperties

/** Name, scientific name and the rarity / number / album chips of a species. */
export function SpeciesTitle({ entry, extraChips }: { entry: Species; extraChips?: ReactNode }) {
  const album = albumById(entry.albumId)
  const number = cardNumberLabel(entry, album)
  return (
    <>
      <h1 className="reveal-item text-[2.375rem] leading-[1.02]" style={at(1)}>
        {entry.commonNameIt}
      </h1>
      <p className="reveal-item mt-1 text-[0.9375rem] italic text-muted" style={at(2)}>
        {entry.scientificName} · {entry.family}
      </p>
      <ul role="list" className="chips reveal-item mt-3.5" style={at(3)}>
        <li className="chip chip--rarity" data-rarity={entry.rarity}>
          {rarityLabel(entry.rarity)}
        </li>
        {number ? <li className="chip">{number}</li> : null}
        {album ? <li className="chip">{album.name}</li> : null}
        {extraChips}
      </ul>
    </>
  )
}

/** Safety lines: picking warnings for wild plants, and toxicity. Never claims a plant is edible. */
function SafetyNotes({ entry }: { entry: Species }) {
  const notes: string[] = []
  if (!entry.cultivated) {
    if (entry.protected === true) notes.push('Specie protetta: fotografala, non raccoglierla.')
    else if (entry.protected === null)
      notes.push('In alcune regioni potrebbe essere protetta: fotografala, non raccoglierla.')
    else notes.push('Fotografala, non raccoglierla.')
  }
  if (entry.protectionNote) notes.push(entry.protectionNote)
  if (entry.toxic) notes.push(entry.toxicNote || 'Pianta tossica: non assaggiarla.')
  if (notes.length === 0) return null
  return (
    <div className="notice reveal-item mt-6 grid gap-1">
      {notes.map((note) => (
        <p key={note} className="text-[0.9375rem] leading-snug">
          {note}
        </p>
      ))}
    </div>
  )
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** The species sheet below a card: season, habitat, altitude, regions, size, fun fact, safety, plate. */
export function SpeciesSheet({ entry, showPlate = true }: { entry: Species; showPlate?: boolean }) {
  const plate = plateFor(entry.id)
  const url = plateUrl(entry.id)
  const rows: Array<[string, string]> = [
    [entry.phenology === 'fruiting' ? 'Frutti' : 'Fioritura', capitalise(formatMonths(entry.bloomMonths))],
    ['Dove cresce', entry.habitat],
    ['Altitudine', entry.altitude],
    ['In Italia', entry.regions],
    ['Dimensioni', entry.sizeNote],
  ]
  return (
    <>
      <h2 className="reveal-item mt-9 text-[1.375rem] leading-tight">Scheda</h2>
      <dl className="facts reveal-item mt-4">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      {entry.funFact ? <p className="reveal-item mt-5 leading-normal">{entry.funFact}</p> : null}
      <SafetyNotes entry={entry} />
      {showPlate && plate && url ? (
        <figure className="plate reveal-item mt-7">
          <img src={url} alt={`Tavola botanica: ${entry.commonNameIt}`} loading="lazy" decoding="async" />
          <figcaption>{plateCredit(plate)}</figcaption>
        </figure>
      ) : null}
      {entry.textStatus !== 'verificato' ? (
        <p className="reveal-item mt-5 text-[0.8125rem] text-muted">Testi della scheda ancora da verificare.</p>
      ) : null}
    </>
  )
}
