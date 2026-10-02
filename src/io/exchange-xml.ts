/**
 * XML building and reading pieces shared by the exchange-format model writer
 * and its views and organizations (#76). Internal to `io/`.
 */

export interface RawNode {
  [key: string]: unknown
}

export function text(value: string): string {
  return (
    value
      // Control characters are illegal in XML 1.0 even as numeric references
      // (only tab, LF and CR survive), so they are stripped rather than written
      // into a file no parser would accept back.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // A raw CR is normalised away by every XML parser (XML 1.0 §2.11), so a
      // CRLF in a note or a description came back as LF. Escaped, it survives.
      .replace(/\r/g, '&#xD;')
  )
}

/** Attribute values are normalised harder (§3.3.3): LF and tab become spaces too. */
export function attr(value: string): string {
  return text(value).replace(/"/g, '&quot;').replace(/\n/g, '&#xA;').replace(/\t/g, '&#x9;')
}

/** An unused XML name for `id`, close to how it was spelled. */
export function claimIdentifier(id: string, used: Set<string>): string {
  const base = sanitiseId(id)
  let candidate = base
  for (let n = 2; used.has(candidate); n += 1) candidate = `${base}-${n}`
  used.add(candidate)
  return candidate
}

export function sanitiseId(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9_.-]/g, '-')
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `id-${cleaned}`
}

/** The first few of a list, for a message that must stay one line. */
export function listed(values: readonly string[]): string {
  return values.slice(0, 3).join(', ') + (values.length > 3 ? ', …' : '')
}

/** fast-xml-parser collapses a single child to an object; normalise to an array. */
export function list(value: unknown): RawNode[] {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) return value.filter(isRawNode)
  return isRawNode(value) ? [value] : []
}

export function isRawNode(value: unknown): value is RawNode {
  return typeof value === 'object' && value !== null
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined
}

/**
 * `LangStringType` may appear as a bare string, as `{ '#text': … }` when it
 * carries `xml:lang`, or repeated once per language. Take the first value.
 */
export function langString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return langString(value[0])
  if (isRawNode(value)) {
    const inner = value['#text']
    if (typeof inner === 'string' || typeof inner === 'number') return String(inner)
    // `<value xml:lang="en"></value>` parses to its attributes alone. The value
    // is the empty string, not "no value" — reading it as absent dropped the
    // property and made the next export differ from this one (#36).
    return ''
  }
  return undefined
}
