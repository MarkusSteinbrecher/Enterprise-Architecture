import type { ReactNode } from 'react'

/**
 * The backdrop of every modal: a press on it, outside the dialog, dismisses
 * the dialog (#157).
 *
 * The press's own default runs after `onDismiss`. It focuses what is under the
 * pointer, and by then the overlay is gone and nothing focusable is there, so
 * focus lands on `<body>`, after the focus trap has already put it back on the
 * opener. The canvas then stops taking keys, and a field the dismissal just
 * focused blurs and commits (#156). Preventing that default keeps whatever
 * focus the dismissal chose.
 *
 * Each modal used to carry its own copy of this handler, and none of them
 * prevented the default. The lint rule in `eslint.config.js` keeps the overlay
 * classes in this file, so the next modal has to use this component.
 */
export function DialogOverlay({
  onDismiss,
  variant = 'dialog',
  children,
}: {
  onDismiss: () => void
  /** The command palette's backdrop is styled apart from the dialogs'. */
  variant?: 'dialog' | 'palette'
  children: ReactNode
}) {
  return (
    <div
      className={variant === 'palette' ? 'palette-overlay' : 'dialog-overlay'}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return
        event.preventDefault()
        onDismiss()
      }}
    >
      {children}
    </div>
  )
}
