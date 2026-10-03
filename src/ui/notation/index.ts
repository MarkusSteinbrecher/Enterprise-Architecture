/**
 * ArchiMate 3.2 notation as SVG React components (#77): every element type and
 * every relationship type, engine-agnostic (ADR 0006) — the read-only canvas, the
 * editor and exported images all draw with these.
 */
export { ElementShape, type ElementShapeProps, type Figure } from './ElementShape'
export { RelationshipLine, type RelationshipLineProps } from './RelationshipLine'
export { ELEMENT_NOTATION, type ElementNotation, type Body } from './element-notation'
export {
  RELATIONSHIP_NOTATION,
  relationshipHeads,
  relationshipLabel,
  type Head,
  type Pattern,
} from './relationship-notation'
export { wrapText, measureText } from './text'
export { NoteShape, GroupShape, ViewReferenceShape, MissingShape } from './DiagramObjectShapes'
export { NotationText } from './NotationText'
