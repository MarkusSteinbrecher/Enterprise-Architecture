import { listed, isRawNode, type RawNode } from './exchange-xml'
import { problem, type ImportProblem } from './problems'

/**
 * What a reader consumed, so that what it did not is reported (#101).
 *
 * A reader ignores by omission: an attribute it never looks at leaves nothing
 * behind for a test to see, so a test of what it reports cannot catch what it
 * never read. The #98 review found nine silent drops behind a test that pinned
 * every code the reader reported. So the readers keep a ledger instead: each
 * attribute and child element is marked when its value lands in the model or in
 * a problem, and after the read, `unread` walks the parsed file and returns every
 * key that was neither marked nor deliberately ignored.
 *
 * Marking is separate from reading on purpose. A key the reader merely looks at
 * — to collect ids, to find the dominant font, to decide and then discard — is
 * still unread. Mark a key where its value is stored or reported, not where it
 * is fetched.
 */

/** How a key's value was consumed, which decides what `unread` still checks under it. */
type Mode =
  /** Each child element under the key is checked in turn. */
  | 'each'
  /** Only the first is read; a second is reported. */
  | 'first'
  /** Text content: only the first is read, and a node's `#text` is consumed with it. */
  | 'text'
  /** The value and everything under it are accounted for (read whole, or reported whole). */
  | 'whole'

const PRECEDENCE: Record<Mode, number> = { first: 0, text: 0, each: 1, whole: 2 }

/** A key a reader deliberately does not read, and why. Lives in the reader, not here. */
export interface Ignored {
  /** The local name of the element carrying the key, or `*` for any. */
  at: string
  /** The key, `@name` for an attribute; a trailing `*` matches a prefix. */
  key: string
  reason: string
}

export interface Unread {
  /** Element names from the model root down to the node carrying `what`. */
  path: readonly string[]
  node: RawNode
  /** The nearest id at or above the node, for the report to name. */
  subject: string | undefined
  /** What was not read, ready for a message: `the attribute “x”`, `<x>`, `text`. */
  what: string
}

export class Ledger {
  private readonly marks = new WeakMap<RawNode, Map<string, Mode>>()
  private readonly accounted = new WeakSet<RawNode>()
  private readonly losses = new Map<RawNode, string[]>()

  /** These keys were read; child elements under them are checked in turn. */
  use(raw: RawNode, ...keys: string[]): void {
    for (const key of keys) this.mark(raw, key, 'each')
  }

  /** Only the first child element under the key is read; a second is reported. */
  first(raw: RawNode, key: string): void {
    this.mark(raw, key, 'first')
  }

  /** The key's text was read (the first, if it repeats), whether bare or with attributes. */
  text(raw: RawNode, key: string): void {
    this.mark(raw, key, 'text')
    const value = raw[key]
    const head: unknown = Array.isArray(value) ? value[0] : value
    if (isRawNode(head)) this.mark(head, '#text', 'whole')
  }

  /** The key and everything under it are accounted for: read whole, or reported whole. */
  whole(raw: RawNode, ...keys: string[]): void {
    for (const key of keys) this.mark(raw, key, 'whole')
  }

  /**
   * The node was skipped and reported as skipped, so nothing in it is reported
   * again (#106 review). Keys in `except` are still walked: a skipped shape's
   * nested shapes are kept, and their content is theirs to account for.
   */
  skip(raw: unknown, except: readonly string[] = []): void {
    if (!isRawNode(raw)) return
    if (!except.length) {
      this.accounted.add(raw)
      return
    }
    for (const key of Object.keys(raw)) this.mark(raw, key, except.includes(key) ? 'each' : 'whole')
  }

  /**
   * Content the reader recognised and could not hold, named its own way — a
   * feature by its name rather than as an anonymous `<feature>`. The node it
   * came from is reported as its carrier.
   */
  lose(raw: RawNode, what: string): void {
    const found = this.losses.get(raw)
    if (found) found.push(what)
    else this.losses.set(raw, [what])
  }

  /** Was this key marked read? For a definition that is read only when something uses it. */
  isUsed(raw: RawNode, key: string): boolean {
    return this.accounted.has(raw) || this.marks.get(raw)?.has(key) === true
  }

