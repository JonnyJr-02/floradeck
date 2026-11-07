import type { ReactNode } from 'react'
import type { Platform } from '../../domain/platform'
import { currentPlatform, isInstalled } from '../../pwa/environment'
import { promptInstall, useInstallAvailability } from '../../pwa/installPrompt'
import { IconAddSquare, IconMenuDots, IconShare } from '../../ui/icons'
import { BackHeader, Page } from '../../ui/Page'

function GuideSection({ id, title, current, children }: { id: string; title: string; current: boolean; children: ReactNode }) {
  return (
    <section className="mt-9" aria-labelledby={id}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id={id} className="text-[1.375rem] leading-tight">
          {title}
        </h2>
        {current ? (
          <span className="rounded-full bg-surface px-2.5 py-1 text-[0.75rem] font-semibold">Questo telefono</span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function IosGuide({ current }: { current: boolean }) {
  return (
    <GuideSection id="install-ios" title="Su iPhone, con Safari" current={current}>
      <ol role="list" className="steps mt-4">
        <li>
          <span>
            Apri questa pagina in <b className="font-semibold">Safari</b>.
          </span>
        </li>
        <li>
          <span>
            Tocca <IconShare className="inline-icon" /> <b className="font-semibold">Condividi</b>: secondo la versione
            di iOS è nella barra in basso oppure nel menu con i tre puntini.
          </span>
        </li>
        <li>
          <span>
            Scegli <IconAddSquare className="inline-icon" />{' '}
            <b className="font-semibold">Aggiungi alla schermata Home</b>. Se non lo vedi, scorri l'elenco.
          </span>
        </li>
        <li>
          <span>
            Tocca <b className="font-semibold">Aggiungi</b>: FloraDeck compare tra le app.
          </span>
        </li>
      </ol>
      <div className="notice mt-5">
        <p className="font-semibold">Usala sempre dall'icona</p>
        <p className="mt-1 text-[0.875rem] leading-snug text-muted">
          Safari e l'app installata tengono dati separati: le carte salvate in Safari non compaiono nell'app, e
          viceversa.
        </p>
      </div>
    </GuideSection>
  )
}

function AndroidGuide({ current }: { current: boolean }) {
  const availability = useInstallAvailability()
  return (
    <GuideSection id="install-android" title="Su Android, con Chrome" current={current}>
      {availability === 'available' ? (
        <>
          <button type="button" className="btn press mt-4" onClick={() => void promptInstall()}>
            Installa FloraDeck
          </button>
          <p className="mt-4 text-[0.875rem] text-muted">Oppure dal menu di Chrome:</p>
        </>
      ) : null}
      {availability === 'installed' ? <p className="mt-3 text-muted">Installata: la trovi tra le app.</p> : null}
      <ol role="list" className="steps mt-4">
        <li>
          <span>
            Tocca <IconMenuDots className="inline-icon" /> in alto a destra per aprire il menu di Chrome.
          </span>
        </li>
        <li>
          <span>
            Tocca <b className="font-semibold">Installa app</b> (in alcune versioni{' '}
            <b className="font-semibold">Aggiungi a schermata Home</b>).
          </span>
        </li>
        <li>
          <span>
            Conferma con <b className="font-semibold">Installa</b>: FloraDeck compare tra le app.
          </span>
        </li>
      </ol>
    </GuideSection>
  )
}

export function InstallScreen() {
  const platform = currentPlatform()
  const order: Platform[] = platform === 'android' ? ['android', 'ios'] : ['ios', 'android']

  return (
    <Page plain>
      <BackHeader title="Installa FloraDeck" />
      {isInstalled() ? (
        <p className="mt-6 text-muted">FloraDeck è già installata: aprila dall'icona sulla schermata Home.</p>
      ) : (
        <>
          <p className="mt-5 text-muted">
            Installata, FloraDeck si apre come un'app, funziona anche senza rete e tiene foto e carte sul telefono.
          </p>
          {order.map((guide) =>
            guide === 'ios' ? (
              <IosGuide key="ios" current={platform === 'ios'} />
            ) : (
              <AndroidGuide key="android" current={platform === 'android'} />
            ),
          )}
        </>
      )}
    </Page>
  )
}
