import {
  COLOUR_GROUPS,
  COLOUR_GROUP_LABELS,
  LIFECYCLE_PHASES,
  LIFECYCLE_PHASE_LABELS,
  LIFECYCLE_PHASE_TOKENS,
  TIME_CLASSIFICATIONS,
  TIME_TOKENS,
  deriveLifecyclePhase,
  elementTypeMeta,
  type ColourGroup,
  type Element,
} from '@/model'

/**
 * Colour views (handoff "Screen 3 — colour views").
 *
 * Semantic colour is the report legend, not decoration (UI spec §2). One
 * function maps an element to a stroke and a fill under the active view, and one
 * builds the legend from the same source, so the canvas and the legend cannot
 * disagree.
 */

export const COLOUR_VIEWS = ['layer', 'lifecycle', 'time'] as const
export type ColourView = (typeof COLOUR_VIEWS)[number]

export const COLOUR_VIEW_LABELS: Record<ColourView, string> = {
  layer: 'Layer',
  lifecycle: 'Lifecycle',
  time: 'TIME',
}

export interface NodeColour {
  stroke: string
  fill: string
}

/** Percentage of the stroke colour mixed into the fill for non-layer views. */
const MIX = 13

export function colourOf(element: Element, view: ColourView, at: number): NodeColour {
  if (view === 'layer') {
    const group: ColourGroup = elementTypeMeta(element.type).colourGroup
    return { stroke: `var(--${group})`, fill: `var(--${group}bg)` }
  }
  if (view === 'lifecycle') {
    const stroke = LIFECYCLE_PHASE_TOKENS[deriveLifecyclePhase(element.profile?.lifecycle, at)]
    return { stroke, fill: mix(stroke) }
  }
  const time = element.profile?.timeClassification
  // Elements with no TIME classification fall back to the neutral border colour.
  const stroke = time ? TIME_TOKENS[time] : 'var(--bd2)'
  return { stroke, fill: mix(stroke) }
}

function mix(colour: string): string {
  return `color-mix(in oklab, ${colour} ${MIX}%, var(--surface))`
}

export interface LegendEntry {
  key: string
  label: string
  stroke: string
  fill: string
}

/** The legend for a colour view — regenerated whenever the view changes. */
export function legendFor(view: ColourView): LegendEntry[] {
  if (view === 'layer') {
    return COLOUR_GROUPS.map((group) => ({
      key: group,
      label: COLOUR_GROUP_LABELS[group],
      stroke: `var(--${group})`,
      fill: `var(--${group}bg)`,
    }))
  }
  if (view === 'lifecycle') {
    return LIFECYCLE_PHASES.map((phase) => ({
      key: phase,
      label: LIFECYCLE_PHASE_LABELS[phase],
      stroke: LIFECYCLE_PHASE_TOKENS[phase],
      fill: mix(LIFECYCLE_PHASE_TOKENS[phase]),
    }))
  }
  return [
    ...TIME_CLASSIFICATIONS.map((value) => ({
      key: value,
      label: value,
      stroke: TIME_TOKENS[value],
      fill: mix(TIME_TOKENS[value]),
    })),
    { key: 'none', label: 'Not classified', stroke: 'var(--bd2)', fill: mix('var(--bd2)') },
  ]
}

/** The mono sub-label on a node: its TIME class, or its phase when it has none. */
export function subLabelOf(element: Element, at: number): string {
  return (
    element.profile?.timeClassification ??
    LIFECYCLE_PHASE_LABELS[deriveLifecyclePhase(element.profile?.lifecycle, at)]
  )
}
