import { typeLabel, type Element } from '@/model'
import { elementFacets, parseFacet, type FacetGroupKey } from './facets'

/**
 * Inventory filter semantics (handoff "Filter semantics (implement exactly)";
 * UI spec §3.2, ADR UI-4).
 *
 * One three-way combinator for the whole filter set rather than per-facet
 * operators — LeanIX-style per-facet operators are powerful and consistently
 * misread:
 *
 * - **AND** — options OR within a group, groups AND together. The expected default.
 * - **OR** — match any selected option, in any group.
 * - **NOT** — exclude anything matching any selected option.
 *
 * The name query is **always** ANDed on top, in every mode. A user who types a
 * name and then switches to NOT is excluding facets, not excluding their search.
 */

export type Combinator = 'AND' | 'OR' | 'NOT'

export const COMBINATORS: readonly Combinator[] = ['AND', 'OR', 'NOT']

export const COMBINATOR_HINTS: Record<Combinator, string> = {
  AND: 'Match every facet group',
  OR: 'Match any selected facet',
  NOT: 'Exclude anything selected',
}

export interface FilterState {
  facets: string[]
  mode: Combinator
  query: string
}

export const EMPTY_FILTER: FilterState = { facets: [], mode: 'AND', query: '' }

/** Substring match on `name + ' ' + type`, case-insensitive — same rule as the palette. */
export function matchesQuery(element: Element, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return `${element.name} ${typeLabel(element.type)}`.toLowerCase().includes(needle)
}

function groupFacets(facets: readonly string[]): Map<FacetGroupKey, Set<string>> {
  const grouped = new Map<FacetGroupKey, Set<string>>()
  for (const key of facets) {
    const parsed = parseFacet(key)
    if (!parsed) continue
    const bucket = grouped.get(parsed.group)
    if (bucket) bucket.add(key)
    else grouped.set(parsed.group, new Set([key]))
  }
  return grouped
}

export function matchesFacets(
  elementKeys: ReadonlySet<string>,
  facets: readonly string[],
  mode: Combinator,
): boolean {
  if (facets.length === 0) return true

  if (mode === 'OR') {
    return facets.some((key) => elementKeys.has(key))
  }
  if (mode === 'NOT') {
    return !facets.some((key) => elementKeys.has(key))
  }
  // AND: every group with a selection must be satisfied by at least one of its options.
  for (const keys of groupFacets(facets).values()) {
    let satisfied = false
    for (const key of keys) {
      if (elementKeys.has(key)) {
        satisfied = true
        break
      }
    }
    if (!satisfied) return false
  }
  return true
}

/** Apply a filter to a list of elements, preserving input order. */
export function applyFilter(
  elements: readonly Element[],
  filter: FilterState,
  at: number,
): Element[] {
  const hasFacets = filter.facets.length > 0
  const hasQuery = filter.query.trim().length > 0
  if (!hasFacets && !hasQuery) return [...elements]

  return elements.filter((element) => {
    if (!matchesQuery(element, filter.query)) return false
    if (!hasFacets) return true
    return matchesFacets(elementFacets(element, at), filter.facets, filter.mode)
  })
}

export function toggleFacet(facets: readonly string[], key: string): string[] {
  return facets.includes(key) ? facets.filter((f) => f !== key) : [...facets, key]
}

/** Saved searches carry their combinator with them (UI spec §3.2). */
export interface SavedSearch {
  id: string
  label: string
  facets: string[]
  mode: Combinator
}

/**
 * The four saved searches from the handoff.
 *
 * "End-of-life applications" is `layer:app + lifecycle:phaseOut + lifecycle:endOfLife`
 * under **AND**, not OR. The UI spec suggests OR for this example, but its own
 * definition of OR — "match any selected option anywhere" — would return every
 * application plus everything phasing out anywhere in the model. AND, with its
 * within-group OR, is what the label promises.
 */
export const SAVED_SEARCHES: readonly SavedSearch[] = [
  {
    id: 'eol-applications',
    label: 'End-of-life applications',
    facets: ['layer:app', 'lifecycle:phaseOut', 'lifecycle:endOfLife'],
    mode: 'AND',
  },
  {
    id: 'invest-portfolio',
    label: 'Invest portfolio',
    facets: ['time:Invest'],
    mode: 'AND',
  },
  {
    id: 'vendor-risk',
    label: 'Vendor risk exposure',
    facets: ['tag:Vendor risk'],
    mode: 'AND',
  },
  {
    id: 'business-capabilities',
    label: 'Business capabilities',
    facets: ['layer:biz'],
    mode: 'AND',
  },
]
