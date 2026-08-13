import {
  DEFAULT_TAG_GROUP,
  SCHEMA_VERSION,
  completenessScore,
  modelHealth,
  type Element,
  type Relationship,
  type RelationshipType,
  type TagGroup,
  type ViewDefinition,
  type Workspace,
} from '@/model'
import {
  commandSubjects,
  describeCommand,
  invert,
  type Command,
  type CommandRecord,
} from './commands'
import { newId } from './ids'

/**
 * The in-memory model store (concept §5.1–5.2, ADR-002).
 *
 * The whole workspace lives in memory as Maps plus adjacency indexes; IndexedDB
 * is only crash-safe persistence and files are the real source of truth. At
 * 500–5,000 elements every referential query is faster and simpler as a Map
 * traversal than through a storage engine, so the store owns the graph and the
 * persistence layer just mirrors it.
 *
 * Three invariants hold at all times:
 *
 * 1. **Indexes are never stale.** Every mutation goes through `#applyCommand`,
 *    which updates the id maps and the adjacency indexes together.
 * 2. **Every mutation is a command.** Nothing writes to the maps directly, so
 *    undo/redo and the dirty counter cannot drift from what the user did.
 * 3. **Subscribers see a version, not a diff.** The store is mutable by design;
 *    React reads through `useModelSelector`, which recomputes on version change.
 */

export interface StoreListener {
  (): void
}

/** Adjacency, kept in sync on every mutation. */
interface Indexes {
  bySource: Map<string, Set<string>>
  byTarget: Map<string, Set<string>>
  byType: Map<RelationshipType, Set<string>>
  elementsByType: Map<string, Set<string>>
}

export interface ModelStoreOptions {
  /** Author recorded on history entries. */
  author?: string
  /** How many undo steps to keep. */
  historyLimit?: number
}

const DEFAULT_HISTORY_LIMIT = 200

export class ModelStore {
  // Assigned by `#adopt` from the constructor; the initialisers are here only
  // because TypeScript cannot see a definite assignment through a method call.
  #id = ''
  #name = ''
  #schemaVersion = SCHEMA_VERSION
  #elements = new Map<string, Element>()
  #relationships = new Map<string, Relationship>()
  #views: ViewDefinition[] = []
  #tagGroups: TagGroup[] = []
  #propertyTypes: Record<string, string> | undefined
  #indexes: Indexes = emptyIndexes()

  #undo: CommandRecord[] = []
  #redo: CommandRecord[] = []
  #history: CommandRecord[] = []
  #dirty = 0
  #version = 0
  #listeners = new Set<StoreListener>()
  #author: string
  #historyLimit: number

  constructor(workspace: Workspace, options: ModelStoreOptions = {}) {
    this.#author = options.author ?? 'you'
    this.#historyLimit = options.historyLimit ?? DEFAULT_HISTORY_LIMIT
    this.#adopt(workspace)
  }

  // ── Reading ────────────────────────────────────────────────────────────────

  get id(): string {
    return this.#id
  }

  get name(): string {
    return this.#name
  }

  /** Bumped on every change; the subscription key for React. */
  get version(): number {
    return this.#version
  }

  /** Unsaved-change count behind the header's `LOCAL · n UNSAVED` indicator. */
  get dirty(): number {
    return this.#dirty
  }

  get elementCount(): number {
    return this.#elements.size
  }

  get relationshipCount(): number {
    return this.#relationships.size
  }

  get views(): readonly ViewDefinition[] {
    return this.#views
  }

  get tagGroups(): readonly TagGroup[] {
    return this.#tagGroups
  }

  /** Applied commands, newest last. */
  get history(): readonly CommandRecord[] {
    return this.#history
  }

  get canUndo(): boolean {
    return this.#undo.length > 0
  }

  get canRedo(): boolean {
    return this.#redo.length > 0
  }

  element(id: string): Element | undefined {
    return this.#elements.get(id)
  }

