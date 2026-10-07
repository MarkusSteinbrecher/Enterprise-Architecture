import type { Folder } from '@/io/shared-folder/folder'

/**
 * A folder synced between machines, as OneDrive syncs a SharePoint library,
 * for the shared-folder tests (spec §12). Drive it with Vitest's fake timers.
 *
 * Each client has its own copy of the folder. Its writes land locally at once,
 * reach the cloud `delayMs / 2` later, and reach every other client `delayMs / 2`
 * after that. Two versions of one file meet as OneDrive meets them: a write that
 * reaches the cloud after another client changed that file, without having seen
 * the change, does not replace it. The cloud keeps the file it has and stores
 * the late write beside it as a conflict copy, `<stem>-<CLIENT><ext>`
 * (`Landscape-B.json`, `Landscape.json-B.lock`), and every client then
 * receives both. A delete that meets a change is dropped; the changed file wins.
 *
 * A client can go offline, which holds its uploads and its downloads until it
 * comes back, while its own reads and writes keep working locally: the offline
 * writer of spec §1.1. Faults make the next matching operation throw.
 */

type Op = 'list' | 'has' | 'read' | 'write' | 'remove'

interface Version {
  readonly version: number
  readonly writer: string
}

interface CloudFile {
  bytes: Uint8Array | null // null: deleted
  history: Version[]
}

interface Upload {
  readonly name: string
  readonly bytes: Uint8Array | null
  /** The newest version of the file this client had seen when it wrote. */
  readonly seen: number
}

interface Fault {
  readonly op: Op
  readonly name: string | undefined
  readonly message: string
  /** How many more times it fires; `Infinity` until cleared. */
  remaining: number
}

export class SyncWorld {
  readonly delayMs: number
  readonly #cloud = new Map<string, CloudFile>()
  readonly #clients = new Map<string, SyncedClient>()
  #counter = 0

  constructor({ delayMs }: { delayMs: number }) {
    this.delayMs = delayMs
  }

  /** The client called `name`, made on first use. The name is what OneDrive puts in its conflict copies. */
  client(name: string): SyncedClient {
    let client = this.#clients.get(name)
    if (!client) {
      client = new SyncedClient(name, this)
      this.#clients.set(name, client)
      for (const [file, entry] of this.#cloud) {
        if (entry.bytes) client.receive(file, entry.bytes, latest(entry))
      }
    }
    return client
  }

  /** The cloud's names, for asserting what OneDrive kept. */
  cloudNames(): string[] {
    return [...this.#cloud]
      .filter(([, entry]) => entry.bytes !== null)
      .map(([name]) => name)
      .sort()
  }

  cloudRead(name: string): Uint8Array | undefined {
    return this.#cloud.get(name)?.bytes ?? undefined
  }

  /** @internal An upload from `client` reaching the cloud. */
  arrive(client: SyncedClient, upload: Upload): void {
    const entry = this.#cloud.get(upload.name) ?? { bytes: null, history: [] }
    const unseen = entry.history.some((v) => v.version > upload.seen && v.writer !== client.name)
    if (!unseen || entry.bytes === null) {
      // Nothing it had not seen, or re-creating a deleted file: it lands.
      this.#store(upload.name, upload.bytes, client.name)
      return
    }
    // It meets a version it never saw.
    if (upload.bytes === null) return // a delete loses to the change
    this.#store(conflictName(upload.name, client.name), upload.bytes, client.name)
    // Its writer gets the kept version back under the name.
    this.#broadcast(upload.name)
  }

  #store(name: string, bytes: Uint8Array | null, writer: string): void {
    const entry = this.#cloud.get(name) ?? { bytes: null, history: [] }
    this.#counter += 1
    entry.bytes = bytes
    entry.history.push({ version: this.#counter, writer })
    this.#cloud.set(name, entry)
    this.#broadcast(name)
  }

  #broadcast(name: string): void {
    const entry = this.#cloud.get(name)!
    const bytes = entry.bytes
    const version = latest(entry)
    for (const client of this.#clients.values()) {
      client.download(name, bytes, version)
    }
  }

  /** @internal What a client missed while offline. */
  catchUp(client: SyncedClient): void {
    for (const [name, entry] of this.#cloud) {
      client.download(name, entry.bytes, latest(entry))
    }
  }
}

export class SyncedClient implements Folder {
  readonly name: string
  readonly #world: SyncWorld
  readonly #files = new Map<string, Uint8Array>()
  /** The newest cloud version of each file this client has applied or produced. */
  readonly #seen = new Map<string, number>()
  /** Uploads not yet arrived, per file: a download must not clobber them. */
  readonly #pending = new Map<string, number>()
  #offline = false
  #held: Array<() => void> = []
  /** Extra upload time per file, for a save still in flight (spec §1.1, case 3). */
  readonly #lag = new Map<string, number>()
  #faults: Fault[] = []

