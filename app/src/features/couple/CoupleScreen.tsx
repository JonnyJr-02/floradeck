import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'wouter'
import { useCards } from '../../db/collection'
import { forgetPartner, usePartner, useProfile, useSentGifts } from '../../db/couple'
import { albumById, speciesById } from '../../domain/catalog'
import { formatFoundDate } from '../../domain/collection'
import { coupleProgress, coupleTotal, foundSpecies } from '../../domain/couple'
import { plateUrl } from '../../domain/plates'
import type { Snapshot } from '../../domain/share'
import { IconGift } from '../../ui/icons'
import { IN_APP, Page, ScreenHeader } from '../../ui/Page'
import { Sheet } from '../../ui/Sheet'
import { coupleColours } from './colours'
import { OpenGiftSheet } from './OpenGiftSheet'
import { PairSheet } from './Pairing'
import { ProfileSheet } from './ProfileSheet'

const whoStyle = (colour: string) => ({ '--who': colour }) as CSSProperties
const initial = (name: string) => (name.trim().charAt(0) || '?').toUpperCase()

type Open = 'profile' | 'pair' | 'gift' | 'forget' | null

function PlateThumb({ speciesId }: { speciesId: string }) {
  const url = plateUrl(speciesId)
  return <span className="journal-row__img">{url ? <img src={url} alt="" loading="lazy" data-plate="" /> : null}</span>
}

