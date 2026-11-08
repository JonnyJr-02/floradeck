import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { addCard } from '../../db/collection'
import { decodeFile, preparePhoto, type PhotoSource, type PreparedPhoto } from '../../photo/photo'
import { recognizer } from '../../recognition/recognizer'
import type { Candidate, Recognition } from '../../recognition/types'
import { IconCamera, IconGallery } from '../../ui/icons'
import { SettingsLink } from '../../ui/Page'
import { setStatusBarOverride } from '../../ui/theme'
import { InstallNudge } from '../settings/InstallNudge'
import { OutOfCatalogSheet, UnsureSheet } from './ResultSheets'
import { useCamera, type CameraStatus } from './useCamera'

// --color-camera in src/ui/styles.css: the status bar turns dark with the viewfinder.
const CAMERA_GROUND = '#0b0f19'

type Source = 'camera' | 'gallery'

type Flow =
  | { step: 'aim' }
  | { step: 'thinking'; photo: PreparedPhoto; preview: string; source: Source }
  | { step: 'result'; photo: PreparedPhoto; preview: string; source: Source; recognition: Recognition }
  | { step: 'saving'; preview: string }

/** History state of the card screen: play the unpacking once, right after the discovery. */
export const REVEAL = { inApp: true, reveal: true } as const

function CameraPrompt({ status, onStart }: { status: CameraStatus; onStart: () => void }) {
  if (status === 'live' || status === 'starting') return null
  const copy =
    status === 'denied'
      ? {
          title: 'La fotocamera è bloccata',
          text: 'Puoi riattivarla dalle impostazioni del telefono per FloraDeck, oppure scegliere una foto dalla galleria.',
          action: 'Riprova',
        }
      : status === 'unavailable'
        ? {
            title: 'Fotocamera non disponibile',
            text: 'Questo telefono non ci fa usare la fotocamera adesso. Puoi scegliere una foto dalla galleria.',
            action: null,
          }
        : {
            title: 'Inquadra un fiore',
            text: 'FloraDeck lo riconosce sul telefono, anche senza rete, e lo trasforma in una carta.',
            action: 'Apri la fotocamera',
          }
  return (
    <div className="camera__prompt">
      <IconCamera className="size-8 text-camera-ink/80" />
      <h2 className="text-[1.5rem] leading-tight">{copy.title}</h2>
      <p className="text-[0.9375rem] leading-snug text-camera-ink/75">{copy.text}</p>
      {copy.action ? (
        <button type="button" className="btn press mt-2 w-auto px-6" onClick={onStart}>
          {copy.action}
        </button>
      ) : null}
    </div>
  )
}

