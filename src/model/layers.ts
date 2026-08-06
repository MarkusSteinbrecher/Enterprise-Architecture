/**
 * ArchiMate 3.2 layers and aspects.
 *
 * The specification organises the language along two dimensions: layers
 * (Strategy, Business, Application, Technology, Physical, Motivation,
 * Implementation & Migration) and aspects (Active Structure, Behaviour,
 * Passive Structure, Motivation). Location and Grouping are composite
 * elements that sit outside both; Junction is a relationship connector.
 *
 * Both dimensions are load-bearing here: the validity rules in `validity.ts`
 * are expressed over them, and `colourGroup` drives the six-way layer palette
 * from the design handoff.
 */

export const LAYERS = [
  'strategy',
  'business',
  'application',
  'technology',
  'physical',
  'motivation',
  'implementation',
  'other',
] as const

export type Layer = (typeof LAYERS)[number]

export const ASPECTS = [
  'active-structure',
  'behaviour',
  'passive-structure',
  'motivation',
  'composite',
  'connector',
] as const

export type Aspect = (typeof ASPECTS)[number]

/**
 * The six colour groups of the handoff palette. Several layers share one group:
 * Strategy renders with Business, Physical with Technology, and passive-structure
 * elements get their own slate ramp regardless of layer.
 */
export const COLOUR_GROUPS = ['biz', 'app', 'tec', 'pas', 'mot', 'imp'] as const

export type ColourGroup = (typeof COLOUR_GROUPS)[number]

/** Human labels, used in facet groups and legends. */
export const LAYER_LABELS: Record<Layer, string> = {
  strategy: 'Strategy',
  business: 'Business',
  application: 'Application',
  technology: 'Technology',
  physical: 'Physical',
  motivation: 'Motivation',
  implementation: 'Implementation & Migration',
  other: 'Other',
}

export const COLOUR_GROUP_LABELS: Record<ColourGroup, string> = {
  biz: 'Business',
  app: 'Application',
  tec: 'Technology',
  pas: 'Data',
  mot: 'Motivation',
  imp: 'Migration',
}

/** CSS custom property names for a colour group's stroke and fill. */
export function colourGroupTokens(group: ColourGroup): { stroke: string; fill: string } {
  return { stroke: `var(--${group})`, fill: `var(--${group}bg)` }
}
