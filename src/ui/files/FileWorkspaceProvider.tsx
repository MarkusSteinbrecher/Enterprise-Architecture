import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  loadDemoWorkspace,
  openWorkspaceFile,
  readWorkspaceFile,
  saveWorkspaceToFile,
  supportsFileSystemAccess,
  type ExportFormat,
  type ImportResult,
  type SaveFileHandle,
} from '@/io'
import { useModelStoreContext } from '@/store'
import { FileWorkspaceContext, type FileWorkspaceContextValue } from './context'

/**
 * Wires files to the model (issue #11).
 *
 * The invariant this exists to hold: **the dirty counter means "differs from the
 * file"**. It clears on a successful save and only then; a cancelled picker, a
 * failed write or a download the user never confirmed all leave it alone.
 * Anything looser and the header's promise stops being true.
 */

export function FileWorkspaceProvider({ children }: { children: ReactNode }) {
  const { store, role, flush } = useModelStoreContext()
  const handleRef = useRef<SaveFileHandle | undefined>(undefined)
  const [fileName, setFileName] = useState<string | undefined>(undefined)
  const [importing, setImporting] = useState(false)
  const [lastImport, setLastImport] = useState<ImportResult | undefined>(undefined)
  const [notice, setNotice] = useState<string | undefined>(undefined)

  const save = useCallback(
    async (format: ExportFormat = 'json', { reuseHandle = true } = {}) => {
      const outcome = await saveWorkspaceToFile(
        store.snapshot(),
        format,
        reuseHandle ? handleRef.current : undefined,
      )
      if (outcome.kind === 'saved') {
        // The one write this app can watch finish: `saveWorkspaceToFile`
        // resolves `saved` only after `writable.close()`, so the file is on
        // disk and the counter has earned the right to go to zero.
        handleRef.current = outcome.handle
        setFileName(outcome.fileName)
        store.markSaved()
        setNotice(`Saved to ${outcome.fileName}`)
      } else if (outcome.kind === 'downloaded') {
        // Deliberately does **not** mark clean. This is the Blob-and-anchor
        // fallback, which reports that a download was *offered* — a user with
        // "always ask where to save" on who presses Cancel has no file, and
        // `markSaved()` has no inverse, so a wrong SAVED here is permanent.
        // The notice says what actually happened instead.
        setFileName(outcome.fileName)
        setNotice(`Downloaded ${outcome.fileName} — still unsaved to a file you chose`)
      } else if (outcome.kind === 'failed') {
        setNotice(`Could not save: ${outcome.message}`)
      }
      return outcome
    },
    [store],
  )

  const applyImport = useCallback(
    (result: ImportResult, name: string, handle?: SaveFileHandle) => {
      setLastImport(result)
      if (!result.workspace) return
      // An imported model does not match any file we could write back to unless
      // we opened it through a handle, so the handle is only kept in that case.
      handleRef.current = handle
      setFileName(name || undefined)
      store.replaceWorkspace(result.workspace, { markClean: Boolean(handle) })
      if (result.problems.length === 0) setImporting(false)
    },
    [store],
  )

  const openFile = useCallback(async () => {
    const opened = await openWorkspaceFile()
    if (!opened) return
    applyImport(opened.result, opened.fileName, opened.handle)
  }, [applyImport])

  const importFile = useCallback(
    async (file: File) => {
      applyImport(await readWorkspaceFile(file), file.name)
    },
    [applyImport],
  )

  const loadDemo = useCallback(() => {
    store.replaceWorkspace(loadDemoWorkspace(), { markClean: false })
    handleRef.current = undefined
    setFileName(undefined)
    setImporting(false)
  }, [store])

  // ⌘S / Ctrl+S saves, as it does in every other tool that owns a file.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (role === 'writer') void save('json')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [save, role])

  // Only warn about leaving when there is something to lose.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (store.dirty === 0) return
      void flush()
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [store, flush])

  const value = useMemo<FileWorkspaceContextValue>(
    () => ({
      fileName,
      hasHandle: Boolean(handleRef.current),
      canPickFiles: supportsFileSystemAccess(),
      importing,
      lastImport,
      notice,
      save,
      openFile,
      importFile,
      loadDemo,
      startImport: () => {
        setLastImport(undefined)
        setImporting(true)
      },
      cancelImport: () => setImporting(false),
      dismissNotice: () => setNotice(undefined),
    }),
    [fileName, importing, lastImport, notice, save, openFile, importFile, loadDemo],
  )

  return <FileWorkspaceContext.Provider value={value}>{children}</FileWorkspaceContext.Provider>
}
