import type {
  Element,
  ElementNode,
  ElementType,
  Relationship,
  RelationshipConnection,
  RelationshipType,
  View,
  Workspace,
} from '@/model'

/**
 * Fixtures for the validator (#193): a model that trips none of Archi's
 * checks nor Archipelago's own, for the model's tests and the screen's to
 * change one thing in.
 */

export function element(id: string, type: ElementType, name: string): Element {
  return { id, type, name, properties: {} }
}

export function relationship(
  id: string,
  type: RelationshipType,
  source: string,
  target: string,
): Relationship {
  return { id, type, source, target, properties: {} }
}

export function shape(id: string, of: string, parent?: string): ElementNode {
  return {
    id,
    kind: 'element',
    element: of,
    bounds: { x: 0, y: 0, width: 120, height: 55 },
    ...(parent ? { parent } : {}),
  }
}

export function line(
  id: string,
  of: string,
  source: string,
  target: string,
): RelationshipConnection {
  return { id, kind: 'relationship' as const, relationship: of, source, target }
}

/**
 * Trips nothing. A clerk assigned to a role, nested in the clerk's shape and
 * backed by that Assignment; the role assigned to a process; an application
 * serving the process. Every element and relationship is drawn.
 */
export function clean(): Workspace {
  return {
    id: 'ws-checks',
    name: 'Checks',
    schemaVersion: 1,
    elements: [
      element('actor', 'BusinessActor', 'Clerk'),
      element('role', 'BusinessRole', 'Claims handler'),
      element('process', 'BusinessProcess', 'Handle claim'),
      element('app', 'ApplicationComponent', 'Claims system'),
    ],
    relationships: [
      relationship('r-assign', 'Assignment', 'actor', 'role'),
      relationship('r-performs', 'Assignment', 'role', 'process'),
      relationship('r-serves', 'Serving', 'app', 'process'),
    ],
    views: [
      {
        id: 'view-main',
        name: 'Main',
        properties: {},
        nodes: [
          shape('n-actor', 'actor'),
          shape('n-role', 'role', 'n-actor'),
          shape('n-process', 'process'),
          shape('n-app', 'app'),
        ],
        connections: [
          line('c-assign', 'r-assign', 'n-actor', 'n-role'),
          line('c-performs', 'r-performs', 'n-role', 'n-process'),
          line('c-serves', 'r-serves', 'n-app', 'n-process'),
        ],
      },
    ],
    folders: [],
    reports: [],
    tagGroups: [],
  }
}

export function main(workspace: Workspace): View {
  return workspace.views.find((view) => view.id === 'view-main')!
}
