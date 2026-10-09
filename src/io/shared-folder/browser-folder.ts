import type { Folder } from './folder'

/**
 * A `Folder` over the browser's `FileSystemDirectoryHandle` (spec §4).
 *
 * Only Chromium browsers can hand out a directory. Firefox and Safari keep the
 * download workflow, and the app says why (`supportsDirectoryAccess`).
 *
 * `createWritable()` writes to a swap file that `close()` moves into place, so
 * a write is atomic on this machine. On Windows the sync client can hold the
 * file open during upload and `close()` rejects: that rejection is passed on,
 * and the protocol treats it as a failed write, never a clean one.
 */

// Parts of the File System Access API that TypeScript's DOM library leaves out
// at the version we build against: iteration and permissions.
type PermissionState = 'granted' | 'denied' | 'prompt'

interface PermissionHandle {
  queryPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionState>
}

interface IterableDirectory {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
}

interface DirectoryWindow {
  showDirectoryPicker?: (options: { mode: 'readwrite' }) => Promise<FileSystemDirectoryHandle>
}

export function supportsDirectoryAccess(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as DirectoryWindow).showDirectoryPicker === 'function'
  )
}

/** Ask the user for a folder. `undefined` when they cancel. */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    return await (window as unknown as DirectoryWindow).showDirectoryPicker!({ mode: 'readwrite' })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return undefined
    throw error
  }
}

/**
 * Whether the app may write into the folder. A handle kept from an earlier
 * visit is not assumed to still be granted. `request` asks the user, and the
 * browser only allows that in answer to a click.
 */
export async function folderPermission(
  handle: FileSystemDirectoryHandle,
  { request = false } = {},
): Promise<PermissionState> {
  const h = handle as unknown as PermissionHandle
  const descriptor = { mode: 'readwrite' } as const
  const state = (await h.queryPermission?.(descriptor)) ?? 'granted'
  if (state === 'granted' || !request) return state
  return (await h.requestPermission?.(descriptor)) ?? state
}

export function browserFolder(handle: FileSystemDirectoryHandle): Folder {
  const file = async (name: string): Promise<FileSystemFileHandle | undefined> => {
    try {
      return await handle.getFileHandle(name)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') return undefined
      throw error
    }
  }

  return {
    async list() {
      const names: string[] = []
      for await (const [name, entry] of (handle as unknown as IterableDirectory).entries()) {
        if (entry.kind === 'file') names.push(name)
      }
      return names.sort()
    },

    async has(name) {
      return (await file(name)) !== undefined
    },

    async read(name) {
      const found = await file(name)
      if (!found) return undefined
      return new Uint8Array(await (await found.getFile()).arrayBuffer())
    },

    async write(name, bytes) {
      const target = await handle.getFileHandle(name, { create: true })
      const writable = await target.createWritable()
      try {
        await writable.write(bytes)
      } catch (error) {
        await writable.abort().catch(() => {})
        throw error
      }
      await writable.close()
    },

    async remove(name) {
      try {
        await handle.removeEntry(name)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotFoundError') return
        throw error
      }
    },
  }
}
