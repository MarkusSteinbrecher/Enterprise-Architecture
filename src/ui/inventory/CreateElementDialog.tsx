import { useEffect, useRef, useState } from 'react'
import { ELEMENT_TYPE_LIST, type ElementType } from '@/model'
import { DialogOverlay } from '@/ui/common/DialogOverlay'
import { useFocusTrap } from '@/ui/common/use-focus-trap'

/**
 * The minimal create dialog behind `+ Element`: a type and a name.
 *
 * Deliberately minimal — everything else about an element is maintained on its
 * fact sheet, and a long create form is how inventories fill up with
 * half-finished records.
 */

export interface CreateElementDialogProps {
  onCancel: () => void
  onCreate: (type: ElementType, name: string) => void
}

const CREATABLE = ELEMENT_TYPE_LIST.filter((meta) => meta.aspect !== 'connector')

export function CreateElementDialog({ onCancel, onCreate }: CreateElementDialogProps) {
  const [type, setType] = useState<ElementType>('ApplicationComponent')
  const [name, setName] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLFormElement>(null)

  // `aria-modal` promises that focus stays in the dialog and goes back to
  // `+ Element` on close (#157). The trap goes first, so the opener it records
  // is that button and not the name field the next effect focuses.
  useFocusTrap(dialogRef)
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onCreate(type, name.trim())
  }

  return (
    <DialogOverlay onDismiss={onCancel}>
      <form
        ref={dialogRef}
        className="dialog"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="New element"
      >
        <div className="dialog__title section-label">New element</div>

        <label className="dialog__field">
          <span className="dialog__label">Type</span>
          <select
            className="dialog__control"
            value={type}
            onChange={(event) => setType(event.target.value as ElementType)}
          >
            {CREATABLE.map((meta) => (
              <option key={meta.type} value={meta.type}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>

        <label className="dialog__field">
          <span className="dialog__label">Name</span>
          <input
            ref={nameRef}
            className="dialog__control"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Customer Web Portal"
          />
        </label>

        <div className="dialog__actions">
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={!name.trim()}>
            Create
          </button>
        </div>
      </form>
    </DialogOverlay>
  )
}
