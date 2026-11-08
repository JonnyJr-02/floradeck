import { useEffect, useState, type CSSProperties } from 'react'

const COLOURS = ['#c8322a', '#e7a3b8', '#f4f1ea', '#e9c43c', '#e68a2e']
const COUNT = 22

/** Deterministic spread, so every petal shower looks hand-placed rather than clumped. */
function petal(i: number): CSSProperties {
  const golden = (i * 0.618034) % 1
  return {
    left: `${4 + golden * 92}%`,
    background: COLOURS[i % COLOURS.length],
    animationDelay: `${(i % 7) * 90}ms`,
    animationDuration: `${1800 + ((i * 137) % 700)}ms`,
    // Read by the keyframes on this petal only: where it drifts and how far it turns.
    ['--drift' as string]: `${((i * 53) % 120) - 60}px`,
    ['--spin' as string]: `${((i * 97) % 540) - 270}deg`,
  }
}

/**
 * Petal confetti when an album is completed (animate skill: rare celebration, the delight budget).
 * CSS keyframes off the main thread, transform and opacity only, removed after the last petal lands.
 * Reduced motion: no petals at all (the "Album completato" line stays).
 */
export function Petals() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 3200)
    return () => clearTimeout(timer)
  }, [])
  if (done) return null
  return (
    <div className="petals" aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => (
        <i key={i} style={petal(i)} />
      ))}
    </div>
  )
}
