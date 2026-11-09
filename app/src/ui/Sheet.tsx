import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Bottom sheet, drawn in a layer of its own at the end of <body> (not a native <dialog>: iPhone
 * Safari mishandled taps inside the top-layer dialog). While it is open the app behind it is inert,
 * focus moves into the sheet, and Escape, a tap on the dimmed backdrop or, where the browser offers
 * one, the Back gesture (CloseWatcher) close it. Motion lives in .sheet in styles.css (animate skill,
 * "Drawer / sheet"); the sheet stays mounted while it slides away.
 */

const EXIT_MS = 500
let openSheets = 0

function setAppInert(inert: boolean) {
  const root = document.getElementById('root')
  if (root) root.inert = inert
}

interface CloseWatcherLike {
  onclose: (() => void) | null
  destroy: () => void
}

export function Sheet({
  open,
  labelledBy,
  onClose,
  tall = false,
  children,
}: {
  open: boolean
  labelledBy: string
  onClose: () => void
  /** Use almost the whole screen (for choices with photos). */
  tall?: boolean
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Mount closed, then open on the next frame so the slide-in transition runs; unmount after the exit.
  useEffect(() => {
    if (open) {
      setMounted(true)
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(frame)
    }
    setShown(false)
    const timer = setTimeout(() => setMounted(false), EXIT_MS)
    return () => clearTimeout(timer)
  }, [open])

  // Inert background, focus, Escape and Back while open.
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    openSheets++
    setAppInert(true)
    const focus = requestAnimationFrame(() => panelRef.current?.focus())
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    const Watcher = (globalThis as { CloseWatcher?: new () => CloseWatcherLike }).CloseWatcher
    let watcher: CloseWatcherLike | null = null
    try {
      if (Watcher) {
        // Handles both Escape and the Android Back gesture.
        watcher = new Watcher()
        watcher.onclose = () => closeRef.current()
      }
    } catch {
      watcher = null
    }
    if (!watcher) document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(focus)
      document.removeEventListener('keydown', onKey)
      watcher?.destroy()
      openSheets--
      if (openSheets === 0) setAppInert(false)
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [open])

  if (!mounted) return null
  return createPortal(
    <div className="sheet-layer" data-shown={shown || undefined}>
      <div className="sheet-backdrop" aria-hidden="true" onClick={() => closeRef.current()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="sheet"
        data-tall={tall || undefined}
      >
        <div className="sheet__body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
