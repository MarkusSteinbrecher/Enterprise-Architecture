import { useEffect, useRef } from 'react'

/**
 * Archi's direct edit (#130): a name typed where the shape is drawn. A new
 * element opens one at once; F2 or a double-click opens one on a shape already
 * there. Enter or leaving the field commits, Escape keeps what was there. A
 * note's text has line breaks, so a note takes Enter as a new line and commits
 * on ⌘/Ctrl+Enter.
 *
 * Enter and Escape unmount the field, and a field removed while focused sends
 * no `blur` (seen in Chromium; journey 10 types a name, presses Escape, and
 * holds the model to the old one), so neither is followed by a second commit.
 */
export interface InlineNameProps {
  initial: string
  multiline: boolean
  /** Where the shape is on screen, relative to the canvas. */
  box: { left: number; top: number; width: number; height: number }
  label: string
  /** `key` for Enter, `blur` for leaving the field: only Enter hands focus on. */
  onCommit: (value: string, ended: 'key' | 'blur') => void
  onCancel: () => void
}

export function InlineName({
  initial,
  multiline,
  box,
  label,
  onCommit,
  onCancel,
}: InlineNameProps) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  const finish = (commit: boolean, value: string, ended: 'key' | 'blur' = 'key') => {
    if (commit) onCommit(value, ended)
    else onCancel()
  }
  const props = {
    ref,
    className: `view-inline${multiline ? ' view-inline--note' : ''}`,
    'aria-label': label,
    defaultValue: initial,
    style: {
      left: box.left,
      top: box.top,
      width: Math.max(box.width, 120),
      // Over the whole shape, so the name drawn beneath does not show through.
      height: Math.max(box.height, multiline ? 60 : 26),
    },
    // The canvas below must not take these presses as gestures, or its keys as edits.
    onPointerDown: (event: React.PointerEvent) => event.stopPropagation(),
    onDoubleClick: (event: React.MouseEvent) => event.stopPropagation(),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      event.stopPropagation()
      if (event.key === 'Escape') {
        event.preventDefault()
        finish(false, '')
      } else if (event.key === 'Enter' && (!multiline || event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        finish(true, event.currentTarget.value)
      }
    },
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      finish(true, event.currentTarget.value, 'blur'),
  }
  return multiline ? <textarea {...props} /> : <input {...props} />
}
