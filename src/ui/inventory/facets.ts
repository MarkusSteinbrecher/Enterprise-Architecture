import {
  COLOUR_GROUPS,
  COLOUR_GROUP_LABELS,
  LIFECYCLE_PHASES,
  LIFECYCLE_PHASE_LABELS,
  TIME_CLASSIFICATIONS,
  deriveLifecyclePhase,
  elementTypeMeta,
  type ColourGroup,
  type Element,
  type LifecyclePhase,
  type TimeClassification,
  type Workspace,
} from '@/model'

/**
 * The four facet groups of the inventory rail (handoff "Screen 1 — Filter rail").
 *
 * A facet is a `group:value` string — the same encoding the URL and saved views
 * use, so filter state is one flat list of strings everywhere it appears.
 *
 * LAYER faces the *colour group* rather than the ArchiMate layer: the rail offers
 * Business / Application / Technology / Data / Motivation / Migration, which is
 * how the palette is organised (Strategy renders with Business, passive structure
 * gets its own ramp), and matching the rail to the colours is what makes the
 * legend and the filter agree.
 */

export type FacetGroupKey = 'layer' | 'lifecycle' | 'time' | 'tag'

export const FACET_GROUP_LABELS: Record<FacetGroupKey, string> = {
  layer: 'Layer',
  lifecycle: 'Lifecycle',
  time: 'Time classification',
  tag: 'Tags',
}

export interface FacetOption {
  /** `layer:app` */
  key: string
  group: FacetGroupKey
  value: string
  label: string
}

export interface FacetGroup {
  key: FacetGroupKey
  label: string
  options: FacetOption[]
}

export function facetKey(group: FacetGroupKey, value: string): string {
  return `${group}:${value}`
}

export function parseFacet(key: string): { group: FacetGroupKey; value: string } | undefined {
  const separator = key.indexOf(':')
  if (separator < 0) return undefined
  const group = key.slice(0, separator)
  const value = key.slice(separator + 1)
  if (group === 'layer' || group === 'lifecycle' || group === 'time' || group === 'tag') {
    return { group, value }
  }
  return undefined
}

/** The facet groups for a workspace. Tag options come from its tag groups. */
export function buildFacetGroups(workspace: Pick<Workspace, 'tagGroups'>): FacetGroup[] {
  return [
    {
      key: 'layer',
      label: FACET_GROUP_LABELS.layer,
      options: COLOUR_GROUPS.map((group) => ({
        key: facetKey('layer', group),
        group: 'layer' as const,
        value: group,
        label: COLOUR_GROUP_LABELS[group],
      })),
    },
    {
      key: 'lifecycle',
      label: FACET_GROUP_LABELS.lifecycle,
      options: LIFECYCLE_PHASES.map((phase) => ({
        key: facetKey('lifecycle', phase),
        group: 'lifecycle' as const,
        value: phase,
        label: LIFECYCLE_PHASE_LABELS[phase],
      })),
    },
    {
      key: 'time',
      label: FACET_GROUP_LABELS.time,
      options: TIME_CLASSIFICATIONS.map((value) => ({
        key: facetKey('time', value),
        group: 'time' as const,
        value,
        label: value,
      })),
    },
    {
      key: 'tag',
      label: FACET_GROUP_LABELS.tag,
      options: workspace.tagGroups
        .flatMap((group) => group.tags)
        .map((tag) => ({
          key: facetKey('tag', tag.name),
          group: 'tag' as const,
          value: tag.name,
          label: tag.name,
        })),
    },
  ]
}

/** The facet values an element carries, as `group:value` keys. */
export function elementFacets(element: Element, at: number): Set<string> {
  const keys = new Set<string>()
  keys.add(facetKey('layer', elementTypeMeta(element.type).colourGroup))
  keys.add(facetKey('lifecycle', deriveLifecyclePhase(element.profile?.lifecycle, at)))
  if (element.profile?.timeClassification) {
    keys.add(facetKey('time', element.profile.timeClassification))
  }
  for (const tag of element.profile?.tags ?? []) keys.add(facetKey('tag', tag))
  return keys
}

/**
 * Counts per facet option across the whole workspace.
 *
 * Deliberately **not** co-filtered (ADR UI-5): co-filtered counts move under the
 * cursor while you click. The cost is that a count can exceed the current result
 * set, which is the cheaper confusion of the two.
 */
export function countFacets(elements: Iterable<Element>, at: number): Map<string, number> {
  const counts = new Map<string, number>()
  for (const element of elements) {
    for (const key of elementFacets(element, at)) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return counts
}

export function colourGroupOf(element: Element): ColourGroup {
  return elementTypeMeta(element.type).colourGroup
}

export function lifecycleOf(element: Element, at: number): LifecyclePhase {
  return deriveLifecyclePhase(element.profile?.lifecycle, at)
}

export function timeOf(element: Element): TimeClassification | undefined {
  return element.profile?.timeClassification
}