/** Gifts: open one received (the picture from the chat), how to give one, and those still to send. */
function Gifts({ onOpen }: { onOpen: () => void }) {
  const pending = useSentGifts()
  return (
    <section className="card mt-6 grid gap-3 px-5 py-5" aria-labelledby="gifts-title">
      <h2 id="gifts-title" className="text-[1.375rem] leading-tight">
        Regali
      </h2>
      <p className="text-[0.875rem] text-muted">
        Per regalare una carta, aprila e tocca «Regala questa carta»: parte come immagine su WhatsApp. Per aprire un
        regalo che ti è arrivato:
      </p>
      <button type="button" className="btn btn--gift press" onClick={onOpen}>
        <IconGift className="size-5" />
        Apri un regalo
      </button>
      {pending && pending.length > 0 ? (
        <div className="mt-2">
          <h3 className="text-[1.125rem] leading-tight">Da inviare</h3>
          <ul role="list" className="mt-2 grid gap-2">
            {pending.map((gift) => (
              <li key={gift.giftId}>
                <Link
                  href={`/coppia/regalo/${gift.giftId}`}
                  state={IN_APP}
                  className="journal-row journal-row--on-card press"
                >
                  <PlateThumb speciesId={gift.speciesId} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium leading-tight">
                      {speciesById(gift.speciesId)?.commonNameIt ?? 'Specie non più nel catalogo'}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.8125rem] text-muted">
                      Preparato il {formatFoundDate(gift.createdAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[0.75rem] font-semibold text-accent">Invia</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function Together({ partner, mine, myColour }: { partner: Snapshot; mine: Set<string>; myColour: string | undefined }) {
  const theirs = useMemo(() => new Set(partner.found), [partner])
  const colours = coupleColours(myColour, partner.colour)
  const total = coupleTotal(mine, theirs)
  const albums = coupleProgress(mine, theirs)
  const name = partner.name || 'L’altro telefono'
  const onlyTheirs = total.partner - total.both
  return (
    <>
      <section className="card mt-6 px-5 py-5" aria-labelledby="together-title">
        <h2 id="together-title" className="text-[1.375rem] leading-tight">
          Insieme: {total.together} di {total.total}
        </h2>
        <span className="track mt-3" aria-hidden="true">
          <i style={{ width: `${(total.together / total.total) * 100}%` }} />
        </span>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.875rem]">
          <span className="inline-flex items-center gap-1.5">
            <i className="who-dot" style={whoStyle(colours.me)} aria-hidden="true" />
            Tu {total.mine}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="who-dot" style={whoStyle(colours.partner)} aria-hidden="true" />
            {name} {total.partner}
          </span>
          <span className="text-muted">in comune {total.both}</span>
        </p>
        <p className="mt-2 text-[0.8125rem] text-muted">
          {onlyTheirs > 0
            ? `${name} ha ${onlyTheirs === 1 ? 'una specie che a te manca' : `${onlyTheirs} specie che a te mancano`}. `
            : ''}
          Progressi di {name} al {formatFoundDate(partner.at)}.
        </p>
      </section>

      <section className="mt-7" aria-labelledby="couple-albums-title">
        <h2 id="couple-albums-title" className="text-[1.375rem] leading-tight">
          Album di coppia
        </h2>
        <ul role="list" className="mt-3 grid gap-2">
          {albums.map((progress) => {
            const album = albumById(progress.albumId)
            if (!album) return null
            return (
              <li key={album.id}>
                <Link href={`/coppia/album/${album.id}`} state={IN_APP} className="card album-row press grid gap-2 px-4 py-3.5">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-[1.125rem] leading-tight">{album.name}</span>
                    <span className="shrink-0 text-[0.8125rem] tabular-nums text-muted">
                      {progress.together} di {progress.total}
                    </span>
                  </span>
                  <span className="track" aria-hidden="true">
                    <i style={{ width: `${(progress.together / progress.total) * 100}%` }} />
                  </span>
                  <span className="text-[0.8125rem] text-muted">
                    Tu {progress.mine} · {name} {progress.partner}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}

/**
 * Coppia, kept to three things (user's request on 2026-11-09): who you are, gifts (one way to send,
 * one way to open), and the two collections together once the phones are paired.
 */
export function CoupleScreen() {
  const profile = useProfile()
  const partner = usePartner()
  const cards = useCards()
  const mine = useMemo(() => foundSpecies(cards ?? []), [cards])
  const [open, setOpen] = useState<Open>(null)
  const close = () => setOpen(null)

  // Draw the screen once the pairing is known, so nothing jumps under a finger a moment later.
  if (partner === null) {
    return (
      <Page>
        <ScreenHeader title="Coppia" />
        <div aria-busy="true" />
      </Page>
    )
  }
  const partnerName = partner?.name || 'l’altro telefono'

  return (
    <Page>
      <ScreenHeader title="Coppia">
        {partner ? <p className="mt-2 text-muted">Tu e {partnerName}</p> : null}
      </ScreenHeader>

      <button
        type="button"
        className="card press mt-6 flex w-full items-center gap-3.5 text-left"
        onClick={() => setOpen('profile')}
      >
        <span className="avatar" style={whoStyle(coupleColours(profile?.colour, undefined).me)} aria-hidden="true">
          {initial(profile?.name ?? '')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium leading-tight">{profile?.name || 'Come ti chiami?'}</span>
          <span className="mt-0.5 block text-[0.8125rem] text-muted">
            {profile?.name ? 'Tu, su questo telefono' : 'Scegli nome e colore'}
          </span>
        </span>
        <span className="text-[0.8125rem] font-semibold">Modifica</span>
      </button>

      {partner ? null : (
        <section className="card mt-6 grid gap-3 px-5 py-6" aria-labelledby="pair-invite-title">
          <h2 id="pair-invite-title" className="text-[1.375rem] leading-tight">
            FloraDeck si gioca in due
          </h2>
          <p className="text-muted">
            Collega il telefono di chi gioca con te: vedrete i progressi a vicenda e un album di coppia. Basta inquadrare un
            codice, una volta sola.
          </p>
          <button type="button" className="btn press mt-2" onClick={() => setOpen('pair')}>
            Collega i telefoni
          </button>
        </section>
      )}

      <Gifts onOpen={() => setOpen('gift')} />

      {partner ? (
        <>
          <Together partner={partner} mine={mine} myColour={profile?.colour} />
          <section className="mt-9 border-t border-line pt-6" aria-labelledby="pairing-title">
            <h2 id="pairing-title" className="text-[1.125rem] leading-tight">
              Progressi di {partnerName}
            </h2>
            <p className="mt-1 text-[0.875rem] text-muted">
              Si aggiornano da soli con ogni regalo che ti arriva. Per aggiornarli adesso, inquadrate di nuovo i codici.
            </p>
            <button type="button" className="btn btn--ghost press mt-3" onClick={() => setOpen('pair')}>
              Aggiorna i progressi
            </button>
            <button type="button" className="text-link mt-4 text-[0.875rem]" onClick={() => setOpen('forget')}>
              Scollega {partnerName}
            </button>
          </section>
        </>
      ) : null}

      <ProfileSheet open={open === 'profile'} profile={profile} onClose={close} />
      <PairSheet open={open === 'pair'} partnerName={partner?.name} onClose={close} />
      <OpenGiftSheet open={open === 'gift'} onClose={close} />
      <Sheet open={open === 'forget'} labelledBy="forget-title" onClose={close}>
        <h2 id="forget-title" className="text-[1.75rem] leading-[1.05]">
          Scollegare {partnerName}?
        </h2>
        <p className="mt-1.5 text-[0.875rem] leading-snug text-muted">
          Spariscono i suoi progressi da questo telefono. Le carte restano; per ricollegarvi basta inquadrare di nuovo il
          suo codice.
        </p>
        <div className="mt-5 grid gap-2.5">
          <button
            type="button"
            className="btn press"
            onClick={() => {
              close()
              void forgetPartner()
            }}
          >
            Scollega
          </button>
          <button type="button" className="btn btn--ghost press" onClick={close}>
            Annulla
          </button>
        </div>
      </Sheet>
    </Page>
  )
}
