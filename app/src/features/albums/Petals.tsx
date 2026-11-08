import { useEffect, useState, type CSSProperties } from 'react'

const FLOWER_COLOURS = ['#c8322a', '#e7a3b8', '#f4f1ea', '#e9c43c', '#e68a2e']
/** For a legendary card: gold leaf and light. */
export const GOLD_COLOURS = ['#f3dc8f', '#c9a24a', '#fff4cf', '#a77c2a', '#e9c43c']
const COUNT = 22

/** Deterministic spread, so every petal shower looks hand-placed rather than clumped. */
function petal(i: number, colours: readonly string[]): CSSProperties {
  const golden = (i * 0.618034) % 1
  return {
    left: `${4 + golden * 92}%`,
    background: colours[i % colours.length],
    animationDelay: `${(i % 7) * 90}ms`,
    animationDuration: `${1800 + ((i * 137) % 700)}ms`,
    // Read by the keyframes on this petal only: where it drifts and how far it turns.
    ['--drift' as string]: `${((i * 53) % 120) - 60}px`,
    ['--spin' as string]: `${((i * 97) % 540) - 270}deg`,
  }
}

/**
 * Petal confetti when an album is completed (or gold leaf for a legendary card) (animate skill: rare celebration, the delight budget).
 * CSS keyframes off the main thread, transform and opacity only, removed after the last petal lands.
 * Reduced motion: no petals at all (the "Album completato" line stays).
 */
export function Petals({ colours = FLOWER_COLOURS }: { colours?: readonly string[] }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 3200)
    return () => clearTimeout(timer)
  }, [])
  if (done) return null
  return (
    <div className="petals" aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => (
        <i key={i} style={petal(i, colours)} />
      ))}
    </div>
  )
}
