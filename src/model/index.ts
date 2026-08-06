/**
 * The typed ArchiMate 3.2 core (issue #3, concept §4).
 *
 * Pure TypeScript, no UI, no storage. This is the layer the concept says must be
 * owned in-repo rather than vendored (§2.2 risk: every ArchiMate JS library is a
 * solo project), so everything above it — store, import/export, screens, reports —
 * imports from here and nowhere else for model semantics.
 */

export * from './layers'
export * from './element-types'
export * from './relationship-types'
export * from './validity'
export * from './profile'
export * from './lifecycle'
export * from './completeness'
export * from './workspace'
export * from './validate'
