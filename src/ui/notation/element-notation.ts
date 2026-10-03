import { colourGroupTokens, elementTypeMeta, type ColourGroup, type ElementType } from '@/model'
import type { GlyphName } from './glyphs'

/**
 * How each ArchiMate 3.2 element type is drawn.
 *
 * `body` is the rectangle notation's outline, which ArchiMate varies by aspect:
 * square corners for active structure, rounded for behaviour, cut for
 * motivation, and dedicated outlines for the passive objects whose notation *is*
 * the body (business object, contract, representation, product).
 *
 * `glyph` is the type icon in the top-right corner.
 *
 * `alternative` says where the name goes when the element is drawn as its
 * full-size figure instead (the actor stick figure, the node box): `inside` a
 * closed figure, or `below` one that has no room for text. Absent means the
 * type has no alternative figure and is always drawn as its rectangle.
 *
 * Keyed by `ElementType`, so the compiler rejects a type without an entry; the
 * notation test iterates the catalogue for the same guarantee at run time.
 */

export type Body =
  | 'square'
  | 'rounded'
  | 'cut'
  | 'object'
  | 'contract'
  | 'representation'
  | 'product'
  | 'grouping'
  | 'junction'

export interface ElementNotation {
  body: Body
  glyph?: GlyphName
  alternative?: 'inside' | 'below'
}

