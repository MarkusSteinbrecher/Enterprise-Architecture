import { useCallback, useMemo } from 'react'
import { useModelSelector, useModelStoreContext } from '@/store'

/**
 * The one owner of undo and redo in the chrome (#88): the header's buttons, the
 * palette's actions and the keyboard all go through this, so the read-only
 * guard lives in one place, as the save guard does in `useSaveWorkspace`.
 *
 * A reader tab has nothing to undo: its edits would not persist, and stepping
 * back the model the writer tab is editing would be stepping back someone
 * else's work. The keyboard binding outlives the shell, which a reader does not
 * see, so the guard cannot rely on the buttons being hidden.
 *
 * Undo and redo each move the save-state counter up one, as any edit does: the
 * counter counts changes since the last save, and an undo is one. Stepping back
 * to what the file holds still counts, because the store cannot know the file
 * is what it holds.
 */

export interface UndoRedo {
  /** What undo would revert (`describeCommand`); absent when it cannot. */
  undoLabel: string | undefined
  /** What redo would re-apply; absent when it cannot. */
  redoLabel: string | undefined
  undo: () => void
  redo: () => void
}

export function useUndoRedo(): UndoRedo {
  const { store, role } = useModelStoreContext()
  const readOnly = role === 'reader'
  const nextUndo = useModelSelector((s) => s.nextUndo?.label)
  const nextRedo = useModelSelector((s) => s.nextRedo?.label)

  const undo = useCallback(() => {
    if (!readOnly) store.undo()
  }, [store, readOnly])
  const redo = useCallback(() => {
    if (!readOnly) store.redo()
  }, [store, readOnly])

  return useMemo(
    () => ({
      undoLabel: readOnly ? undefined : nextUndo,
      redoLabel: readOnly ? undefined : nextRedo,
      undo,
      redo,
    }),
    [readOnly, nextUndo, nextRedo, undo, redo],
  )
}
