/**
 * A stand-in for the browser's `FileSystemDirectoryHandle`, for jsdom, which
 * has none. It covers the slice `browserFolder` and the folder screen use. It
 * tests the protocol between them and the API, not the browser: the journey in
 * `tests/e2e/shared-folder.spec.ts` runs the same code against real handles.
 */
export class FakeDirectoryHandle {
  readonly kind = 'directory'
  readonly name: string
  readonly files = new Map<string, Uint8Array>()
  permission: 'granted' | 'prompt' | 'denied' = 'granted'
  /** What `requestPermission` answers; `undefined` keeps `permission`. */
  answer: 'granted' | 'denied' | undefined = 'granted'
  requests = 0
  /**
   * Make the next `close()` of this file reject, as the sync client holding a
   * file does on Windows. Named, so a heartbeat writing the lock in between
   * does not take the failure meant for the model.
   */
  rejectNextClose: string | undefined = undefined

  constructor(name: string, files: Record<string, string> = {}) {
    this.name = name
    for (const [file, text] of Object.entries(files)) {
      this.files.set(file, new TextEncoder().encode(text))
    }
  }

  async queryPermission(): Promise<string> {
    return this.permission
  }

  async requestPermission(): Promise<string> {
    this.requests += 1
    if (this.answer) this.permission = this.answer
    return this.permission
  }

  async isSameEntry(other: unknown): Promise<boolean> {
    return other === this
  }

  async *entries(): AsyncGenerator<[string, { kind: 'file'; name: string }]> {
    for (const name of [...this.files.keys()]) yield [name, { kind: 'file', name }]
  }

  async getFileHandle(name: string, { create = false } = {}) {
    if (!this.files.has(name)) {
      if (!create) throw new DOMException(`${name} not found`, 'NotFoundError')
      this.files.set(name, new Uint8Array())
    }
    return {
      kind: 'file' as const,
      name,
      getFile: async () => {
        const bytes = this.files.get(name)
        if (!bytes) throw new DOMException(`${name} not found`, 'NotFoundError')
        // jsdom's File has no arrayBuffer(); the browser's does, and the adapter uses it.
        return { name, arrayBuffer: async () => bytes.slice().buffer }
      },
      createWritable: async () => {
        let pending: Uint8Array | undefined
        return {
          write: async (data: Uint8Array) => {
            pending = data.slice()
          },
          close: async () => {
            if (this.rejectNextClose === name) {
              this.rejectNextClose = undefined
              throw new DOMException('The file is in use', 'NoModificationAllowedError')
            }
            if (pending) this.files.set(name, pending)
          },
          abort: async () => {
            pending = undefined
          },
        }
      },
    }
  }

  async removeEntry(name: string): Promise<void> {
    if (!this.files.delete(name)) throw new DOMException(`${name} not found`, 'NotFoundError')
  }

  /** As the real handle's type, for the code under test. */
  get handle(): FileSystemDirectoryHandle {
    return this as unknown as FileSystemDirectoryHandle
  }
}
