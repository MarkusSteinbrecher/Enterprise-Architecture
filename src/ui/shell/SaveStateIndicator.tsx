import { useModelSelector, useModelStoreContext } from '@/store'

/**
 * The save-state indicator (handoff "Global chrome"; UI spec §3.5).
 *
 * The design brief calls this a core trust differentiator, and the shape of it is
 * the argument: a permanent header element, calm, never modal. Browser storage
 * can be evicted, so the user is told where their model lives — once, quietly,
 * always visible — rather than being nagged by a toast.
 */

export interface SaveStateIndicatorProps {
  /** Save the model to a file. The real File System Access flow lands in #11. */
  onSaveFile: () => void
  disabled?: boolean
}

export function SaveStateIndicator({ onSaveFile, disabled = false }: SaveStateIndicatorProps) {
  const dirty = useModelSelector((store) => store.dirty)
  const { role } = useModelStoreContext()

  const label = dirty === 0 ? 'LOCAL · SAVED' : `LOCAL · ${dirty} UNSAVED`
  const tooltip =
    role === 'reader'
      ? 'Another tab is editing this model. This tab is read-only until you take over.'
      : 'Model lives in this browser. Export to a file to make it durable.'

  return (
    <div className="save-state" title={tooltip}>
      <span className="save-state__dot" aria-hidden="true" />
      <span className="save-state__label">{label}</span>
      <button
        type="button"
        className="save-state__action"
        onClick={onSaveFile}
        disabled={disabled}
        title="Save the model to a file"
      >
        SAVE FILE
      </button>
    </div>
  )
}
