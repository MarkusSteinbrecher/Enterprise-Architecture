import { createContext, useContext } from 'react'
import type { ExportFormat, ImportResult, SaveOutcome } from '@/io'

export interface FileWorkspaceContextValue {
  /** Name of the file this workspace is bound to, if any. */
  fileName: string | undefined
  /** True when saving writes back to the same file without a picker. */
  hasHandle: boolean
  /** False on Firefox and Safari, where saving is a download. */
  canPickFiles: boolean
  importing: boolean
  lastImport: ImportResult | undefined
  notice: string | undefined
  save: (format?: ExportFormat, options?: { reuseHandle?: boolean }) => Promise<SaveOutcome>
  openFile: () => Promise<void>
  importFile: (file: File) => Promise<void>
  loadDemo: () => void
  startImport: () => void
  cancelImport: () => void
  dismissNotice: () => void
}

export const FileWorkspaceContext = createContext<FileWorkspaceContextValue | null>(null)

export function useFileWorkspace(): FileWorkspaceContextValue {
  const value = useContext(FileWorkspaceContext)
  if (!value) throw new Error('useFileWorkspace must be used inside <FileWorkspaceProvider>')
  return value
}
