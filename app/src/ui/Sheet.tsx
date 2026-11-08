import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Bottom sheet on a native modal <dialog>: the page behind it is inert, focus stays inside and
 * Escape (or Android's Back gesture on a dialog) closes it. It opens when mounted with open=true.
 * Motion lives in .sheet in styles.css (animate skill, "Drawer / sheet").
 */
export function Sheet({
  open,
  labelledBy,
  onClose,
  children,
}: {
  open: boolean
  labelledBy: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // Focus the sheet itself, not its first choice: nothing should look picked already.
      dialog.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      tabIndex={-1}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // A tap on the dimmed backdrop lands on the <dialog> itself, outside its content box.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sheet__body">
        {children}
      </div>
    </dialog>
  )
}