  /** Everything under `root` that was neither marked, skipped nor ignored. */
  unread(
    root: RawNode,
    rootName: string,
    options: {
      ignored: readonly Ignored[]
      /**
       * The node's own id. `undefined` borrows the nearest one above, as a
       * shape's bounds do; `null` is an object in its own right with no id.
       */
      subjectOf: (node: RawNode, at: string) => string | undefined | null
    },
  ): Unread[] {
    const out: Unread[] = []
    const visit = (node: RawNode, path: readonly string[], above: string | undefined) => {
      if (this.accounted.has(node)) return
      const at = path[path.length - 1] ?? ''
      const own = options.subjectOf(node, at)
      const subject = own === null ? undefined : (own ?? above)
      for (const what of this.losses.get(node) ?? []) out.push({ path, node, subject, what })
      const marks = this.marks.get(node)
      for (const [key, value] of Object.entries(node)) {
        if (key === '#text' && isBlank(value)) continue
        if (isIgnored(options.ignored, at, key)) continue
        const mode = marks?.get(key)
        if (mode === undefined) {
          out.push({ path, node, subject, what: describeKey(key) })
          continue
        }
        if (mode === 'whole' || key.startsWith('@') || key === '#text') continue
        let items: unknown[] = Array.isArray(value) ? value : [value]
        if ((mode === 'first' || mode === 'text') && items.length > 1) {
          out.push({ path, node, subject, what: `a second <${key}>` })
          items = items.slice(0, 1)
        }
        for (const item of items) {
          if (isRawNode(item)) visit(item, [...path, key], subject)
          else if (mode !== 'text' && !isBlank(item)) {
            out.push({ path, node, subject, what: `text in <${key}>` })
          }
        }
      }
    }
    visit(root, [rootName], undefined)
    return out
  }

  private mark(raw: RawNode, key: string, mode: Mode): void {
    let marks = this.marks.get(raw)
    if (!marks) this.marks.set(raw, (marks = new Map()))
    const had = marks.get(key)
    if (had === undefined || PRECEDENCE[mode] > PRECEDENCE[had]) marks.set(key, mode)
  }
}

/** What a reader calls the thing carrying unread content, in the singular and the plural. */
export interface Noun {
  one: string
  many: string
}

/**
 * One `import.content-unread` warning per kind of carrier and kind of content,
 * naming the carriers by id, in the order they were found.
 */
export function reportUnread(
  unread: readonly Unread[],
  label: (path: readonly string[], node: RawNode) => Noun,
  where: { file?: string },
): ImportProblem[] {
  // Nested maps, not a joined key: `what` holds names out of the file (CLAUDE.md).
  const groups = new Map<string, { noun: Noun; byWhat: Map<string, (string | undefined)[]> }>()
  for (const item of unread) {
    const noun = label(item.path, item.node)
    let group = groups.get(noun.one)
    if (!group) groups.set(noun.one, (group = { noun, byWhat: new Map() }))
    const subjects = group.byWhat.get(item.what)
    if (subjects) subjects.push(item.subject)
    else group.byWhat.set(item.what, [item.subject])
  }
  const problems: ImportProblem[] = []
  for (const { noun, byWhat } of groups.values()) {
    for (const [what, subjects] of byWhat) {
      const n = subjects.length
      const ids = [...new Set(subjects.filter((s): s is string => s !== undefined))]
      const definite = noun.one.startsWith('the ')
      const carrier = definite
        ? noun.one.charAt(0).toUpperCase() + noun.one.slice(1)
        : `${n} ${n === 1 ? noun.one : noun.many}${ids.length ? ` (${listed(ids)})` : ''}`
      problems.push(
        problem(
          'warning',
          'import.content-unread',
          `${carrier} carr${definite || n === 1 ? 'ies' : 'y'} ${what}, which Archipelago does not read. It was not imported.`,
          ids.length === 1 && ids[0] !== undefined ? { ...where, subject: ids[0] } : where,
        ),
      )
    }
  }
  return problems
}

function describeKey(key: string): string {
  if (key.startsWith('@')) return `the attribute “${key.slice(1)}”`
  if (key === '#text') return 'text'
  return `<${key}>`
}

function isIgnored(ignored: readonly Ignored[], at: string, key: string): boolean {
  return ignored.some(
    (rule) =>
      (rule.at === '*' || rule.at === at) &&
      (rule.key.endsWith('*') ? key.startsWith(rule.key.slice(0, -1)) : rule.key === key),
  )
}

function isBlank(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === ''
}
