import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'wouter'
import { readStorageStatus, requestPersistence, type StorageStatus } from '../../db/persist'
import { formatBytes } from '../../domain/format'
import type { ThemePreference } from '../../domain/theme'
import { isInstalled } from '../../pwa/environment'
import type { MockScenario } from '../../recognition/mock'
import { recognizer, setMockScenario, useMockScenario } from '../../recognition/recognizer'
import { BackHeader, IN_APP, Page } from '../../ui/Page'
import { Segmented } from '../../ui/Segmented'
import { AllPlantsSection } from './AllPlantsSection'
import { BackupSection, TestCardsSection } from './BackupSection'
import { setThemePreference, useThemePreference } from '../../ui/theme'

const THEME_OPTIONS = [
  { value: 'system', label: 'Automatico' },
  { value: 'light', label: 'Chiaro' },
  { value: 'dark', label: 'Scuro' },
] as const satisfies readonly { value: ThemePreference; label: string }[]

const MOCK_OPTIONS = [
  { value: 'random', label: 'Casuale' },
  { value: 'sure', label: 'Sicuro' },
  { value: 'unsure', label: 'Incerto' },
  { value: 'out', label: 'Fuori' },
  { value: 'legendary', label: 'Leggendaria' },
] as const satisfies readonly { value: MockScenario; label: string }[]

/** Until the real model ships (phase 7), the recogniser pretends: here you choose what it answers. */
function MockRecognitionSection() {
  const scenario = useMockScenario()
  if (recognizer.name !== 'mock') return null
  return (
    <Section id="settings-recognition" title="Riconoscimento di prova">
      <p className="mt-2 text-muted">
        Il riconoscimento vero arriva con il modello. Per ora FloraDeck finge, e qui scegli che cosa risponde dopo lo
        scatto.
      </p>
      <div className="mt-3">
        <Segmented
          name="mock-scenario"
          label="Risposta di prova"
          value={scenario}
          options={MOCK_OPTIONS}
          onChange={setMockScenario}
          wrap
        />
      </div>
      <p className="mt-2 text-[0.875rem] text-muted">
        Sicuro dà subito una carta, Incerto propone tre specie, Fuori risponde che non è nel catalogo, Leggendaria dà la carta segreta.
      </p>
    </Section>
  )
}

function useStorageStatus() {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const refresh = useCallback(() => {
    void readStorageStatus().then(setStatus)
  }, [])
  useEffect(refresh, [refresh])
  return { status, refresh }
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-9" aria-labelledby={id}>
      <h2 id={id} className="text-[1.25rem] leading-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

function StorageSummary({ status, onProtect }: { status: StorageStatus | null; onProtect: () => void }) {
  if (!status) return <p className="mt-2 text-muted">Controllo in corso…</p>
  return (
    <>
      {status.persisted === true ? (
        <p className="mt-2 text-muted">Archivio protetto: il browser non cancella le tue carte per fare spazio.</p>
      ) : status.persisted === false ? (
        <>
          <p className="mt-2 text-muted">
            Archivio non ancora protetto: se il telefono resta senza spazio, il browser potrebbe cancellare i dati. Su
            Android di solito basta installare l'app.
          </p>
          <button type="button" className="btn btn--ghost press mt-4" onClick={onProtect}>
            Proteggi l'archivio
          </button>
        </>
      ) : (
        <p className="mt-2 text-muted">Questo browser non dice se l'archivio è protetto.</p>
      )}
      {status.usage !== null ? (
        <p className="mt-3 text-[0.875rem] text-muted">Spazio usato da FloraDeck: {formatBytes(status.usage)}</p>
      ) : null}
    </>
  )
}

export function SettingsScreen() {
  const preference = useThemePreference()
  const { status, refresh } = useStorageStatus()
  const installed = isInstalled()

  const protect = () => {
    void requestPersistence().then(refresh)
  }

  return (
    <Page plain>
      <BackHeader title="Impostazioni" />

      <Section id="settings-theme" title="Tema">
        <div className="mt-3">
          <Segmented
            name="theme"
            label="Tema"
            value={preference}
            options={THEME_OPTIONS}
            onChange={setThemePreference}
          />
        </div>
        <p className="mt-2 text-[0.875rem] text-muted">Automatico segue l'impostazione del telefono.</p>
      </Section>

      <Section id="settings-install" title="Installazione">
        {installed ? (
          <p className="mt-2 text-muted">FloraDeck è installata su questo telefono.</p>
        ) : (
          <>
            <p className="mt-2 text-muted">
              Non è ancora installata. Installata, si apre come un'app e funziona anche senza rete.
            </p>
            <Link href="/installa" state={IN_APP} className="btn btn--ghost press mt-4">
              Installa FloraDeck
            </Link>
          </>
        )}
      </Section>

      <Section id="settings-backup" title="Backup">
        <BackupSection />
      </Section>

      <Section id="settings-storage" title="Spazio sul telefono">
        <StorageSummary status={status} onProtect={protect} />
      </Section>

      <AllPlantsSection />
      <MockRecognitionSection />
      <TestCardsSection />

      <Section id="settings-about" title="Informazioni">
        <p className="mt-2 text-muted">FloraDeck {__APP_VERSION__}</p>
      </Section>
    </Page>
  )
}