export function ExploreScreen() {
  const [, navigate] = useLocation()
  const { videoRef, status, start } = useCamera()
  const [flow, setFlow] = useState<Flow>({ step: 'aim' })
  const [problem, setProblem] = useState<string | null>(null)
  // «Nessuna di queste» in «Non sono sicuro»: treat the shot as outside the catalogue.
  const [noneOfThese, setNoneOfThese] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setStatusBarOverride(CAMERA_GROUND)
    return () => {
      setStatusBarOverride(null)
      abortRef.current?.abort()
    }
  }, [])

  // Free the frozen frame when it is no longer shown.
  const preview = flow.step === 'aim' ? null : flow.preview
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  async function save(
    shot: { photo: PreparedPhoto; preview: string; source: Source },
    candidate: Candidate,
    identifiedBy: 'model' | 'user',
  ) {
    setFlow({ step: 'saving', preview: shot.preview })
    try {
      const { card } = await addCard({
        speciesId: candidate.speciesId,
        photo: shot.photo,
        identifiedBy,
        confidence: candidate.confidence,
        recognizer: recognizer.name,
        source: shot.source,
      })
      navigate(`/carta/${card.id}`, { state: REVEAL })
    } catch {
      setFlow({ step: 'aim' })
      setProblem('Non sono riuscito a salvare la carta. Controlla lo spazio sul telefono e riprova.')
    }
  }

  async function recognise(source: PhotoSource, from: Source) {
    setProblem(null)
    let photo: PreparedPhoto
    try {
      photo = await preparePhoto(source)
    } catch {
      setProblem('Non sono riuscito a leggere la foto. Riprova.')
      return
    }
    const shot = { photo, preview: URL.createObjectURL(photo.image), source: from }
    setFlow({ step: 'thinking', ...shot })
    const controller = new AbortController()
    abortRef.current = controller
    let recognition: Recognition
    try {
      recognition = await recognizer.recognize(photo.image, controller.signal)
    } catch {
      if (controller.signal.aborted) return
      setFlow({ step: 'aim' })
      setProblem('Il riconoscimento non è riuscito. Riprova.')
      return
    }
    // A card is added only when the recogniser is sure, or when the user confirms a proposal.
    if (recognition.kind === 'card') await save(shot, recognition.best, 'model')
    else setFlow({ step: 'result', ...shot, recognition })
  }

  function pickCandidate(candidate: Candidate) {
    if (flow.step === 'result') void save(flow, candidate, 'user')
  }

  function shoot() {
    const video = videoRef.current
    if (!video || status !== 'live' || video.videoWidth === 0) return
    void recognise(video, 'camera')
  }

  async function pickFile(file: File | undefined) {
    if (!file) return
    try {
      const bitmap = await decodeFile(file)
      await recognise(bitmap, 'gallery')
      bitmap.close()
    } catch {
      setProblem('Questa immagine non si apre. Prova con un’altra foto.')
    }
  }

  function again() {
    abortRef.current?.abort()
    setNoneOfThese(false)
    setFlow({ step: 'aim' })
  }

  const busy = flow.step === 'thinking' || flow.step === 'saving'
  const result = flow.step === 'result' ? flow.recognition : null
  const outOfCatalog = result?.kind === 'not-in-catalog' || (result?.kind === 'unsure' && noneOfThese)
  const tip = busy ? 'Sto guardando la foto…' : 'Avvicinati: un fiore solo, al centro'

  return (
    <main className="camera">
      <h1 className="sr-only">Esplora</h1>
      <video
        ref={videoRef}
        className="camera__feed"
        data-live={status === 'live' || undefined}
        playsInline
        muted
        autoPlay
        aria-hidden="true"
      />
      {preview ? <img className="camera__still" src={preview} alt="" /> : null}

      <div className="camera__top">
        <div className="flex justify-end">
          <SettingsLink />
        </div>
        <InstallNudge />
        <p className="camera__tip" role="status" hidden={!busy && status !== 'live'}>
          {tip}
        </p>
        {problem ? (
          <p className="camera__problem" role="alert">
            {problem}
          </p>
        ) : null}
      </div>

      <div className="camera__middle">
        {flow.step === 'aim' ? (
          status === 'live' ? (
            <div className="camera__frame" aria-hidden="true" />
          ) : (
            <CameraPrompt status={status} onStart={() => void start()} />
          )
        ) : null}
      </div>

      <div className="camera__controls">
        <button
          type="button"
          className="round-btn press"
          aria-label="Scegli una foto dalla galleria"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <IconGallery />
        </button>
        <button
          type="button"
          className="shutter press"
          aria-label="Scatta una foto"
          disabled={status !== 'live' || flow.step !== 'aim'}
          onClick={shoot}
        />
        <span className="size-11" aria-hidden="true" />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            void pickFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>

      <UnsureSheet
        open={result?.kind === 'unsure' && !noneOfThese}
        candidates={result?.kind === 'unsure' ? result.top3 : []}
        onPick={pickCandidate}
        onNone={() => setNoneOfThese(true)}
        onAgain={again}
      />
      <OutOfCatalogSheet
        open={outOfCatalog}
        afterNone={noneOfThese}
        photo={flow.step === 'result' ? flow.photo.image : undefined}
        onAgain={again}
      />
    </main>
  )
}
