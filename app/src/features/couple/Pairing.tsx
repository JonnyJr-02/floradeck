import { useEffect, useMemo, useRef, useState } from 'react'
import { useCards } from '../../db/collection'
import { CoupleError, saveProfile, savePartner, useProfile } from '../../db/couple'
import { catalogueIds, mySnapshot } from '../../domain/couple'
import { decodeSnapshot, encodeSnapshot, ShareError, type Snapshot } from '../../domain/share'
import { Sheet } from '../../ui/Sheet'
import { progressLink, shareLink } from './links'

/** My progress as a link: in a QR code to scan, or sent through a chat. */
function useMyProgressLink(): string | undefined {
  const profile = useProfile()
  const cards = useCards()
  return useMemo(() => {
    if (!profile || !cards) return undefined
    return progressLink(encodeSnapshot(mySnapshot(profile, cards), catalogueIds))
  }, [profile, cards])
}

function QrCode({ text }: { text: string }) {
  const [code, setCode] = useState<{ size: number; path: string } | null>(null)
  useEffect(() => {
    let live = true
    // The QR library loads only when a code is shown.
    void import('./qr').then(({ qrPath }) => live && setCode(qrPath(text)))
    return () => {
      live = false
    }
  }, [text])
  return (
    <div className="qr">
      {code ? (
        <svg viewBox={`-2 -2 ${code.size + 4} ${code.size + 4}`} role="img" aria-label="Il tuo codice di FloraDeck">
          <path d={code.path} fill="#000" shapeRendering="crispEdges" />
        </svg>
      ) : (
        <div className="aspect-square" aria-busy="true" />
      )}
    </div>
  )
}

export function MyCodeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile()
  const link = useMyProgressLink()
  const [name, setName] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const needsName = profile !== undefined && !profile.name

  async function send() {
    if (!link) return
    setStatus(null)
    const result = await shareLink(link, 'I miei progressi su FloraDeck', 'I miei progressi su FloraDeck: aprilo per vederli.')
    if (result === 'copied') setStatus('Link copiato: incollalo nella chat.')
    if (result === 'failed') setStatus('Non sono riuscito a copiare il link.')
  }

  return (
    <Sheet open={open} labelledBy="my-code-title" onClose={onClose} tall>
      <h2 id="my-code-title" className="text-[1.75rem] leading-[1.05]">
        Il tuo codice
      </h2>
      {needsName ? (
        <form
          className="mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (name.trim()) void saveProfile({ name })
          }}
        >
          <p className="text-[0.875rem] leading-snug text-muted">
            Prima il tuo nome: l’altro telefono lo mostra accanto ai tuoi progressi.
          </p>
          <label className="field">
            Il tuo nome
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              autoComplete="given-name"
              enterKeyHint="done"
            />
          </label>
          <button type="submit" className="btn press" disabled={!name.trim()}>
            Mostra il codice
          </button>
        </form>
      ) : (
        <>
          <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
            Sull’altro telefono apri Coppia e tocca «Inquadra il suo codice». Vedrà quali specie hai trovato, fino a oggi.
          </p>
          <div className="mt-5">{link ? <QrCode text={link} /> : null}</div>
          <p className="mt-4 text-center text-[0.8125rem] text-muted">
            Il codice porta solo il tuo nome e le specie trovate: niente foto, niente posizione.
          </p>
          <div className="mt-5 grid gap-2.5">
            <button type="button" className="btn btn--ghost press" disabled={!link} onClick={() => void send()}>
              Mandali come link
            </button>
            <button type="button" className="btn press" onClick={onClose}>
              Fatto
            </button>
          </div>
          <p role="status" className="mt-3 min-h-[1.5em] text-[0.875rem] font-semibold">
            {status}
          </p>
        </>
      )}
    </Sheet>
  )
}

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>
}
interface BarcodeDetectorClass {
  new (options: { formats: string[] }): BarcodeDetectorLike
  getSupportedFormats?: () => Promise<string[]>
}

