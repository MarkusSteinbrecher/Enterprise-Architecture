import { typeLabel, type Element, type Relationship } from '@/model'

/**
 * Every mutation is a command.
 *
 * Commands carry both the before and after state of what they touch, so undo is
 * a pure inverse rather than a snapshot diff — at 5,000 elements, snapshotting
 * the whole workspace per keystroke is not an option. Deleting an element also
 * carries the relationships that were cascaded away with it, so undo restores
 * the neighbourhood, not just the node.
 *
 * `batch` exists for anything that must undo in one step: an Excel import, a
 * multi-field edit on the fact sheet, a bulk retag.
 */

export type Command =
  | { kind: 'add-element'; element: Element }
  | { kind: 'update-element'; before: Element; after: Element }
  | { kind: 'remove-element'; element: Element; cascaded: Relationship[] }
  | { kind: 'add-relationship'; relationship: Relationship }
  | { kind: 'update-relationship'; before: Relationship; after: Relationship }
  | { kind: 'remove-relationship'; relationship: Relationship }
  | { kind: 'rename-workspace'; before: string; after: string }
  | { kind: 'batch'; commands: Command[] }

/** An applied command, as the fact sheet's HISTORY section reads it. */
export interface CommandRecord {
  id: string
  /** Human sentence: "Created Application Component «CRM System»". */
  label: string
  /** Epoch ms. */
  at: number
  author: string
  command: Command
}

/** The subject an entry concerns, so history can be filtered per element. */
export function commandSubjects(command: Command): string[] {
  switch (command.kind) {
    case 'add-element':
      return [command.element.id]
    case 'update-element':
      return [command.after.id]
    case 'remove-element':
      return [command.element.id, ...command.cascaded.flatMap((r) => [r.source, r.target])]
    case 'add-relationship':
      return [command.relationship.id, command.relationship.source, command.relationship.target]
    case 'update-relationship':
      return [command.after.id, command.after.source, command.after.target]
    case 'remove-relationship':
      return [command.relationship.id, command.relationship.source, command.relationship.target]
    case 'rename-workspace':
      return []
    case 'batch':
      return command.commands.flatMap(commandSubjects)
  }
}

/** One-line description, as the history timeline and the undo tooltip print it. */
export function describeCommand(command: Command): string {
  switch (command.kind) {
    case 'add-element':
      return `Created ${typeLabel(command.element.type)} “${command.element.name}”`
    case 'update-element':
      return describeElementUpdate(command.before, command.after)
    case 'remove-element':
      return command.cascaded.length
        ? `Deleted “${command.element.name}” and ${command.cascaded.length} relation${command.cascaded.length === 1 ? '' : 's'}`
        : `Deleted “${command.element.name}”`
    case 'add-relationship':
      return `Added ${command.relationship.type} relation`
    case 'update-relationship':
      return `Updated ${command.after.type} relation`
    case 'remove-relationship':
      return `Removed ${command.relationship.type} relation`
    case 'rename-workspace':
      return `Renamed workspace to “${command.after}”`
    case 'batch':
      return command.commands.length === 1 && command.commands[0]
        ? describeCommand(command.commands[0])
        : `${command.commands.length} changes`
  }
}

/** Name the fields that actually changed — vague history entries are useless. */
function describeElementUpdate(before: Element, after: Element): string {
  const changed: string[] = []
  if (before.name !== after.name) changed.push('name')
  if (before.documentation !== after.documentation) changed.push('documentation')
  if (JSON.stringify(before.properties) !== JSON.stringify(after.properties)) {
    changed.push('properties')
  }
  if (JSON.stringify(before.profile) !== JSON.stringify(after.profile)) changed.push('assessment')
  const what = changed.length ? changed.join(', ') : 'element'
  return `Updated ${what} of “${after.name}”`
}

/** The inverse of a command — what undo applies. */
export function invert(command: Command): Command {
  switch (command.kind) {
    case 'add-element':
      return { kind: 'remove-element', element: command.element, cascaded: [] }
    case 'update-element':
      return { kind: 'update-element', before: command.after, after: command.before }
    case 'remove-element':
      return {
        kind: 'batch',
        commands: [
          { kind: 'add-element', element: command.element },
          ...command.cascaded.map((relationship): Command => ({
            kind: 'add-relationship',
            relationship,
          })),
        ],
      }
    case 'add-relationship':
      return { kind: 'remove-relationship', relationship: command.relationship }
    case 'update-relationship':
      return { kind: 'update-relationship', before: command.after, after: command.before }
    case 'remove-relationship':
      return { kind: 'add-relationship', relationship: command.relationship }
    case 'rename-workspace':
      return { kind: 'rename-workspace', before: command.after, after: command.before }
    case 'batch':
      // Undo a batch back to front, so ordering constraints hold in reverse.
      return { kind: 'batch', commands: [...command.commands].reverse().map(invert) }
  }
}
