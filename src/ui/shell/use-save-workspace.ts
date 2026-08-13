import { useMemo } from 'react'
import { downloadWorkspace, type ExportFormat } from '@/io'
import { useModelStoreContext } from '@/store'

/**
 * The one place the chrome turns the model into a file.
 *
 * It exists as a single owner rather than two call sites because the two things
 * that have to be got right here are easy to get wrong separately: the read-only
 * guard, and whether the save-state counter may be cleared. Anything that saves —
 * the header, and the command palette in #7 — goes through this, so there is one
 * place to be wrong rather than one per surface.
 *
 * **Why nothing calls `markSaved()` yet.** `downloadWorkspace` builds a Blob URL
 * and clicks an invisible anchor. That tells us a download was *offered*; it
 * cannot tell us a file was written. A user with "always ask where to save" on
 * who presses Cancel has no file, and clearing the counter there would replace
 * "37 unsaved" with "SAVED" for a model that exists nowhere but this browser —
 * and `markSaved()` has no inverse, so the number never comes back. Browser
 * storage is a cache (Safari evicts it after seven days), so that claim is the
 * one this product cannot make falsely: an indicator that overstates safety is
 * worse than none.
 *
 * The counter therefore stands until a write we can watch finish clears it. That
 * write is the File System Access handle in the file workflow (#11), which
 * resolves only after `writable.close()` and knows the difference between saved,
 * cancelled and failed. Until then SAVE FILE downloads and says so.
 */

export type SaveOutcome = { kind: 'downloaded'; fileName: string } | { kind: 'read-only' }

export interface SaveWorkspaceActions {
  /** The header's SAVE FILE action: canonical JSON, writer tabs only. */
  saveFile: () => SaveOutcome
  /**
   * Export to exchange XML. A reader may export — it writes nothing and takes
   * nothing over — and the format is lossy anyway, so it could never clear the
   * counter even once a save can.
   */
  exportXml: () => SaveOutcome
}

export function useSaveWorkspace(): SaveWorkspaceActions {
  const { store, role } = useModelStoreContext()

  return useMemo(() => {
    const download = (format: ExportFormat): SaveOutcome => ({
      kind: 'downloaded',
      fileName: downloadWorkspace(store.snapshot(), format),
    })

    return {
      saveFile: () => (role === 'reader' ? { kind: 'read-only' } : download('json')),
      exportXml: () => download('xml'),
    }
  }, [store, role])
}
