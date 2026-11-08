import { requestPersistence } from '../../db/persist'
import { ALL_PLANTS_MB, useAllPlants } from '../../recognition/allPlants'

/** Impostazioni → Tutte le piante: download, state and removal of the all-plants model. */
export function AllPlantsSection() {
  const { state, download, remove } = useAllPlants()
  return (
    <section className="mt-9" aria-labelledby="settings-allplants">
      <h2 id="settings-allplants" className="text-[1.25rem] leading-tight">
        Tutte le piante
      </h2>
      <p className="mt-2 text-muted">
        Per le piante che non sono figurine, FloraDeck può dirti almeno il nome, scegliendo tra 7.806 specie. Serve
        scaricarlo una volta ({ALL_PLANTS_MB} MB, meglio con il Wi‑Fi); poi funziona senza rete e senza limiti.
      </p>
      {state.status === 'ready' ? (
        <>
          <p className="mt-3 font-medium">Scaricato: pronto anche senza rete.</p>
          <button type="button" className="btn btn--ghost press mt-4" onClick={() => void remove()}>
            Elimina e libera {ALL_PLANTS_MB} MB
          </button>
        </>
      ) : state.status === 'downloading' ? (
        <div className="mt-4" role="status">
          <p className="font-medium">Sto scaricando… {Math.round(state.progress * 100)} %</p>
          <span className="track mt-2" aria-hidden="true">
            <i style={{ width: `${state.progress * 100}%` }} />
          </span>
          <p className="mt-2 text-[0.875rem] text-muted">Tieni FloraDeck aperta finché non ha finito.</p>
        </div>
      ) : state.status === 'checking' ? (
        <p className="mt-3 text-muted">Controllo…</p>
      ) : (
        <>
          {state.status === 'error' ? (
            <p className="mt-3 text-[0.875rem]" role="alert">
              {state.message}
            </p>
          ) : null}
          <button
            type="button"
            className="btn btn--ghost press mt-4"
            onClick={() => {
              void requestPersistence()
              void download()
            }}
          >
            Scarica ({ALL_PLANTS_MB} MB)
          </button>
        </>
      )}
      <p className="mt-3 text-[0.8125rem] text-muted">
        Modello PlantCLEF 2024 di Pl@ntNet (CC BY 4.0); nomi italiani da iNaturalist e GBIF, dove esistono.
      </p>
    </section>
  )
}
