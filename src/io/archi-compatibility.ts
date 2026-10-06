/**
 * Archi's compatibility handlers (#118): what Archi 5.10 changes in a model as it
 * opens it, keyed on the model's `version` attribute and not on its namespace.
 *
 * Each rule is the `isVersion` of a handler in
 * `com.archimatetool.editor/.../model/compatibility/handlers/` (archimatetool/archi,
 * commit fbfa4474), run in the order `plugin.xml` registers them. Archi 5.10's own
 * save of one model opened under each version around each threshold is checked in
 * under `fixtures/archi-compatibility/`; `archi-compatibility.test.ts` reads both.
 */

export interface Compatibility {
  /** `FixDefaultSizesHandler`, below 3.0.0: an unset size is given one, a container grown to hold its children. */
  defaultSizes: boolean
  /** `Archimate2To3Handler`, below 4.0.0: the Connectors and Derived Relations folders are emptied into Other and Relations, and Location, Meaning and Value leave Business. */
  archimate2To3: boolean
  /** `DefaultTextAlignmentHandler`, below 4.4.0: a group's or Grouping's centre alignment, the default, becomes left. */
  leftAlignedGroups: boolean
  /** `OutlineOpacityHandler`, exactly 4.0.1 or 4.4.0: every shape's outline opacity becomes its fill opacity. */
  outlineOpacity: boolean
  /** `Archimate32Handler`, below 5.0.0: thirteen element types swap their figure between 0 and 1. */
  alternateFigures: boolean
}

/**
 * What Archi does to a model of this version. An absent attribute is EMF's default
 * for it, `""`, which is not `null`, so every `< x` rule fires: Archi 5.10 opened
 * the same model with no version exactly as it opened it at 2.9.9.
 */
export function compatibilityOf(version: string | undefined): Compatibility {
  const n = archiVersionNumber(version ?? '')
  return {
    defaultSizes: n < archiVersionNumber('3.0.0'),
    archimate2To3: n < archiVersionNumber('4.0.0'),
    leftAlignedGroups: n < archiVersionNumber('4.4.0'),
    outlineOpacity: n === archiVersionNumber('4.0.1') || n === archiVersionNumber('4.4.0'),
    alternateFigures: n < archiVersionNumber('5.0.0'),
  }
}

/**
 * `StringUtils.versionNumberAsInt`: up to three dot-separated Java ints packed as
 * major << 16 + minor << 8 + patch, in Java's 32-bit arithmetic. Anything else,
 * blank, four parts or a part that is not an int (`4.4.0-beta`), is 0, older than
 * every threshold, as Archi 5.10 showed for `4.4.0.1`. Java's `split` drops
 * trailing empty parts, so `4.4.` is 4.4.
 */
export function archiVersionNumber(version: string): number {
  const parts = version.split('.')
  while (parts.at(-1) === '') parts.pop()
  if (parts.length === 0 || parts.length > 3) return 0
  const ints = parts.map(javaInt)
  if (ints.some((part) => part === undefined)) return 0
  const [major = 0, minor = 0, patch = 0] = ints as number[]
  return ((major << 16) + (minor << 8) + patch) | 0
}

/** `Integer.parseInt`: an optional sign and decimal digits, within 32 bits. */
function javaInt(text: string): number | undefined {
  if (!/^[+-]?\d+$/.test(text)) return undefined
  const n = Number(text)
  return n >= -2147483648 && n <= 2147483647 ? n : undefined
}

/**
 * The size Archi's `FixDefaultSizesHandler.getDefaultSize` gives a shape with no
 * size of its own. Not the size Archi draws one at today (`default-sizes.ts`): an
 * element is the legacy 120 × 55 whatever its type, so a Grouping is too, and an
 * image, which Archipelago does not draw, counts towards its container at 200 × 150.
 */
export function legacyDefaultSize(
  type: string,
  elementType: string | undefined,
): { width: number; height: number } {
  switch (type) {
    case 'Group':
      return { width: 400, height: 140 }
    case 'Note':
      return { width: 185, height: 80 }
    case 'DiagramModelImage':
      return { width: 200, height: 150 }
    case 'DiagramObject':
      return elementType === 'Junction' ? { width: 15, height: 15 } : { width: 120, height: 55 }
    default:
      return { width: 120, height: 55 }
  }
}

/** The shapes that hold others: `IDiagramModelContainer` in Archi's model. */
export function isLegacyContainer(type: string): boolean {
  return type === 'Group' || type === 'DiagramObject'
}

/**
 * The element types whose figure `Archimate32Handler` swaps, from its source. A
 * figure other than 0 is one Archipelago does not draw.
 */
export const SWAPPED_FIGURES: ReadonlySet<string> = new Set([
  'Grouping',
  'BusinessObject',
  'Contract',
  'Representation',
  'Product',
  'DataObject',
  'Meaning',
  'Value',
  'Deliverable',
  'ApplicationComponent',
  'Artifact',
  'Device',
  'Node',
])

/** The top-level folders `Archimate2To3Handler` empties, by name as it matches them, and where their contents go. */
export const EMPTIED_FOLDERS: ReadonlyMap<string, 'other' | 'relations'> = new Map([
  ['Connectors', 'other'],
  ['Derived Relations', 'relations'],
])

/** The element types `Archimate2To3Handler` moves out of the Business folder, at any depth. */
export const MOVED_FROM_BUSINESS: ReadonlySet<string> = new Set(['Location', 'Meaning', 'Value'])

/** Folder types an older Archi wrote and Archi 5.10 no longer has (Archi 3.3.2's `FolderType`). */
export const RETIRED_FOLDER_TYPES: ReadonlySet<string> = new Set(['connectors', 'derived'])
