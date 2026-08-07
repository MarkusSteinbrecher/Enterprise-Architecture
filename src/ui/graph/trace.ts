import type { Relationship } from '@/model'

/**
 * Tracing is the graph's primary verb (UI spec §3.3).
 *
 * The reference points were Obsidian and Neo4j Bloom rather than a diagramming
 * tool: clicking a node answers "what does this touch?" by dimming everything it
 * does not. The opacity numbers come from the handoff and are load-bearing —
 * 0.16 is faint enough to read as context and solid enough to keep the shape of
 * the landscape visible behind the trace.
 */

export const DIMMED_NODE_OPACITY = 0.16
export const DIMMED_EDGE_OPACITY = 0.1
export const PAST_EOL_OPACITY = 0.72

export interface Trace {
  /** The focused element plus everything one hop away. */
  lit: Set<string>
  /** Relationships with the focused element at either end. */
  incident: Set<string>
}

export function traceFrom(focus: string, relationships: readonly Relationship[]): Trace {
  const lit = new Set<string>([focus])
  const incident = new Set<string>()
  for (const relationship of relationships) {
    if (relationship.source === focus) {
      lit.add(relationship.target)
      incident.add(relationship.id)
    } else if (relationship.target === focus) {
      lit.add(relationship.source)
      incident.add(relationship.id)
    }
  }
  return { lit, incident }
}

/** Relationships touching the focused element, as the side panel lists them. */
export interface TracedDependency {
  relationship: Relationship
  otherId: string
  direction: 'outgoing' | 'incoming'
}

export function tracedDependencies(
  focus: string,
  relationships: readonly Relationship[],
): TracedDependency[] {
  return relationships.flatMap<TracedDependency>((relationship) => {
    if (relationship.source === focus) {
      return [{ relationship, otherId: relationship.target, direction: 'outgoing' as const }]
    }
    if (relationship.target === focus) {
      return [{ relationship, otherId: relationship.source, direction: 'incoming' as const }]
    }
    return []
  })
}
