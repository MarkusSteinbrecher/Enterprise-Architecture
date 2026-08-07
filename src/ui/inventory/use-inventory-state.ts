import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
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

function parseFacets(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((facet) => facet.trim())
    .filter(Boolean)
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

  const update = useCallback(
    (next: Partial<InventoryState>) => {
      setParams(
        (current) => {
          const draft = new URLSearchParams(current)
          const merged = { ...state, ...next }

          if (merged.query) draft.set('q', merged.query)
          else draft.delete('q')

          if (merged.facets.length) draft.set('facets', merged.facets.join(','))
          else draft.delete('facets')

          // AND and table are the defaults; leaving them out keeps URLs short.
          if (merged.mode !== 'AND') draft.set('mode', merged.mode)
          else draft.delete('mode')

          if (merged.view !== 'table') draft.set('view', merged.view)
          else draft.delete('view')

          return draft
        },
        { replace: true },
      )
    },
    [setParams, state],
  )

  return {
    ...state,
    setQuery: useCallback((query: string) => update({ query }), [update]),
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
