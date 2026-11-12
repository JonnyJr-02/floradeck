import { useEffect, useState } from 'react'
import { Link } from 'wouter'
import { cardForName } from '../../domain/allPlantsCards'
import { speciesById } from '../../domain/catalog'
import { identifyPlant, useAllPlants, type PlantName } from '../../recognition/allPlants'
import { plantPhoto, type PlantPhoto } from '../../recognition/plantPhotos'
import type { Candidate } from '../../recognition/types'
import { IconChevron, IconLeaf } from '../../ui/icons'
import { IN_APP } from '../../ui/Page'
import { Sheet } from '../../ui/Sheet'
import { SpeciesPicture } from '../../ui/SpeciesPicture'

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
    <Sheet open={open} labelledBy="unsure-title" onClose={onAgain} tall>
      <h2 id="unsure-title" className="text-[1.75rem] leading-[1.05]">
        Non sono sicuro
      </h2>
      <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
        Potrebbe essere una di queste: confronta le foto e scegli quella giusta, oppure scatta di nuovo più da vicino.
      </p>
      <ul role="list" className="mt-4 grid gap-2.5" aria-label="Le specie più probabili">
        {candidates.map((candidate) => {
          const entry = speciesById(candidate.speciesId)
          if (!entry) return null
          return (
            <li key={candidate.speciesId}>
              <button type="button" className="candidate press" onClick={() => onPick(candidate)}>
                <SpeciesPicture speciesId={candidate.speciesId} className="candidate__picture" />
                <span className="min-w-0">
                  <span className="block font-medium leading-tight">{entry.commonNameIt}</span>
                  <span className="block text-[0.8125rem] italic text-muted">{entry.scientificName}</span>
                </span>
                <span className="grid justify-items-end gap-1">
                  <span className="font-semibold tabular-nums">
                    <span className="sr-only">probabilità </span>
                    {share(candidate.confidence)}
                  </span>
                  <IconChevron className="size-[1.125rem] text-muted" />
                </span>
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

type Search = { step: 'idle' } | { step: 'searching'; progress: number } | { step: 'done'; names: PlantName[] } | { step: 'failed' }

/** A photo for a name found: the card's own pictures when it is also a card, else iNaturalist's. */
function NamePicture({ scientific, cardId, onCredit }: { scientific: string; cardId?: string; onCredit: (credit: string) => void }) {
  const [photo, setPhoto] = useState<PlantPhoto | null>(null)
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    if (cardId) return
    let live = true
    plantPhoto(scientific).then(
      (found) => {
        if (!live) return
        setPhoto(found)
        if (found) onCredit(found.credit)
      },
      () => undefined,
    )
    return () => {
      live = false
    }
  }, [scientific, cardId, onCredit])
  if (cardId) return <SpeciesPicture speciesId={cardId} className="candidate__picture" />
  return (
    <span className="candidate__picture" aria-hidden="true">
      {photo && !broken ? (
        <img src={photo.url} alt="" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        <IconLeaf className="candidate__placeholder" />
      )}
    </span>
  )
}

/** Names, photo and credit of one proposal, shared by the card button and the Wikipedia link. */
function NameBody({ name, cardId, saved }: { name: PlantName; cardId?: string; saved: boolean }) {
  const [credit, setCredit] = useState('')
  return (
    <>
      <NamePicture scientific={name.scientific} cardId={cardId} onCredit={setCredit} />
      <span className="min-w-0">
        <span className="block font-medium leading-tight">
          {name.italian ? name.italian.charAt(0).toUpperCase() + name.italian.slice(1) : name.scientific}
        </span>
        {name.italian ? <span className="block text-[0.8125rem] italic text-muted">{name.scientific}</span> : null}
        {cardId ? (
          <span className="mt-0.5 block text-[0.8125rem] font-semibold text-accent">È una figurina: toccala per metterla nell’album</span>
        ) : saved ? (
          <span className="mt-0.5 block text-[0.8125rem] font-semibold text-accent">Salvata nel diario</span>
        ) : null}
        {credit ? (
          <span className="mt-1 block text-[0.6875rem] leading-tight text-muted">
            Foto:{' '}
            {credit.split(' · ').map((part, i) => (
              <span key={part}>
                {i > 0 ? ' · ' : ''}
                {/* The licence ("CC BY-NC-SA") never breaks at its hyphens. */}
                <span className={i === 1 ? 'whitespace-nowrap' : undefined}>{part}</span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="grid justify-items-end gap-1">
        <span className="font-semibold tabular-nums">
          <span className="sr-only">probabilità </span>
          {share(name.confidence)}
        </span>
        <IconChevron className="size-[1.125rem] text-muted" />
      </span>
    </>
  )
}

/**
 * One of the three names (user's request on 2026-11-12): a name that is also a card adds the card,
 * as a confirmed proposal; any other name opens Wikipedia and keeps the plant in the diary.
 */
function NameResult({
  name,
  cardId,
  saved,
  onPickCard,
  onSaveSighting,
}: {
  name: PlantName
  cardId?: string
  saved: boolean
  onPickCard: (speciesId: string, confidence: number) => void
  onSaveSighting: (name: PlantName) => void
}) {
  if (cardId) {
    return (
      <button type="button" className="candidate press" onClick={() => onPickCard(cardId, name.confidence)}>
        <NameBody name={name} cardId={cardId} saved={false} />
      </button>
    )
  }
  return (
    <a
      className="candidate press"
      href={`https://it.wikipedia.org/w/index.php?search=${encodeURIComponent(name.scientific)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onSaveSighting(name)}
    >
      <NameBody name={name} saved={saved} />
    </a>
  )
}

/** The optional name search among 7,806 species: only on request, after a confirming tap. */
function NameSearch({
  photo,
  open,
  onPickCard,
  onSaveSighting,
}: {
  photo: Blob | undefined
  open: boolean
  onPickCard: (speciesId: string, confidence: number) => void
  onSaveSighting: (name: PlantName) => Promise<void>
}) {
  const { state } = useAllPlants()
  const [search, setSearch] = useState<Search>({ step: 'idle' })
  const [saved, setSaved] = useState<string | null>(null)
  useEffect(() => {
    if (open) return
    setSearch({ step: 'idle' })
    setSaved(null)
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
        <ul role="list" className="mt-3 grid gap-2.5" aria-label="I nomi più probabili">
          {search.names.map((name) => {
            const cardId = cardForName(name.scientific)
            return (
              <li key={name.scientific}>
                <NameResult
                  name={name}
                  cardId={cardId}
                  saved={saved === name.scientific}
                  onPickCard={onPickCard}
                  onSaveSighting={(picked) => {
                    setSaved(picked.scientific)
                    void onSaveSighting(picked)
                  }}
                />
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-[0.8125rem] leading-snug text-muted">
          Tocca il nome giusto: se è una figurina va nell&apos;album, altrimenti si apre Wikipedia e la pianta resta nel
          Diario. Con la rete arrivano le foto da iNaturalist.
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
          setSearch({ step: 'searching', progress: 0 })
          identifyPlant(photo, (progress) =>
            setSearch((current) => (current.step === 'searching' ? { step: 'searching', progress } : current)),
          ).then(
            (names) => setSearch({ step: 'done', names }),
            () => setSearch({ step: 'failed' }),
          )
        }}
      >
        {search.step === 'searching'
          ? `Sto cercando tra 7.806 specie… ${Math.round(search.progress * 100)} %`
          : 'Cerca il nome tra tutte le piante'}
      </button>
      {search.step === 'searching' ? (
        <span
          className="track mt-3"
          role="progressbar"
          aria-label="Avanzamento della ricerca"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(search.progress * 100)}
        >
          <i style={{ width: `${search.progress * 100}%` }} />
        </span>
      ) : null}
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
  onPickCard,
  onSaveSighting,
}: {
  open: boolean
  afterNone?: boolean
  photo?: Blob
  onAgain: () => void
  onPickCard: (speciesId: string, confidence: number) => void
  onSaveSighting: (name: PlantName) => Promise<void>
}) {
  return (
    <Sheet open={open} labelledBy="out-title" onClose={onAgain} tall>
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
      <NameSearch photo={photo} open={open} onPickCard={onPickCard} onSaveSighting={onSaveSighting} />
      <button type="button" className="btn press mt-5" onClick={onAgain}>
        Scatta di nuovo
      </button>
    </Sheet>
  )
}
