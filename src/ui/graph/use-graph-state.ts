import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { COLOUR_VIEWS, type ColourView } from './colouring'

/**
 * Graph state in the URL (concept §7; handoff "State").
 * `colorView`, `year` and `focus` are the three parameters worth sharing: they
 * are what makes "look at the 2029 landscape around the CRM system" a link.
 */

export interface GraphState {
  colourView: ColourView
  year: number
  focus: string | undefined
}

export interface GraphStateApi extends GraphState {
  setColourView: (view: ColourView) => void
  setYear: (year: number) => void
  setFocus: (id: string | undefined) => void
  /** Click a focused node again to clear it. */
  toggleFocus: (id: string) => void
}

export function useGraphState(defaultYear: number): GraphStateApi {
  const [params, setParams] = useSearchParams()

  const state = useMemo<GraphState>(() => {
    const raw = params.get('colorView')
    const year = Number(params.get('year'))
    return {
      colourView: COLOUR_VIEWS.includes(raw as ColourView) ? (raw as ColourView) : 'layer',
      year: Number.isFinite(year) && year > 0 ? year : defaultYear,
      focus: params.get('focus') ?? undefined,
    }
  }, [params, defaultYear])

  const update = useCallback(
    (next: Partial<GraphState>) => {
      setParams(
        (current) => {
          const draft = new URLSearchParams(current)
          const merged = { ...state, ...next }

          if (merged.colourView !== 'layer') draft.set('colorView', merged.colourView)
          else draft.delete('colorView')

          if (merged.year !== defaultYear) draft.set('year', String(merged.year))
          else draft.delete('year')

          if (merged.focus) draft.set('focus', merged.focus)
          else draft.delete('focus')

          return draft
        },
        { replace: true },
      )
    },
    [setParams, state, defaultYear],
  )

  return {
    ...state,
    setColourView: useCallback((colourView: ColourView) => update({ colourView }), [update]),
    setYear: useCallback((year: number) => update({ year }), [update]),
    setFocus: useCallback((focus: string | undefined) => update({ focus }), [update]),
    toggleFocus: useCallback(
      (id: string) => update({ focus: state.focus === id ? undefined : id }),
      [update, state.focus],
    ),
  }
}
