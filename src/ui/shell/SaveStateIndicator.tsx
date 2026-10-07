import { useModelSelector, useModelStoreContext } from '@/store'
import { useFileWorkspace } from '@/ui/files/context'

/**
 * The save-state indicator (handoff "Global chrome"; UI spec §3.5).
 *
 * The design brief calls this a core trust differentiator, and the shape of it is
 * the argument: a permanent header element, calm, never modal. Browser storage
 * can be evicted, so the user is told where their model lives — once, quietly,
 * always visible — rather than being nagged by a toast.
 */

export interface SaveStateIndicatorProps {
  onSaveFile: () => void
  disabled?: boolean
  /** Tooltip for the SAVE FILE action — says where the save will go. */
  title?: string
}

export function SaveStateIndicator({
  onSaveFile,
  disabled = false,
  title = 'Save the model to a file',
}: SaveStateIndicatorProps) {
  const dirty = useModelSelector((store) => store.dirty)
  const { tabRole } = useModelStoreContext()
  const shared = useFileWorkspace().shared.shared

  // A file seen to change under this tab is not "saved", whatever the counter
  // says: the save it counted may now sit in a conflict copy (spec §8.2).
  const diverged = shared?.diverged === true
  const label = diverged
    ? 'FILE CHANGED ON DISK'
    : dirty === 0
      ? 'LOCAL · SAVED'
      : `LOCAL · ${dirty} UNSAVED`
  // The count means "no file holds this", so the tooltip says that rather than
  // the vaguer "unsaved" — and says why downloading does not clear it, which
  // otherwise reads as the indicator being stuck.
  const tooltip =
    tabRole === 'reader'
      ? 'Another tab is editing this model. This tab is read-only until you take over.'
      : diverged
        ? `${shared?.model} changed on disk since this tab last read or wrote it. Nothing here is saved to it until you choose: save as copy, reload, or overwrite.`
        : dirty === 0
          ? 'Model lives in this browser. Export to a file to make it durable.'
          : `${dirty} change${dirty === 1 ? '' : 's'} no file holds. A download cannot tell this tab whether it reached disk, so the count stands until saving can confirm it.`

  return (
    <div className="save-state" title={tooltip}>
      <span className="save-state__dot" aria-hidden="true" />
      <span className="save-state__label">{label}</span>
      <button
        type="button"
        className="save-state__action"
        onClick={onSaveFile}
        disabled={disabled}
        title={title}
      >
        SAVE FILE
      </button>
    </div>
  )
}