  constructor(name: string, world: SyncWorld) {
    this.name = name
    this.#world = world
  }

  // ── Folder ──────────────────────────────────────────────────────────────

  async list(): Promise<string[]> {
    this.#fault('list', undefined)
    return [...this.#files.keys()].sort()
  }

  async has(name: string): Promise<boolean> {
    this.#fault('has', name)
    return this.#files.has(name)
  }

  async read(name: string): Promise<Uint8Array | undefined> {
    this.#fault('read', name)
    const bytes = this.#files.get(name)
    return bytes ? bytes.slice() : undefined
  }

  async write(name: string, bytes: Uint8Array): Promise<void> {
    // A write that throws (a `close()` that rejects) leaves the file as it was.
    this.#fault('write', name)
    this.#files.set(name, bytes.slice())
    this.#upload({ name, bytes: bytes.slice(), seen: this.#seen.get(name) ?? 0 })
  }

  async remove(name: string): Promise<void> {
    this.#fault('remove', name)
    if (!this.#files.delete(name)) return
    this.#upload({ name, bytes: null, seen: this.#seen.get(name) ?? 0 })
  }

  // ── Test controls ───────────────────────────────────────────────────────

  /** Make the next `times` matching operations throw; a missing `name` matches any file. */
  fail(op: Op, { name, times = 1, message = `${op} failed` }: FaultOptions = {}): void {
    this.#faults.push({ op, name, message, remaining: times })
  }

  clearFaults(): void {
    this.#faults = []
  }

  get offline(): boolean {
    return this.#offline
  }

  /** Cut the client off from sync. Its local folder keeps working. */
  set offline(value: boolean) {
    this.#offline = value
    if (!value) {
      const held = this.#held
      this.#held = []
      for (const send of held) send()
      this.#world.catchUp(this)
    }
  }

  /** Make this client's uploads of `name` take `extraMs` longer, as a large file does. */
  lag(name: string, extraMs: number): void {
    this.#lag.set(name, extraMs)
  }

  /** Put a file in this client's folder without syncing it, as if it arrived from elsewhere. */
  plant(name: string, bytes: Uint8Array): void {
    this.#files.set(name, bytes.slice())
  }

  // ── Sync ────────────────────────────────────────────────────────────────

  /** @internal Initial contents for a client made after the cloud has some. */
  receive(name: string, bytes: Uint8Array, version: number): void {
    this.#files.set(name, bytes.slice())
    this.#seen.set(name, version)
  }

  /** @internal A cloud change on its way to this client. */
  download(name: string, bytes: Uint8Array | null, version: number): void {
    const apply = () => {
      // Offline, it is dropped; coming back online catches up with the cloud.
      if (this.#offline) return
      if ((this.#pending.get(name) ?? 0) > 0) return // its own write is still on the way
      if (version <= (this.#seen.get(name) ?? 0)) return
      this.#seen.set(name, version)
      if (bytes === null) this.#files.delete(name)
      else this.#files.set(name, bytes.slice())
    }
    setTimeout(apply, this.#world.delayMs / 2)
  }

  #upload(upload: Upload): void {
    this.#pending.set(upload.name, (this.#pending.get(upload.name) ?? 0) + 1)
    const send = () =>
      setTimeout(
        () => {
          this.#pending.set(upload.name, (this.#pending.get(upload.name) ?? 1) - 1)
          // The cloud's answer comes back as a download, like anyone else's.
          this.#world.arrive(this, upload)
        },
        this.#world.delayMs / 2 + (this.#lag.get(upload.name) ?? 0),
      )
    if (this.#offline) this.#held.push(send)
    else send()
  }

  #fault(op: Op, name: string | undefined): void {
    const fault = this.#faults.find(
      (f) => f.op === op && (f.name === undefined || f.name === name) && f.remaining > 0,
    )
    if (!fault) return
    fault.remaining -= 1
    throw new Error(fault.message)
  }
}

export interface FaultOptions {
  name?: string
  times?: number
  message?: string
}

function latest(entry: CloudFile): number {
  return entry.history[entry.history.length - 1]?.version ?? 0
}

/** OneDrive's name for the version that lost: `Landscape.json` → `Landscape-B.json`. */
function conflictName(name: string, client: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? `${name.slice(0, dot)}-${client}${name.slice(dot)}` : `${name}-${client}`
}
