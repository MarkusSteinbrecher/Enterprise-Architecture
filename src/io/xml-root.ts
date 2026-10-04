/**
 * The root element of an XML document: its local name and the namespace its
 * prefix resolves to.
 *
 * Archi's model file and the exchange format both call their root `model`, so
 * the namespace is the only thing that tells them apart. It has to be the
 * root's own namespace, resolved through its prefix: a search for the namespace
 * URI anywhere in the text picks up a comment or documentation that mentions
 * it, and a model read by the wrong reader comes in empty with nothing reported
 * (#99). Everything before the root — a byte-order mark, the declaration,
 * comments, processing instructions, a doctype — is skipped, however long.
 */
export interface XmlRoot {
  local: string
  /** Undefined when the root is in no namespace. */
  namespace?: string
}

const ATTRIBUTE = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

export function xmlRoot(text: string): XmlRoot | undefined {
  // A byte-order mark needs no handling: the search for `<` passes it.
  let at = 0
  for (;;) {
    at = text.indexOf('<', at)
    if (at < 0) return undefined
    if (text.startsWith('<?', at)) at = skipPast(text, at, '?>')
    else if (text.startsWith('<!--', at)) at = skipPast(text, at, '-->')
    else if (text.startsWith('<!', at)) at = skipDoctype(text, at)
    else break
    if (at < 0) return undefined
  }

  // Quote-aware: an attribute value may hold `>`, as in a model named `A > B`.
  const tag = /^<([^\s/>]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/.exec(text.slice(at))
  if (!tag) return undefined
  const [, name, rest] = tag as unknown as [string, string, string]
  const colon = name.indexOf(':')
  const prefix = colon < 0 ? undefined : name.slice(0, colon)
  const local = colon < 0 ? name : name.slice(colon + 1)

  const declares = prefix === undefined ? 'xmlns' : `xmlns:${prefix}`
  for (const match of rest.matchAll(ATTRIBUTE)) {
    if (match[1] === declares) {
      const namespace = decode(match[2] ?? match[3] ?? '')
      return namespace ? { local, namespace } : { local }
    }
  }
  return { local }
}

function skipPast(text: string, from: number, end: string): number {
  const at = text.indexOf(end, from)
  return at < 0 ? -1 : at + end.length
}

/** A doctype may carry an internal subset in brackets, which can itself hold `>`. */
function skipDoctype(text: string, from: number): number {
  const bracket = text.indexOf('[', from)
  const close = text.indexOf('>', from)
  if (close < 0) return -1
  if (bracket < 0 || bracket > close) return close + 1
  const end = text.indexOf(']', bracket)
  return end < 0 ? -1 : skipPast(text, end, '>')
}

/** The five predefined entities and numeric references, which a namespace URI may use. */
function decode(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity: string) => {
    const lower = entity.toLowerCase()
    if (lower.startsWith('#')) {
      const code = lower.startsWith('#x')
        ? parseInt(lower.slice(2), 16)
        : parseInt(lower.slice(1), 10)
      return code <= 0x10ffff ? String.fromCodePoint(code) : whole
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[lower] ?? whole
  })
}
