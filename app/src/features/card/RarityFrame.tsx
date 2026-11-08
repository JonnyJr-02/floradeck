import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Rarity } from '../../domain/catalog'

type PermissionRequest = () => Promise<'granted' | 'denied'>

/** iOS asks before giving a page the motion sensors; Android and desktop do not. */
function orientationPermission(): PermissionRequest | undefined {
  const event = (globalThis as { DeviceOrientationEvent?: { requestPermission?: PermissionRequest } })
    .DeviceOrientationEvent
  return typeof event?.requestPermission === 'function' ? event.requestPermission.bind(event) : undefined
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * The legendary card's holographic sheen follows the phone's tilt (or a finger dragged on the photo).
 * The sheen layer moves with transform only, written straight onto that layer once per frame
 * (animation-performance: composite-only, no CSS variable inherited by children).
 */
function useHolo(enabled: boolean) {
  const layerRef = useRef<HTMLSpanElement>(null)
  const [needsPermission, setNeedsPermission] = useState(false)
  const [sensorOn, setSensorOn] = useState(false)

  // Offer the iOS permission button only on a touch phone whose sensor stays silent: Android and
  // phones that already allowed it send events at once, desktops have nothing to tilt.
  useEffect(() => {
    if (!enabled || !orientationPermission() || !window.matchMedia?.('(pointer: coarse)').matches) return
    let heard = false
    const onEvent = (event: DeviceOrientationEvent) => {
      if (event.gamma !== null) heard = true
    }
    window.addEventListener('deviceorientation', onEvent)
    const timer = setTimeout(() => {
      if (!heard) setNeedsPermission(true)
    }, 800)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('deviceorientation', onEvent)
    }
  }, [enabled])

  useEffect(() => {
    const layer = layerRef.current
    if (!enabled || !layer || prefersReducedMotion()) return
    let frame = 0
    let x = 0
    let y = 0
    const paint = () => {
      frame = 0
      layer.style.transform = `translate3d(${x * 18}%, ${y * 18}%, 0)`
    }
    const move = (nx: number, ny: number) => {
      x = Math.max(-1, Math.min(1, nx))
      y = Math.max(-1, Math.min(1, ny))
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null) return
      // Held upright in the hand the phone sits around 45° of pitch.
      move(event.gamma / 30, (event.beta - 45) / 30)
    }
    const host = layer.parentElement
    const onPointer = (event: PointerEvent) => {
      if (!host) return
      const box = host.getBoundingClientRect()
      move(((event.clientX - box.left) / box.width) * 2 - 1, ((event.clientY - box.top) / box.height) * 2 - 1)
    }
    window.addEventListener('deviceorientation', onOrientation)
    host?.addEventListener('pointermove', onPointer)
    return () => {
      window.removeEventListener('deviceorientation', onOrientation)
      host?.removeEventListener('pointermove', onPointer)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled, needsPermission, sensorOn])

  const askPermission = async () => {
    const request = orientationPermission()
    if (!request) return
    try {
      const answer = await request()
      if (answer === 'granted') {
        setNeedsPermission(false)
        setSensorOn(true)
      }
    } catch {
      // Not called from a tap, or refused: the finger still moves the sheen.
    }
  }

  return { layerRef, needsPermission: needsPermission && !prefersReducedMotion(), askPermission }
}

/** The card's photo frame: plain, gold leaf for the rare card, holographic for the legendary one. */
export function RarityFrame({ rarity, reveal, children }: { rarity: Rarity; reveal: boolean; children: ReactNode }) {
  const legendary = rarity === 'legendary'
  const { layerRef, needsPermission, askPermission } = useHolo(legendary)
  return (
    <div className="card-view__hero" data-rarity={rarity} data-reveal={reveal || undefined}>
      {children}
      {legendary ? <span ref={layerRef} className="holo" aria-hidden="true" /> : null}
      {legendary && needsPermission ? (
        <button type="button" className="holo__ask press" onClick={() => void askPermission()}>
          Inclina il telefono per i riflessi
        </button>
      ) : null}
    </div>
  )
}
