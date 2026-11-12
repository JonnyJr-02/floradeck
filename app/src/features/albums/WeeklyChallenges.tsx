import { useEffect, useMemo, useState } from 'react'
import { Link } from 'wouter'
import { useCards } from '../../db/collection'
import { useGiftsGiven, usePartner } from '../../db/couple'
import { challengeProgress, ownedBefore, weekOf, weeklyChallenges } from '../../domain/challenges'
import { IN_APP } from '../../ui/Page'
import { Petals } from './Petals'

const CELEBRATED_KEY = 'floradeck:challenges-celebrated'

function Mark({ done, progress, target }: { done: boolean; progress: number; target: number }) {
  return (
    <span className="challenge__mark" data-done={done || undefined} aria-hidden="true">
      {done ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      ) : target > 1 ? (
        `${progress}/${target}`
      ) : null}
    </span>
  )
}

/**
 * «Sfide della settimana» (SPEC, optional; phase 9): three small goals from the season and the
 * collection, until Sunday. No penalty and no notification; petals once when all three are done.
 */
export function WeeklyChallenges() {
  const cards = useCards()
  const partner = usePartner()
  const gifts = useGiftsGiven()
  const week = useMemo(() => weekOf(new Date()), [])
  const [celebrate, setCelebrate] = useState(false)

  const ready = cards !== undefined && partner !== null && gifts !== undefined
  const before = useMemo(() => (cards ? ownedBefore(cards, week) : new Set<string>()), [cards, week])
  const challenges = useMemo(
    () => (ready ? weeklyChallenges(week, { ownedBefore: before, partnerName: partner ? partner.name || 'chi gioca con te' : undefined }) : []),
    [ready, week, before, partner],
  )
  const progress = challenges.map((challenge) =>
    challengeProgress(challenge, week, { cards: cards ?? [], ownedBefore: before, giftsGiven: gifts ?? [] }),
  )
  const done = progress.filter((value, i) => value >= challenges[i]!.target).length
  const allDone = challenges.length > 0 && done === challenges.length

  useEffect(() => {
    if (!allDone) return
    try {
      if (localStorage.getItem(CELEBRATED_KEY) === week.key) return
      localStorage.setItem(CELEBRATED_KEY, week.key)
    } catch {
      return
    }
    setCelebrate(true)
  }, [allDone, week.key])

  if (!ready) return null
  return (
    <section className="card mt-6 px-5 py-5" aria-labelledby="challenges-title">
      {celebrate ? <Petals /> : null}
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="challenges-title" className="text-[1.375rem] leading-tight">
          Sfide della settimana
        </h2>
        <span className="shrink-0 text-[0.875rem] font-semibold tabular-nums text-muted">
          {done} di {challenges.length}
        </span>
      </div>
      <p className="mt-1 text-[0.875rem] text-muted">
        {allDone ? 'Fatte tutte! Lunedì ne arrivano di nuove.' : 'Fino a domenica, senza fretta: lunedì ne arrivano di nuove.'}
      </p>
      <ul role="list" className="mt-4 grid gap-3">
        {challenges.map((challenge, i) => {
          const value = progress[i]!
          const complete = value >= challenge.target
          const words = (
            <span className="min-w-0">
              <span className="block font-medium leading-tight" data-done={complete || undefined}>
                {challenge.title}
                <span className="sr-only">{complete ? ', fatta' : `, ${value} di ${challenge.target}`}</span>
              </span>
              <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{challenge.hint}</span>
            </span>
          )
          return (
            <li key={challenge.id} className="challenge">
              <Mark done={complete} progress={value} target={challenge.target} />
              {challenge.speciesId && !complete ? (
                <Link href={`/specie/${challenge.speciesId}`} state={IN_APP} className="challenge__link">
                  {words}
                </Link>
              ) : (
                words
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
