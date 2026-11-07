import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { IconClose } from './icons'

interface ToastProps {
  message: string
  actionLabel?: string
  onAction?: () => void
  /** Called once the exit transition has finished. */
  onClose: () => void
  autoHideMs?: number
}

// Slightly longer than the 400 ms exit transition, in case transitionend never fires.
const EXIT_FALLBACK_MS = 450

/** A single status message at the top of the screen. Render it inside <ToastRegion>. */
export function Toast({ message, actionLabel, onAction, onClose, autoHideMs }: ToastProps) {
  const [closing, setClosing] = useState(false)
  const closed = useRef(false)

  const finish = useCallback(() => {
    if (closed.current) return
    closed.current = true
    onClose()
  }, [onClose])

  const close = useCallback(() => setClosing(true), [])

  useEffect(() => {
    if (!autoHideMs) return
    const timer = window.setTimeout(close, autoHideMs)
    return () => window.clearTimeout(timer)
  }, [autoHideMs, close])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(finish, EXIT_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [closing, finish])

  return (
    <div
      className="toast"
      data-closing={closing || undefined}
      onTransitionEnd={(event) => {
        if (closing && event.target === event.currentTarget && event.propertyName === 'opacity') finish()
      }}
    >
      <p className="flex-1 leading-snug">{message}</p>
      {actionLabel && onAction ? (
        <button type="button" className="toast__action press" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
      <button type="button" className="round-btn press" onClick={close} aria-label="Chiudi il messaggio">
        <IconClose className="size-5" />
      </button>
    </div>
  )
}

/** Always mounted, so screen readers announce messages as they appear. */
export function ToastRegion({ children }: { children: ReactNode }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {children}
    </div>
  )
}
