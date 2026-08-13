import type { Workspace } from '@/model'
import { fromCanonicalJson } from './canonical-json'
import { importExchangeXml } from './exchange-format'
import {
  downloadText,
  serialiseWorkspace,
  workspaceFileName,
  type ExportFormat,
} from './file-download'
import { problem, type ImportResult } from './problems'

/**
 * Files are the source of truth (concept §5.2). This module is how a model
 * leaves the browser and comes back.
 *
 * On Chromium the File System Access API gives us a **persistent handle**: save
 * once into a git working copy and every later save writes to that same file,
 * with no picker and no downloads folder. That is what makes "commit the JSON to
 * git" a workflow rather than a chore. Firefox and Safari have no such API, so
 * they get `<input type="file">` and `<a download>`, and the app says which mode
 * it is in rather than pretending.
 */

// The File System Access API is not in TypeScript's DOM lib on every version we
// build against; this is the slice of it we use.
interface FilePickerType {
  description: string
  accept: Record<string, string[]>
}

interface FileSystemWritable {
  write(data: string): Promise<void>
  close(): Promise<void>
}

export interface SaveFileHandle {
  readonly name: string
  createWritable(): Promise<FileSystemWritable>
  getFile(): Promise<File>
}

interface FileSystemWindow {
  showSaveFilePicker?: (options: {
    suggestedName?: string
    types?: FilePickerType[]
  }) => Promise<SaveFileHandle>
  showOpenFilePicker?: (options: {
    multiple?: boolean
    types?: FilePickerType[]
  }) => Promise<SaveFileHandle[]>
}

const JSON_TYPE: FilePickerType = {
  description: 'Archipelago workspace (canonical JSON)',
  accept: { 'application/json': ['.json'] },
}

const XML_TYPE: FilePickerType = {
  description: 'ArchiMate Model Exchange Format',
  accept: { 'application/xml': ['.xml', '.archimate'] },
}

export function supportsFileSystemAccess(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as FileSystemWindow
  return typeof w.showSaveFilePicker === 'function' && typeof w.showOpenFilePicker === 'function'
}

export type SaveOutcome =
  | { kind: 'saved'; handle?: SaveFileHandle; fileName: string }
  | { kind: 'downloaded'; fileName: string }
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: string }

/**
 * Write the workspace to a file.
 *
 * Pass the handle from a previous save to write straight back to the same file.
 * A user who cancels the picker has not failed at anything, so cancellation is
 * its own outcome rather than an error.
 */
export async function saveWorkspaceToFile(
  workspace: Workspace,
  format: ExportFormat,
  existing?: SaveFileHandle,
): Promise<SaveOutcome> {
  const contents = serialiseWorkspace(workspace, format)
  const fileName = existing?.name ?? workspaceFileName(workspace, format)

  if (!supportsFileSystemAccess()) {
    downloadText(fileName, contents, format === 'json' ? 'application/json' : 'application/xml')
    return { kind: 'downloaded', fileName }
  }

  try {
    const handle =
      existing ??
      (await (window as unknown as FileSystemWindow).showSaveFilePicker!({
        suggestedName: fileName,
        types: [format === 'json' ? JSON_TYPE : XML_TYPE],
      }))
    const writable = await handle.createWritable()
    await writable.write(contents)
    await writable.close()
    return { kind: 'saved', handle, fileName: handle.name }
  } catch (error) {
    if (isAbort(error)) return { kind: 'cancelled' }
    return { kind: 'failed', message: error instanceof Error ? error.message : String(error) }
  }
}

export interface OpenedFile {
  result: ImportResult
  handle?: SaveFileHandle
  fileName: string
}

/** Open a file with the picker where it exists; returns undefined if cancelled. */
export async function openWorkspaceFile(): Promise<OpenedFile | undefined> {
  if (!supportsFileSystemAccess()) return undefined
  try {
    const [handle] = await (window as unknown as FileSystemWindow).showOpenFilePicker!({
      multiple: false,
      types: [JSON_TYPE, XML_TYPE],
    })
    if (!handle) return undefined
    const file = await handle.getFile()
    return { result: await readWorkspaceFile(file), handle, fileName: file.name }
  } catch (error) {
    if (isAbort(error)) return undefined
    return {
      result: {
        ok: false,
        problems: [
          problem(
            'error',
            'file.unreadable',
            `The file could not be read: ${error instanceof Error ? error.message : String(error)}`,
          ),
        ],
      },
      fileName: '',
    }
  }
}

/**
 * Parse a file the user handed us, choosing the reader by extension and falling
 * back to sniffing the first non-whitespace character — a `.txt` that starts
 * with `<` is still an exchange file, and refusing it would be pedantry.
 */
export async function readWorkspaceFile(file: File): Promise<ImportResult> {
  const text = await file.text()
  const name = file.name.toLowerCase()

  if (name.endsWith('.json')) return fromCanonicalJson(text, file.name)
  if (name.endsWith('.xml') || name.endsWith('.archimate'))
    return importExchangeXml(text, file.name)

  const first = text.trimStart()[0]
  if (first === '<') return importExchangeXml(text, file.name)
  if (first === '{') return fromCanonicalJson(text, file.name)

  return {
    ok: false,
    problems: [
      problem(
        'error',
        'file.unrecognised',
        `“${file.name}” is neither canonical JSON nor ArchiMate exchange XML.`,
        { file: file.name },
      ),
    ],
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
