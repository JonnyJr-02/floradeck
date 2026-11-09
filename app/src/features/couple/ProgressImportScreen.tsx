import { useState } from 'react'
import { Link } from 'wouter'
import { CoupleError, savePartner, usePartner, useProfile } from '../../db/couple'
import { catalogueIds } from '../../domain/couple'
import { formatFoundDate } from '../../domain/collection'
import { decodeSnapshot, ShareError, type Snapshot } from '../../domain/share'
import { currentPlatform, isInstalled } from '../../pwa/environment'
import { copyText } from './links'

type Read = { snapshot: Snapshot } | { error: string }

function read(hash: string): Read {
  try {
    return { snapshot: decodeSnapshot(hash, catalogueIds) }
  } catch (caught) {
    return { error: caught instanceof ShareError ? caught.message : 'Questi progressi non si aprono.' }
  }
}

/** Opening a progress link (/coppia/progressi#s1.…) sent through a chat instead of the QR code. */
export function ProgressImportScreen() {
  const [link] = useState(() => window.location.href)
  const [result] = useState(() => read(window.location.hash))
  const [bridge] = useState(() => currentPlatform() === 'ios' && !isInstalled())
  const partner = usePartner()
  const me = useProfile()
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  if ('error' in result) {
    return (
      <main className="page">
        <h1 className="text-[1.75rem] leading-tight">Questi progressi non si aprono</h1>
        <p className="mt-3 text-muted">{result.error}</p>
        <Link href="/coppia" className="btn press mt-6">
          Vai a Coppia
        </Link>
      </main>
    )
  }
  const { snapshot } = result
  const who = snapshot.name || 'Chi gioca con te'
  const own = me !== undefined && me.id === snapshot.profileId
  const replaces = partner && partner.profileId !== snapshot.profileId ? partner.name || 'l’altro telefono' : null

  async function save() {
    setStatus(null)
    try {
      await savePartner(snapshot)
      setSaved(true)
    } catch (caught) {
      setStatus(caught instanceof CoupleError ? caught.message : 'Non sono riuscito a salvarli. Riprova.')
    }
  }

  async function copy() {
    setStatus(
      (await copyText(link))
        ? 'Progressi copiati. Ora apri FloraDeck dalla schermata Home.'
        : 'Non sono riuscito a copiarli: tieni premuto il link nella chat e scegli «Copia».',
    )
  }

  if (own) {
    return (
      <main className="page">
        <h1 className="text-[1.75rem] leading-tight">Sono i tuoi progressi</h1>
        <p className="mt-3 text-muted">Mandali all’altro telefono: aperti lì, vedrà quali specie hai trovato.</p>
        <Link href="/coppia" className="btn press mt-6">
          Vai a Coppia
        </Link>
      </main>
    )
  }

  return (
    <main className="page">
      <h1 className="text-[1.75rem] leading-tight">{saved ? `Ora vedi i progressi di ${who}` : `I progressi di ${who}`}</h1>
      <p className="mt-3 text-muted">
        {snapshot.found.length === 1 ? 'Una specie trovata' : `${snapshot.found.length} specie trovate`}
        {snapshot.at ? `, al ${formatFoundDate(snapshot.at)}` : ''}.
        {replaces && !saved ? ` Prenderanno il posto di quelli di ${replaces}.` : ''}
      </p>
      {saved ? (
        <Link href="/coppia" className="btn press mt-6">
          Vai a Coppia
        </Link>
      ) : bridge ? (
        <>
          <section className="notice mt-5" aria-labelledby="bridge-title">
            <h2 id="bridge-title" className="text-[1.375rem] leading-tight">
              Mettili nell’app
            </h2>
            <ol className="steps mt-3 text-[0.9375rem]">
              <li>Tocca «Copia i progressi».</li>
              <li>Apri FloraDeck dalla schermata Home.</li>
              <li>In Coppia tocca «Incolla un link».</li>
            </ol>
          </section>
          <div className="mt-5 grid gap-2.5">
            <button type="button" className="btn press" onClick={() => void copy()}>
              Copia i progressi
            </button>
            <button type="button" className="btn btn--ghost press" onClick={() => void save()}>
              Salvali qui in Safari
            </button>
          </div>
        </>
      ) : (
        <div className="mt-6 grid gap-2.5">
          <button type="button" className="btn press" onClick={() => void save()}>
            Salva i suoi progressi
          </button>
          <Link href="/coppia" className="btn btn--ghost press">
            Non ora
          </Link>
        </div>
      )}
      <p role="status" className="mt-3 min-h-[1.5em] text-[0.875rem] font-semibold">
        {status}
      </p>
    </main>
  )
}
