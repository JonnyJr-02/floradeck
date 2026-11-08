import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { species, speciesById } from '../../domain/catalog'
import { identifyPlant, useAllPlants, type PlantName } from '../../recognition/allPlants'
import type { Candidate } from '../../recognition/types'
import { IconChevron } from '../../ui/icons'
import { IN_APP } from '../../ui/Page'
import { Sheet } from '../../ui/Sheet'

const percent = new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 0 })
/** "48%", or "<1%" rather than a misleading 0%. */
const share = (value: number) => (value < 0.005 ? '<1%' : percent.format(value))

export const SHOOTING_TIPS = [
  'Avvicinati: un fiore solo, al centro.',
  'Cerca la luce naturale, senza controluce.',
  'Tieni fermo il telefono finché il fiore è a fuoco.',
] as const

/** Grey zone: the three most likely species; the user confirms one, says none, or shoots again. */
export function UnsureSheet({
  open,
  candidates,
  onPick,
  onNone,
  onAgain,
}: {
  open: boolean
  candidates: Candidate[]
  onPick: (candidate: Candidate) => void
  onNone: () => void
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
                  {share(candidate.confidence)}
                </span>
                <IconChevron className="size-[1.125rem] text-muted" />
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 grid gap-2.5">
        <button type="button" className="btn btn--ghost press" onClick={onNone}>
          Nessuna di queste
        </button>
        <button type="button" className="btn btn--ghost press" onClick={onAgain}>
          Scatta di nuovo
        </button>
      </div>
    </Sheet>
  )
}

/** Catalogue species known under a scientific name, to say when a name found is also a card. */
const catalogueNames = new Map(
  species.flatMap((entry) => [entry.scientificName, ...entry.modelLabels].map((name) => [name.toLowerCase(), entry] as const)),
)

type Search = { step: 'idle' } | { step: 'searching' } | { step: 'done'; names: PlantName[] } | { step: 'failed' }

/** The optional name search among 7,806 species: only on request, after a confirming tap. */
function NameSearch({ photo, open }: { photo: Blob | undefined; open: boolean }) {
  const { state } = useAllPlants()
  const [search, setSearch] = useState<Search>({ step: 'idle' })
  useEffect(() => {
    if (!open) setSearch({ step: 'idle' })
  }, [open])

  if (!photo) return null
  if (state.status !== 'ready') {
    return (
      <div className="notice mt-5">
        <p className="font-medium">Vuoi sapere almeno il nome?</p>
        <p className="mt-1 text-[0.875rem] leading-snug text-muted">
          Scarica una volta il riconoscimento di tutte le piante (95 MB) in Impostazioni: poi funziona anche senza rete.
        </p>
        <Link href="/impostazioni" state={IN_APP} className="text-link mt-2 inline-block text-[0.875rem]">
          Vai alle Impostazioni
        </Link>
      </div>
    )
  }
  if (search.step === 'done') {
    return (
      <section className="mt-5" aria-labelledby="names-title">
        <h3 id="names-title" className="text-[1.25rem] leading-tight">
          Forse è…
        </h3>
        <ul role="list" className="mt-3 grid gap-2" aria-label="I nomi più probabili">
          {search.names.map((name) => {
            const card = catalogueNames.get(name.scientific.toLowerCase())
            return (
              <li key={name.scientific} className="choice">
                <span className="min-w-0">
                  <span className="block font-medium leading-tight">
                    {name.italian ? name.italian.charAt(0).toUpperCase() + name.italian.slice(1) : name.scientific}
                  </span>
                  {name.italian ? <span className="block text-[0.8125rem] italic text-muted">{name.scientific}</span> : null}
                  {card ? (
                    <span className="mt-0.5 block text-[0.8125rem] text-accent">
                      È anche una figurina: riprova la foto più da vicino.
                    </span>
                  ) : null}
                </span>
                <span className="font-semibold tabular-nums">
                  <span className="sr-only">probabilità </span>
                  {share(name.confidence)}
                </span>
                <span aria-hidden="true" />
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-[0.8125rem] leading-snug text-muted">
          Solo un&apos;indicazione: non è tra le figurine, quindi niente carta.
        </p>
      </section>
    )
  }
  return (
    <div className="mt-5">
      <button
        type="button"
        className="btn btn--ghost press"
        disabled={search.step === 'searching'}
        onClick={() => {
          setSearch({ step: 'searching' })
          identifyPlant(photo).then(
            (names) => setSearch({ step: 'done', names }),
            () => setSearch({ step: 'failed' }),
          )
        }}
      >
        {search.step === 'searching' ? 'Sto cercando tra 7.806 specie…' : 'Cerca il nome tra tutte le piante'}
      </button>
      <p className="mt-2 text-[0.8125rem] leading-snug text-muted" role="status">
        {search.step === 'failed'
          ? 'Non sono riuscito a cercare il nome. Riprova.'
          : search.step === 'searching'
            ? 'Ci vuole qualche secondo.'
            : 'Ci vuole qualche secondo e dà solo il nome, non la carta.'}
      </p>
    </div>
  )
}

/** "altro", out of distribution, too uncertain or «Nessuna di queste»: no card, tips and the name search. */
export function OutOfCatalogSheet({
  open,
  afterNone = false,
  photo,
  onAgain,
}: {
  open: boolean
  afterNone?: boolean
  photo?: Blob
  onAgain: () => void
}) {
  return (
    <Sheet open={open} labelledBy="out-title" onClose={onAgain}>
      <h2 id="out-title" className="text-[1.75rem] leading-[1.05]">
        {afterNone ? 'Allora non è una figurina' : 'Non la trovo nel catalogo'}
      </h2>
      <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
        Forse non è una delle specie da collezionare, o la foto non basta per riconoscerla. Prova così:
      </p>
      <ul role="list" className="tips mt-4">
        {SHOOTING_TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <NameSearch photo={photo} open={open} />
      <button type="button" className="btn press mt-5" onClick={onAgain}>
        Scatta di nuovo
      </button>
    </Sheet>
  )
}
