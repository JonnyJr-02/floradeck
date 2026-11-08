import { speciesById } from '../../domain/catalog'
import type { Candidate } from '../../recognition/types'
import { IconChevron } from '../../ui/icons'
import { Sheet } from '../../ui/Sheet'

const percent = new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 0 })

export const SHOOTING_TIPS = [
  'Avvicinati: un fiore solo, al centro.',
  'Cerca la luce naturale, senza controluce.',
  'Tieni fermo il telefono finché il fiore è a fuoco.',
] as const

/** Grey zone: the three most likely species; the user confirms one, or shoots again. */
export function UnsureSheet({
  open,
  candidates,
  onPick,
  onAgain,
}: {
  open: boolean
  candidates: Candidate[]
  onPick: (candidate: Candidate) => void
  onAgain: () => void
}) {
  return (
    <Sheet open={open} labelledBy="unsure-title" onClose={onAgain}>
      <h2 id="unsure-title" className="text-[1.75rem] leading-[1.05]">
        Non sono sicuro
      </h2>
      <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
        Potrebbe essere una di queste. Scegli quella giusta, oppure scatta di nuovo più da vicino.
      </p>
      <ul role="list" className="mt-4 grid gap-2" aria-label="Le specie più probabili">
        {candidates.map((candidate) => {
          const entry = speciesById(candidate.speciesId)
          if (!entry) return null
          return (
            <li key={candidate.speciesId}>
              <button type="button" className="choice press" onClick={() => onPick(candidate)}>
                <span className="min-w-0">
                  <span className="block font-medium leading-tight">{entry.commonNameIt}</span>
                  <span className="block text-[0.8125rem] italic text-muted">{entry.scientificName}</span>
                </span>
                <span className="font-semibold tabular-nums">
                  <span className="sr-only">probabilità </span>
                  {percent.format(candidate.confidence)}
                </span>
                <IconChevron className="size-[1.125rem] text-muted" />
              </button>
            </li>
          )
        })}
      </ul>
      <button type="button" className="btn btn--ghost press mt-3" onClick={onAgain}>
        Scatta di nuovo
      </button>
    </Sheet>
  )
}

/** "altro", out of distribution or too uncertain: no card, and how to get a better shot. */
export function OutOfCatalogSheet({ open, onAgain }: { open: boolean; onAgain: () => void }) {
  return (
    <Sheet open={open} labelledBy="out-title" onClose={onAgain}>
      <h2 id="out-title" className="text-[1.75rem] leading-[1.05]">
        Non la trovo nel catalogo
      </h2>
      <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
        Forse non è una delle specie da collezionare, o la foto non basta per riconoscerla. Prova così:
      </p>
      <ul role="list" className="tips mt-4">
        {SHOOTING_TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <button type="button" className="btn press mt-5" onClick={onAgain}>
        Scatta di nuovo
      </button>
    </Sheet>
  )
}
