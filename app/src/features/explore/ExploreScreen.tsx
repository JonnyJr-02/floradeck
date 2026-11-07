import { useEffect } from 'react'
import { SettingsLink } from '../../ui/Page'
import { setStatusBarOverride } from '../../ui/theme'
import { InstallNudge } from '../settings/InstallNudge'

// --color-camera in src/ui/styles.css: the status bar turns dark with the viewfinder.
const CAMERA_GROUND = '#0b0f19'

export function ExploreScreen() {
  useEffect(() => {
    setStatusBarOverride(CAMERA_GROUND)
    return () => setStatusBarOverride(null)
  }, [])

  return (
    <main className="camera">
      <h1 className="sr-only">Esplora</h1>
      <div className="flex w-full max-w-[30rem] flex-col gap-3">
        <div className="flex justify-end">
          <SettingsLink />
        </div>
        <InstallNudge />
      </div>
      <p className="camera__tip mt-4">Avvicinati: un fiore solo, al centro</p>
      <div className="grid w-full flex-1 place-items-center py-6">
        <div className="camera__frame" aria-hidden="true" />
      </div>
      <div className="grid justify-items-center gap-3">
        <button type="button" className="shutter" disabled aria-label="Scatta una foto" aria-describedby="camera-soon" />
        <p id="camera-soon" className="max-w-[18rem] text-center text-[0.8125rem] text-camera-ink/75">
          La fotocamera arriva con il prossimo aggiornamento.
        </p>
      </div>
    </main>
  )
}