/** Read QR codes from the rear camera: the browser's own detector where there is one, else jsQR. */
function useQrScanner(active: boolean, onText: (text: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  useEffect(() => {
    if (!active) return
    setProblem(null)
    let stopped = false
    let stream: MediaStream | null = null
    let timer = 0
    const canvas = document.createElement('canvas')

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        })
      } catch (error) {
        if (!stopped) {
          setProblem(
            error instanceof DOMException && error.name === 'NotAllowedError'
              ? 'La fotocamera è bloccata: permettila nelle impostazioni del browser, oppure fatti mandare i progressi come link.'
              : 'Non riesco ad aprire la fotocamera: fatti mandare i progressi come link.',
          )
        }
        return
      }
      // The sheet mounts its content a frame after it opens.
      for (let i = 0; i < 30 && !videoRef.current && !stopped; i++) await new Promise((done) => requestAnimationFrame(done))
      const video = videoRef.current
      if (stopped || !video) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      video.srcObject = stream
      await video.play().catch(() => undefined)

      let detector: BarcodeDetectorLike | null = null
      const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector
      try {
        if (Detector && (await Detector.getSupportedFormats?.())?.includes('qr_code')) detector = new Detector({ formats: ['qr_code'] })
      } catch {
        detector = null
      }
      const jsQR = detector ? null : (await import('jsqr')).default

      const tick = async () => {
        if (stopped) return
        let text: string | undefined
        if (video.readyState >= 2 && video.videoWidth > 0) {
          if (detector) {
            text = (await detector.detect(video).catch(() => []))[0]?.rawValue
          } else if (jsQR) {
            const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight))
            canvas.width = Math.round(video.videoWidth * scale)
            canvas.height = Math.round(video.videoHeight * scale)
            const context = canvas.getContext('2d', { willReadFrequently: true })
            if (context) {
              context.drawImage(video, 0, 0, canvas.width, canvas.height)
              const image = context.getImageData(0, 0, canvas.width, canvas.height)
              text = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data
            }
          }
        }
        if (stopped) return
        if (text) onTextRef.current(text)
        timer = window.setTimeout(() => void tick(), 200)
      }
      void tick()
    })()

    return () => {
      stopped = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
      if (videoRef.current) videoRef.current.srcObject = null
      canvas.width = canvas.height = 0
    }
  }, [active])

  return { videoRef, problem }
}

/** Scan the other phone's code; its progress is saved as the partner's. */
export function ScanSheet({
  open,
  onClose,
  onPaired,
}: {
  open: boolean
  onClose: () => void
  onPaired: (snapshot: Snapshot) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const lastText = useRef('')
  const busy = useRef(false)

  useEffect(() => {
    if (open) {
      setError(null)
      lastText.current = ''
    }
  }, [open])

  const { videoRef, problem } = useQrScanner(open, (text) => {
    if (busy.current || text === lastText.current) return
    lastText.current = text
    busy.current = true
    void (async () => {
      try {
        const snapshot = decodeSnapshot(text, catalogueIds)
        await savePartner(snapshot)
        onPaired(snapshot)
      } catch (caught) {
        setError(
          caught instanceof ShareError || caught instanceof CoupleError ? caught.message : 'Questo codice non è di FloraDeck.',
        )
      } finally {
        busy.current = false
      }
    })()
  })

  return (
    <Sheet open={open} labelledBy="scan-title" onClose={onClose} tall>
      <h2 id="scan-title" className="text-[1.75rem] leading-[1.05]">
        Inquadra il suo codice
      </h2>
      <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
        Sull’altro telefono apri Coppia e tocca «Mostra il mio codice», poi tienilo dentro il riquadro.
      </p>
      <div className="mt-5">
        {problem ? (
          <p role="alert" className="notice text-[0.9375rem]">
            {problem}
          </p>
        ) : (
          <div className="scanner">
            <video ref={videoRef} playsInline muted autoPlay aria-label="Fotocamera" />
          </div>
        )}
      </div>
      <p role="status" className="mt-3 min-h-[1.5em] text-[0.875rem] font-semibold text-accent">
        {error}
      </p>
      <button type="button" className="btn btn--ghost press mt-2" onClick={onClose}>
        Annulla
      </button>
    </Sheet>
  )
}