// One row per element type, in catalogue order: kept off the formatter so it reads as a table.
// prettier-ignore
export const ELEMENT_NOTATION: Record<ElementType, ElementNotation> = {
  Resource:                 { body: 'square',  glyph: 'resource',             alternative: 'below' },
  Capability:               { body: 'rounded', glyph: 'capability',           alternative: 'below' },
  CourseOfAction:           { body: 'rounded', glyph: 'courseOfAction',       alternative: 'below' },
  ValueStream:              { body: 'rounded', glyph: 'valueStream',          alternative: 'inside' },

  BusinessActor:            { body: 'square',  glyph: 'actor',                alternative: 'below' },
  BusinessRole:             { body: 'square',  glyph: 'cylinder',             alternative: 'inside' },
  BusinessCollaboration:    { body: 'square',  glyph: 'collaboration',        alternative: 'below' },
  BusinessInterface:        { body: 'square',  glyph: 'iface',                alternative: 'below' },
  BusinessProcess:          { body: 'rounded', glyph: 'process',              alternative: 'inside' },
  BusinessFunction:         { body: 'rounded', glyph: 'fn',                   alternative: 'inside' },
  BusinessInteraction:      { body: 'rounded', glyph: 'interaction',          alternative: 'below' },
  BusinessEvent:            { body: 'rounded', glyph: 'event',                alternative: 'inside' },
  BusinessService:          { body: 'rounded', glyph: 'service',              alternative: 'inside' },
  BusinessObject:           { body: 'object' },
  Contract:                 { body: 'contract' },
  Representation:           { body: 'representation' },
  Product:                  { body: 'product' },

  ApplicationComponent:     { body: 'square',  glyph: 'component',            alternative: 'inside' },
  ApplicationCollaboration: { body: 'square',  glyph: 'collaboration',        alternative: 'below' },
  ApplicationInterface:     { body: 'square',  glyph: 'iface',                alternative: 'below' },
  ApplicationFunction:      { body: 'rounded', glyph: 'fn',                   alternative: 'inside' },
  ApplicationInteraction:   { body: 'rounded', glyph: 'interaction',          alternative: 'below' },
  ApplicationProcess:       { body: 'rounded', glyph: 'process',              alternative: 'inside' },
  ApplicationEvent:         { body: 'rounded', glyph: 'event',                alternative: 'inside' },
  ApplicationService:       { body: 'rounded', glyph: 'service',              alternative: 'inside' },
  DataObject:               { body: 'object' },

  Node:                     { body: 'square',  glyph: 'node',                 alternative: 'inside' },
  Device:                   { body: 'square',  glyph: 'device',               alternative: 'below' },
  SystemSoftware:           { body: 'square',  glyph: 'systemSoftware',       alternative: 'below' },
  TechnologyCollaboration:  { body: 'square',  glyph: 'collaboration',        alternative: 'below' },
  TechnologyInterface:      { body: 'square',  glyph: 'iface',                alternative: 'below' },
  Path:                     { body: 'square',  glyph: 'path' },
  CommunicationNetwork:     { body: 'square',  glyph: 'communicationNetwork' },
  TechnologyFunction:       { body: 'rounded', glyph: 'fn',                   alternative: 'inside' },
  TechnologyProcess:        { body: 'rounded', glyph: 'process',              alternative: 'inside' },
  TechnologyInteraction:    { body: 'rounded', glyph: 'interaction',          alternative: 'below' },
  TechnologyEvent:          { body: 'rounded', glyph: 'event',                alternative: 'inside' },
  TechnologyService:        { body: 'rounded', glyph: 'service',              alternative: 'inside' },
  Artifact:                 { body: 'square',  glyph: 'artifact',             alternative: 'inside' },

  Equipment:                { body: 'square',  glyph: 'equipment',            alternative: 'below' },
  Facility:                 { body: 'square',  glyph: 'facility',             alternative: 'below' },
  DistributionNetwork:      { body: 'square',  glyph: 'distributionNetwork' },
  Material:                 { body: 'square',  glyph: 'material',             alternative: 'below' },

  Stakeholder:              { body: 'cut',     glyph: 'cylinder',             alternative: 'inside' },
  Driver:                   { body: 'cut',     glyph: 'driver',               alternative: 'below' },
  Assessment:               { body: 'cut',     glyph: 'assessment',           alternative: 'below' },
  Goal:                     { body: 'cut',     glyph: 'goal',                 alternative: 'below' },
  Outcome:                  { body: 'cut',     glyph: 'outcome',              alternative: 'below' },
  Principle:                { body: 'cut',     glyph: 'principle',            alternative: 'below' },
  Requirement:              { body: 'cut',     glyph: 'requirement',          alternative: 'inside' },
  Constraint:               { body: 'cut',     glyph: 'constraint',           alternative: 'inside' },
  Meaning:                  { body: 'cut',     glyph: 'meaning',              alternative: 'inside' },
  Value:                    { body: 'cut',     glyph: 'value',                alternative: 'inside' },

  WorkPackage:              { body: 'rounded', glyph: 'workPackage' },
  Deliverable:              { body: 'representation' },
  ImplementationEvent:      { body: 'rounded', glyph: 'event',                alternative: 'inside' },
  Plateau:                  { body: 'square',  glyph: 'plateau' },
  Gap:                      { body: 'square',  glyph: 'gap' },

  Location:                 { body: 'square',  glyph: 'location',             alternative: 'below' },
  Grouping:                 { body: 'grouping' },
  Junction:                 { body: 'junction' },
}

/**
 * The colour group a type is drawn in on a diagram.
 *
 * The catalogue gives every passive-structure type one neutral group (`pas`),
 * which is right for the report legend. On a diagram it would make a business
 * object and a data object identical: the notation has no icon for either, and
 * ArchiMate tells them apart by layer colour alone. So passive structure takes
 * the colour of its layer here; everything else keeps its catalogue group.
 */
export function notationColourGroup(type: ElementType): ColourGroup {
  const meta = elementTypeMeta(type)
  if (meta.colourGroup !== 'pas') return meta.colourGroup
  switch (meta.layer) {
    case 'business':
      return 'biz'
    case 'application':
      return 'app'
    case 'technology':
    case 'physical':
      return 'tec'
    default:
      return meta.colourGroup
  }
}

export function notationColours(type: ElementType): { stroke: string; fill: string } {
  return colourGroupTokens(notationColourGroup(type))
}
