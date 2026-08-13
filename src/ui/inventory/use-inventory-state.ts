import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseFacet } from './facets'
import { COMBINATORS, type Combinator, type FilterState } from './filters'

/**
 * Inventory state lives in the URL (concept §7, handoff "State").
 *
 * That is what makes a filtered view shareable and what makes browser
 * back/forward behave: a link to "every end-of-life application" is a link, not a
 * sequence of clicks to reproduce. The same encoding is what a saved view stores.
 *
 *   ?q=policy&facets=layer:app,lifecycle:endOfLife&mode=AND&view=cards
 */

export type InventoryView = 'table' | 'cards'

export interface InventoryState extends FilterState {
  view: InventoryView
}

export interface InventoryStateApi extends InventoryState {
  setQuery: (query: string) => void
  setMode: (mode: Combinator) => void
  setFacets: (facets: string[]) => void
  setView: (view: InventoryView) => void
  /** Apply a saved search: facets *and* combinator together. */
  applySaved: (facets: string[], mode: Combinator) => void
  clear: () => void
}

function parseMode(raw: string | null): Combinator {
  return COMBINATORS.includes(raw as Combinator) ? (raw as Combinator) : 'AND'
}

/**
 * Facet keys are percent-encoded before they are joined.
 *
 * A facet carries a user-authored value — a tag is whatever the architect typed —
 * so the comma that separates them is a character the values are entitled to
 * contain. Joined raw, a tag named `Risk, high` came back as `tag:Risk` plus
 * `high`: the rail checkbox flipped itself off, the chip bar showed one wrong
 * chip and dropped the other, and AND mode filtered on a tag no element carries,
 * leaving an empty table with no visible cause.
 *
 * `encodeURIComponent` is the escape because the decoder has to be unambiguous
 * too, and it is: a tag literally named `a%2Cb` encodes to `a%252Cb`, so it can
 * never be mistaken for an escaped comma. (Same defect, same reason, as the
 * comma-joined tags #37 had to fix in the exchange writer.)
 */
export function encodeFacets(facets: string[]): string {
  return facets.map(encodeURIComponent).join(',')
}

export function parseFacets(raw: string | null): string[] {
  if (!raw) return []
  const decoded: string[] = []
  for (const part of raw.split(',')) {
    if (!part) continue
    let facet: string
    try {
      facet = decodeURIComponent(part)
    } catch {
      // `%zz` and friends: a URL nobody could have produced. Drop it, like any
      // other key that does not parse.
      continue
    }
    // Every reading of this list has to agree. `parseFacets` used to accept any
    // non-empty string, so `?facets=bogus` was counted by the result line
    // ("· 1 filter (AND)"), rendered by nothing in the chip bar, and skipped by
    // the filter — a claimed filter that was invisible and inert, and in OR mode
    // an empty table pointing at a facet that is not on screen.
    if (!parseFacet(facet)) continue
    if (!decoded.includes(facet)) decoded.push(facet)
  }
  return decoded
}

export function useInventoryState(): InventoryStateApi {
  const [params, setParams] = useSearchParams()

  const state = useMemo<InventoryState>(
    () => ({
      query: params.get('q') ?? '',
      facets: parseFacets(params.get('facets')),
      mode: parseMode(params.get('mode')),
      view: params.get('view') === 'cards' ? 'cards' : 'table',
    }),
    [params],
  )

  /**
   * `replace` is for the name query and nothing else.
   *
   * Every update used to replace, so no history entry was ever pushed and Back
   * left the inventory altogether, losing every filter — while this module's own
   * docblock claimed the design was "what makes browser back/forward behave".
   * A discrete action (facet, mode, saved search, view) is a step the user took
   * and should be a step they can undo; a query changes per keystroke, and
   * pushing there would make Back a character-by-character rewind.
   */
  const update = useCallback(
    (next: Partial<InventoryState>, { replace = false } = {}) => {
      setParams(
        (current) => {
          const draft = new URLSearchParams(current)
          const merged = { ...state, ...next }

          if (merged.query) draft.set('q', merged.query)
          else draft.delete('q')

          if (merged.facets.length) draft.set('facets', encodeFacets(merged.facets))
          else draft.delete('facets')

          // AND and table are the defaults; leaving them out keeps URLs short.
          if (merged.mode !== 'AND') draft.set('mode', merged.mode)
          else draft.delete('mode')

          if (merged.view !== 'table') draft.set('view', merged.view)
          else draft.delete('view')

          return draft
        },
        { replace },
      )
    },
    [setParams, state],
  )

  return {
    ...state,
    setQuery: useCallback((query: string) => update({ query }, { replace: true }), [update]),
    setMode: useCallback((mode: Combinator) => update({ mode }), [update]),
    setFacets: useCallback((facets: string[]) => update({ facets }), [update]),
    setView: useCallback((view: InventoryView) => update({ view }), [update]),
    applySaved: useCallback(
      (facets: string[], mode: Combinator) => update({ facets, mode }),
      [update],
    ),
    clear: useCallback(() => update({ facets: [], query: '' }), [update]),
  }
}
