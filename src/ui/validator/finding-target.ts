import { nestedConnections, typeLabel, type Element, type Finding } from '@/model'
import type { ModelStore } from '@/store'

/**
 * Where a finding's subject opens (#193), as Archi's validator selects an
 * issue's object in its editor:
 *
 * - an element opens its fact sheet, and a view opens on the canvas;
 * - a shape or a line opens its view with it selected (`?node=`, `?line=`);
 * - a relationship opens a view that draws it, with the line selected, or else
 *   the fact sheet of its source element (its target's, when the source is
 *   missing). A line the nesting hides cannot be selected (#96), so a view
 *   whose only drawing of it is hidden does not count;
 * - a folder has no screen, so it is revealed in the model tree (`?folder=`),
 *   beside the validator.
 *
 * Asked of the model as it is now, not as it was when the validator ran: a
 * subject deleted since has nowhere to open.
 */
export interface FindingTarget {
  /** The route. */
  readonly to: string
  /** What opens there, for the row's accessible name. */
  readonly opens: string
}

const at = (path: string, id: string) => `/${path}/${encodeURIComponent(id)}`

export function findingTarget(finding: Finding, store: ModelStore): FindingTarget | undefined {
  const id = finding.subjectId
  if (id === undefined) return undefined
  switch (finding.subjectKind) {
    case 'element': {
      const element = store.element(id)
      return element && { to: at('element', id), opens: `fact sheet of “${named(element)}”` }
    }
    case 'view': {
      const view = store.view(id)
      return view && { to: at('view', id), opens: `view “${view.name}”` }
    }
    case 'node':
    case 'connection': {
      const view = finding.viewId === undefined ? undefined : store.view(finding.viewId)
      const drawn =
        finding.subjectKind === 'node'
          ? view?.nodes.some((node) => node.id === id)
          : view?.connections.some((connection) => connection.id === id)
      if (!view || !drawn) return undefined
      const param = finding.subjectKind === 'node' ? 'node' : 'line'
      return {
        to: `${at('view', view.id)}?${new URLSearchParams({ [param]: id })}`,
        opens: `${finding.subjectKind === 'node' ? 'shape' : 'line'} in view “${view.name}”`,
      }
    }
    case 'relationship':
      return relationshipTarget(store, id)
    case 'folder': {
      const folder = store.folder(id)
      return (
        folder && {
          to: `/validate?${new URLSearchParams({ folder: id })}`,
          opens: `folder “${folder.name}” in the model tree`,
        }
      )
    }
    default:
      return undefined
  }
}

function relationshipTarget(store: ModelStore, id: string): FindingTarget | undefined {
  const relationship = store.relationship(id)
  if (!relationship) return undefined
  for (const view of store.viewsDrawingRelationship(id)) {
    const hidden = nestedConnections(view)
    const line = view.connections.find(
      (c) => c.kind === 'relationship' && c.relationship === id && !hidden.has(c.id),
    )
    if (line) {
      return {
        to: `${at('view', view.id)}?${new URLSearchParams({ line: line.id })}`,
        opens: `line in view “${view.name}”`,
      }
    }
  }
  const end = store.element(relationship.source) ?? store.element(relationship.target)
  return end && { to: at('element', end.id), opens: `fact sheet of “${named(end)}”` }
}

function named(element: Element): string {
  return element.name.trim() ? element.name : typeLabel(element.type)
}
