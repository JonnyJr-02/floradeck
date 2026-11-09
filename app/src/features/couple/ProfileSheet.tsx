import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { PROFILE_COLOURS, saveProfile, type Profile } from '../../db/couple'
import { Sheet } from '../../ui/Sheet'

const COLOUR_NAMES: Record<(typeof PROFILE_COLOURS)[number], string> = {
  '#a83e2b': 'Rosso papavero',
  '#c9a24a': 'Oro',
  '#3d5fb8': 'Blu fiordaliso',
  '#5b7a3a': 'Verde foglia',
  '#b45f8a': 'Rosa',
  '#2f6f73': 'Verde acqua',
}

/** Name and colour of this phone's player: the other phone shows them on gifts and progress. */
export function ProfileSheet({ open, profile, onClose }: { open: boolean; profile: Profile | undefined; onClose: () => void }) {
  const [name, setName] = useState('')
  const [colour, setColour] = useState<string>(PROFILE_COLOURS[0])

  // Fill the fields once per opening, and never over what the user already changed: the stored
  // profile can arrive (or be made) a moment after the sheet opens.
  const filled = useRef(false)
  const touched = useRef({ name: false, colour: false })
  useEffect(() => {
    if (!open) {
      filled.current = false
      touched.current = { name: false, colour: false }
      return
    }
    if (!profile || filled.current) return
    filled.current = true
    if (!touched.current.name) setName(profile.name)
    if (!touched.current.colour) setColour(profile.colour)
  }, [open, profile])

  async function save() {
    await saveProfile({ name, colour })
    onClose()
  }

  return (
    <Sheet open={open} labelledBy="profile-title" onClose={onClose}>
      <h2 id="profile-title" className="text-[1.75rem] leading-[1.05]">
        Chi gioca su questo telefono
      </h2>
      <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
        L’altro telefono vede il tuo nome sui regali e accanto ai tuoi progressi.
      </p>
      <form
        className="mt-5 grid gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <label className="field">
          Il tuo nome
          <input
            value={name}
            onChange={(event) => {
              touched.current.name = true
              setName(event.target.value)
            }}
            maxLength={40}
            autoComplete="given-name"
            enterKeyHint="done"
          />
        </label>
        <fieldset>
          <legend className="text-[0.875rem] font-semibold">Il tuo colore</legend>
          <div className="swatches mt-2">
            {PROFILE_COLOURS.map((value) => (
              <label key={value} style={{ '--who': value } as CSSProperties} title={COLOUR_NAMES[value]}>
                <input
                  type="radio"
                  name="profile-colour"
                  value={value}
                  checked={colour === value}
                  onChange={() => {
                    touched.current.colour = true
                    setColour(value)
                  }}
                />
                <span className="sr-only">{COLOUR_NAMES[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-2.5">
          <button type="submit" className="btn press">
            Salva
          </button>
          <button type="button" className="btn btn--ghost press" onClick={onClose}>
            Annulla
          </button>
        </div>
      </form>
    </Sheet>
  )
}