  relationship(id: string): Relationship | undefined {
    return this.#relationships.get(id)
  }

  /** Live view of the element map — do not mutate. */
  elements(): IterableIterator<Element> {
    return this.#elements.values()
  }

  relationships(): IterableIterator<Relationship> {
    return this.#relationships.values()
  }

  elementList(): Element[] {
    return [...this.#elements.values()]
  }

  relationshipList(): Relationship[] {
    return [...this.#relationships.values()]
  }

  elementsOfType(type: string): Element[] {
    const ids = this.#indexes.elementsByType.get(type)
    if (!ids) return []
    return [...ids].flatMap((id) => {
      const element = this.#elements.get(id)
      return element ? [element] : []
    })
  }

  /** Relationships leaving `elementId`. */
  outgoing(elementId: string): Relationship[] {
    return this.#resolve(this.#indexes.bySource.get(elementId))
  }

  /** Relationships arriving at `elementId`. */
  incoming(elementId: string): Relationship[] {
    return this.#resolve(this.#indexes.byTarget.get(elementId))
  }

  /**
   * Every relationship touching `elementId`, in either direction — each once.
   *
   * A self-relation sits in both indexes, so the plain concatenation returned it
   * twice. That is not only a duplicated row on the fact sheet and a relation
   * count one too high: `removeElement` builds its cascade from this list, so
   * deleting the element recorded the same relationship twice and undo put back
   * two of it.
   */
  relationshipsOf(elementId: string): Relationship[] {
    const seen = new Set<string>()
    const out: Relationship[] = []
    for (const relationship of [...this.outgoing(elementId), ...this.incoming(elementId)]) {
      if (seen.has(relationship.id)) continue
      seen.add(relationship.id)
      out.push(relationship)
    }
    return out
  }

  relationshipsOfType(type: RelationshipType): Relationship[] {
    return this.#resolve(this.#indexes.byType.get(type))
  }

  /** Distinct elements one hop away, in either direction. */
  neighbours(elementId: string): Element[] {
    const seen = new Set<string>()
    const out: Element[] = []
    for (const relationship of this.relationshipsOf(elementId)) {
      const otherId = relationship.source === elementId ? relationship.target : relationship.source
      if (otherId === elementId || seen.has(otherId)) continue
      seen.add(otherId)
      const element = this.#elements.get(otherId)
      if (element) out.push(element)
    }
    return out
  }

  relationCount(elementId: string): number {
    const source = this.#indexes.bySource.get(elementId)
    const target = this.#indexes.byTarget.get(elementId)
    if (!source || !target) return (source?.size ?? 0) + (target?.size ?? 0)
    // A self-relation is in both sets and is still one relationship.
    let both = 0
    for (const id of source) if (target.has(id)) both += 1
    return source.size + target.size - both
  }

  completeness(elementId: string): number {
    const element = this.#elements.get(elementId)
    if (!element) return 0
    return completenessScore(element, { relationCount: this.relationCount(elementId) })
  }

  /** Mean element completeness — the nav footer's model health. */
  health(): number {
    return modelHealth(
      [...this.#elements.values()].map((element) =>
        completenessScore(element, { relationCount: this.relationCount(element.id) }),
      ),
    )
  }

  /** History entries touching one element, newest first — the fact sheet timeline. */
  historyFor(elementId: string): CommandRecord[] {
    return this.#history
      .filter((record) => commandSubjects(record.command).includes(elementId))
      .reverse()
  }

  /**
   * A plain, serialisable snapshot. Arrays are copies; the caller owns them.
   *
   * This is the model's only exit: SAVE FILE, Export and autosave all read it,
   * so a `Workspace` field missing here is gone from every file the product
   * writes. It mirrors `#adopt` field for field — change one, change both, and
   * `model-store.test.ts` fails if a round trip through the store loses
   * anything, which is the guard rather than either author's memory.
   */
  snapshot(): Workspace {
    return {
      id: this.#id,
      name: this.#name,
      schemaVersion: this.#schemaVersion,
      elements: [...this.#elements.values()],
      relationships: [...this.#relationships.values()],
      views: [...this.#views],
      tagGroups: [...this.#tagGroups],
      // Absent, not empty, when nothing is declared: canonical JSON omits the
      // key entirely, so a workspace without declared types keeps the bytes it
      // had before this field existed (ADR 0004).
      ...(this.#propertyTypes ? { propertyTypes: { ...this.#propertyTypes } } : {}),
    }
  }

  // ── Subscribing ────────────────────────────────────────────────────────────

  subscribe(listener: StoreListener): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  // ── Mutating ───────────────────────────────────────────────────────────────

  /**
   * Apply a command, record it for undo, and notify.
   * This is the only write path into the model.
   */
  dispatch(command: Command): CommandRecord {
    this.#applyCommand(command)
    const record: CommandRecord = {
      id: newId('cmd'),
      label: describeCommand(command),
      at: Date.now(),
      author: this.#author,
      command,
    }
    this.#undo.push(record)
    if (this.#undo.length > this.#historyLimit) this.#undo.shift()
    this.#redo = []
    this.#history.push(record)
    if (this.#history.length > this.#historyLimit) this.#history.shift()
    this.#dirty += 1
    this.#bump()
    return record
  }

  /** Run several mutations as one undoable step. */
  transaction(mutate: (draft: TransactionDraft) => void): CommandRecord | undefined {
    const collected: Command[] = []
    mutate({
      addElement: (element) => collected.push({ kind: 'add-element', element }),
      updateElement: (before, after) => collected.push({ kind: 'update-element', before, after }),
      removeElement: (element, cascaded) =>
        collected.push({ kind: 'remove-element', element, cascaded }),
      addRelationship: (relationship) => collected.push({ kind: 'add-relationship', relationship }),
      updateRelationship: (before, after) =>
        collected.push({ kind: 'update-relationship', before, after }),
      removeRelationship: (relationship) =>
        collected.push({ kind: 'remove-relationship', relationship }),
    })
    if (collected.length === 0) return undefined
    return this.dispatch(
      collected.length === 1 && collected[0]
        ? collected[0]
        : { kind: 'batch', commands: collected },
    )
  }

  addElement(element: Element): Element {
    this.dispatch({ kind: 'add-element', element })
    return element
  }

  /** Replace an element wholesale; `before` is captured for you. */
  updateElement(id: string, change: (element: Element) => Element): Element | undefined {
    const before = this.#elements.get(id)
    if (!before) return undefined
    const after = change(structuredClone(before))
    this.dispatch({ kind: 'update-element', before, after })
    return after
  }

  /** Deleting an element cascades to every relationship touching it. */
  removeElement(id: string): void {
    const element = this.#elements.get(id)
    if (!element) return
    const cascaded = this.relationshipsOf(id)
    this.dispatch({ kind: 'remove-element', element, cascaded })
  }

  addRelationship(relationship: Relationship): Relationship {
    this.dispatch({ kind: 'add-relationship', relationship })
    return relationship
  }

  updateRelationship(
    id: string,
    change: (relationship: Relationship) => Relationship,
  ): Relationship | undefined {
    const before = this.#relationships.get(id)
    if (!before) return undefined
    const after = change(structuredClone(before))
    this.dispatch({ kind: 'update-relationship', before, after })
    return after
  }

  removeRelationship(id: string): void {
    const relationship = this.#relationships.get(id)
    if (!relationship) return
    this.dispatch({ kind: 'remove-relationship', relationship })
  }

  rename(name: string): void {
    if (name === this.#name) return
    this.dispatch({ kind: 'rename-workspace', before: this.#name, after: name })
  }

  undo(): CommandRecord | undefined {
    const record = this.#undo.pop()
    if (!record) return undefined
    this.#applyCommand(invert(record.command))
    this.#redo.push(record)
    this.#dirty += 1
    this.#bump()
    return record
  }

  redo(): CommandRecord | undefined {
    const record = this.#redo.pop()
    if (!record) return undefined
    this.#applyCommand(record.command)
    this.#undo.push(record)
    this.#dirty += 1
    this.#bump()
    return record
  }

  /** Called after a successful file save: the model and the file now agree. */
  markSaved(): void {
    if (this.#dirty === 0) return
    this.#dirty = 0
    this.#bump()
  }

  /**
   * Replace the entire model — used by import, "load demo" and workspace switching.
   *
   * `markClean` says whether the new model already matches a file **on disk**, and
   * it has no default on purpose: of the three call sites this had when the
   * default existed, two took it and both were wrong, and the one that got it
   * right had to say so explicitly. A silent wrong default is now a compile error.
   *
   * Only a file we watched being written earns `true`. A snapshot out of
   * IndexedDB does not — browser storage is a cache, so a workspace that has only
   * ever lived there matches no file anywhere and the header must not say SAVED.
   *
   * The count restarts rather than accumulating: the old number counted edits to
   * a model that is no longer loaded, so carrying it forward would attribute
   * another workspace's unsaved work to this one.
   */
  replaceWorkspace(workspace: Workspace, { markClean }: { markClean: boolean }): void {
    this.#adopt(workspace)
    this.#undo = []
    this.#redo = []
    this.#history = []
    this.#dirty = markClean ? 0 : 1
    this.#bump()
  }

  /**
   * Make sure a tag name exists in a tag group, adding it to the first one if
   * not. Returns whether anything was added.
   *
   * `workspace.tagGroups` is the sole source of the inventory's tag facets and of
   * every tag's colour, so a tag written only onto an element is invisible to
   * both: tag twelve applications from their fact sheets and none of them can be
   * filtered by it, each chip painted in the neutral fallback.
   */
  registerTag(tag: string): boolean {
    const name = tag.trim()
    if (!name) return false
    if (this.#tagGroups.some((group) => group.tags.some((t) => t.name === name))) return false

    const [first, ...rest] = this.#tagGroups
    const target = first ?? { ...DEFAULT_TAG_GROUP, tags: [] }
    this.#tagGroups = [
      { ...target, tags: [...target.tags, { name, colourToken: 'var(--bd2)' }] },
      ...(first ? rest : this.#tagGroups),
    ]
    return true
  }

  saveView(view: ViewDefinition): void {
    const index = this.#views.findIndex((v) => v.id === view.id)
    if (index >= 0) this.#views[index] = view
    else this.#views.push(view)
    this.#dirty += 1
    this.#bump()
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  #resolve(ids: Set<string> | undefined): Relationship[] {
    if (!ids || ids.size === 0) return []
    const out: Relationship[] = []
    for (const id of ids) {
      const relationship = this.#relationships.get(id)
      if (relationship) out.push(relationship)
    }
    return out
  }

  /**
   * Take on a workspace's identity and all of its non-indexed content.
   *
   * The constructor and `replaceWorkspace` both need this. When they each kept
   * their own copy, a field added to `Workspace` had to be remembered in three
   * places — and `propertyTypes` (#37) was remembered in none of them, so the
   * exchange type declarations died between the importer and every file the
   * product writes (#48). One place to add a field, one place to mirror it.
   */
  #adopt(workspace: Workspace): void {
    this.#id = workspace.id
    this.#name = workspace.name
    this.#schemaVersion = workspace.schemaVersion || SCHEMA_VERSION
    this.#views = [...workspace.views]
    this.#tagGroups = [...workspace.tagGroups]
    this.#propertyTypes = workspace.propertyTypes ? { ...workspace.propertyTypes } : undefined
    this.#load(workspace)
  }

  #load(workspace: Workspace): void {
    this.#elements = new Map(workspace.elements.map((element) => [element.id, element]))
    this.#relationships = new Map(workspace.relationships.map((r) => [r.id, r]))
    this.#indexes = emptyIndexes()
    for (const element of this.#elements.values()) this.#indexElement(element)
    for (const relationship of this.#relationships.values()) this.#indexRelationship(relationship)
  }

  #bump(): void {
    this.#version += 1
    for (const listener of this.#listeners) listener()
  }

  #applyCommand(command: Command): void {
    switch (command.kind) {
      case 'add-element':
        this.#insertElement(command.element)
        break
      case 'update-element':
        this.#insertElement(command.after)
        break
      case 'remove-element':
        for (const relationship of command.cascaded) this.#deleteRelationship(relationship.id)
        this.#deleteElement(command.element.id)
        break
      case 'add-relationship':
        this.#insertRelationship(command.relationship)
        break
      case 'update-relationship':
        this.#deleteRelationship(command.before.id)
        this.#insertRelationship(command.after)
        break
      case 'remove-relationship':
        this.#deleteRelationship(command.relationship.id)
        break
      case 'rename-workspace':
        this.#name = command.after
        break
      case 'batch':
        for (const inner of command.commands) this.#applyCommand(inner)
        break
    }
  }

  #insertElement(element: Element): void {
    const existing = this.#elements.get(element.id)
    if (existing) this.#unindexElement(existing)
    this.#elements.set(element.id, element)
    this.#indexElement(element)
  }

  #deleteElement(id: string): void {
    const element = this.#elements.get(id)
    if (!element) return
    this.#unindexElement(element)
    this.#elements.delete(id)
  }

  #insertRelationship(relationship: Relationship): void {
    const existing = this.#relationships.get(relationship.id)
    if (existing) this.#unindexRelationship(existing)
    this.#relationships.set(relationship.id, relationship)
    this.#indexRelationship(relationship)
  }

  #deleteRelationship(id: string): void {
    const relationship = this.#relationships.get(id)
    if (!relationship) return
    this.#unindexRelationship(relationship)
    this.#relationships.delete(id)
  }

  #indexElement(element: Element): void {
    addTo(this.#indexes.elementsByType, element.type, element.id)
  }

  #unindexElement(element: Element): void {
    removeFrom(this.#indexes.elementsByType, element.type, element.id)
  }

  #indexRelationship(relationship: Relationship): void {
    addTo(this.#indexes.bySource, relationship.source, relationship.id)
    addTo(this.#indexes.byTarget, relationship.target, relationship.id)
    addTo(this.#indexes.byType, relationship.type, relationship.id)
  }

  #unindexRelationship(relationship: Relationship): void {
    removeFrom(this.#indexes.bySource, relationship.source, relationship.id)
    removeFrom(this.#indexes.byTarget, relationship.target, relationship.id)
    removeFrom(this.#indexes.byType, relationship.type, relationship.id)
  }
}

export interface TransactionDraft {
  addElement(element: Element): void
  updateElement(before: Element, after: Element): void
  removeElement(element: Element, cascaded: Relationship[]): void
  addRelationship(relationship: Relationship): void
  updateRelationship(before: Relationship, after: Relationship): void
  removeRelationship(relationship: Relationship): void
}

function emptyIndexes(): Indexes {
  return {
    bySource: new Map(),
    byTarget: new Map(),
    byType: new Map(),
    elementsByType: new Map(),
  }
}

function addTo<K>(index: Map<K, Set<string>>, key: K, id: string): void {
  const bucket = index.get(key)
  if (bucket) bucket.add(id)
  else index.set(key, new Set([id]))
}

function removeFrom<K>(index: Map<K, Set<string>>, key: K, id: string): void {
  const bucket = index.get(key)
  if (!bucket) return
  bucket.delete(id)
  if (bucket.size === 0) index.delete(key)
}
