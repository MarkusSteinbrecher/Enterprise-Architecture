import type { AccessType, RelationshipType } from '@/model'

/**
 * How each ArchiMate 3.2 relationship is drawn: the line pattern and what sits at
 * each end.
 *
 * This follows the specification's figures, **not** the `notation` field on
 * `RELATIONSHIP_TYPES`. That field is the design handoff's simplification for the
 * dependency graph (solid or dashed only), and two of its values are not
 * ArchiMate notation: realization is dotted, association is solid.
 *
 * Keyed by `RelationshipType`, so the compiler rejects a type without an entry.
 */

export type Pattern = 'solid' | 'dashed' | 'dotted'

export type Head =
  /** Two strokes: serving, influence. */
  | 'open-arrow'
  /** A smaller open arrow: access. */
  | 'small-arrow'
  /** A filled triangle: triggering, flow, assignment. */
  | 'filled-arrow'
  /** A hollow triangle: realization, specialization. */
  | 'hollow-triangle'
  | 'filled-diamond'
  | 'hollow-diamond'
  /** A filled dot at the source: assignment. */
  | 'dot'
  /** One stroke of an arrow: a directed association. */
  | 'half-arrow'

export interface RelationshipNotation {
  pattern: Pattern
  source?: Head
  target?: Head
}

// prettier-ignore
export const RELATIONSHIP_NOTATION: Record<RelationshipType, RelationshipNotation> = {
  Composition:    { pattern: 'solid',  source: 'filled-diamond' },
  Aggregation:    { pattern: 'solid',  source: 'hollow-diamond' },
  Assignment:     { pattern: 'solid',  source: 'dot', target: 'filled-arrow' },
  Realization:    { pattern: 'dotted', target: 'hollow-triangle' },
  Serving:        { pattern: 'solid',  target: 'open-arrow' },
  Access:         { pattern: 'dotted' }, // heads depend on the access type: see `relationshipHeads`
  Influence:      { pattern: 'dashed', target: 'open-arrow' },
  Triggering:     { pattern: 'solid',  target: 'filled-arrow' },
  Flow:           { pattern: 'dashed', target: 'filled-arrow' },
  Specialization: { pattern: 'solid',  target: 'hollow-triangle' },
  Association:    { pattern: 'solid' }, // a half arrow when directed: see `relationshipHeads`
}

export const DASH: Record<Pattern, string | undefined> = {
  solid: undefined,
  dashed: '6 4',
  dotted: '2 3',
}

export interface HeadOptions {
  /** Access only. Absent is `Write`, the exchange format's default. */
  accessType?: AccessType
  /** Association only. */
  directed?: boolean
}

/**
 * The heads a relationship draws, after the qualifiers that change them. An
 * access arrow points the way the data goes: at the object for a write, at the
 * accessor for a read, both ways for read-write, and nowhere for plain access.
 */
export function relationshipHeads(
  type: RelationshipType,
  { accessType = 'Write', directed = false }: HeadOptions = {},
): { source?: Head; target?: Head } {
  const notation = RELATIONSHIP_NOTATION[type]
  if (type === 'Access') {
    return {
      ...(accessType === 'Read' || accessType === 'ReadWrite'
        ? { source: 'small-arrow' as const }
        : {}),
      ...(accessType === 'Write' || accessType === 'ReadWrite'
        ? { target: 'small-arrow' as const }
        : {}),
    }
  }
  if (type === 'Association') return directed ? { target: 'half-arrow' } : {}
  return {
    ...(notation.source ? { source: notation.source } : {}),
    ...(notation.target ? { target: notation.target } : {}),
  }
}

/**
 * The text drawn at the middle of a relationship: its name and, on an
 * influence, its modifier (#84) — `++` alone, or `Drives (++)` beside a name.
 */
export function relationshipLabel({
  name,
  modifier,
}: {
  name?: string
  modifier?: string
}): string | undefined {
  if (name && modifier) return `${name} (${modifier})`
  return name || modifier || undefined
}
