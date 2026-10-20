/**
 * The grid and the snapping a viewer has chosen (#136). A per-user preference,
 * as Archi keeps it, not model data: it lives in localStorage, and the editor
 * still works with Archi's defaults when storage is blocked.
 */

export const GRID_STORAGE_KEY = 'archipelago.view-grid'

export interface GridPreferences {
  /** The grid's spacing, in view units. */
  size: number
  /** The grid is drawn. */
  visible: boolean
  /** Moves and resizes snap to the grid. */
  snap: boolean
  /** Moves and resizes snap to other shapes' edges and centres, and show the guide. */
  guides: boolean
}

/**
 * Archi 5.10's defaults, from `PreferenceInitializer.initializeDefaultPreferences`
 * (read with `javap`): `gridSize` 12, `gridVisible` false, `gridSnap` true,
 * `gridShowGuidelines` true.
 */
export const GRID_DEFAULTS: GridPreferences = { size: 12, visible: false, snap: true, guides: true }

/** The range Archi's preference page allows: its spinner's minimum and maximum (`DiagramPreferencePage`). */
export const GRID_MIN = 5
export const GRID_MAX = 100

export function isGridSize(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= GRID_MIN && (value as number) <= GRID_MAX
}

/**
 * The stored preferences, each field through its guard: one that is missing or
 * malformed (a hand edit, a future version) falls back to Archi's default on
 * its own, without taking the others with it.
 */
export function readGridPreferences(): GridPreferences {
  let raw: unknown
  try {
    raw = JSON.parse(localStorage.getItem(GRID_STORAGE_KEY) ?? 'null')
  } catch {
    // Blocked storage (private mode, site-data policies) or unreadable JSON: Archi's defaults.
    return GRID_DEFAULTS
  }
  // `null` has no fields to read; a number, string or array has none of these, so each falls back.
  const stored = (raw ?? {}) as Record<string, unknown>
  const flag = (key: 'visible' | 'snap' | 'guides') =>
    typeof stored[key] === 'boolean' ? stored[key] : GRID_DEFAULTS[key]
  return {
    size: isGridSize(stored.size) ? stored.size : GRID_DEFAULTS.size,
    visible: flag('visible'),
    snap: flag('snap'),
    guides: flag('guides'),
  }
}

export function writeGridPreferences(preferences: GridPreferences): void {
  try {
    localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // The choice still applies; it just will not be remembered.
  }
}
