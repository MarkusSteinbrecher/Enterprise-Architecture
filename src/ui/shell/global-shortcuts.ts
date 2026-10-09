import { createContext, useContext, useEffect } from 'react'
import {
  hasNativeUndo,
  historyShortcut,
  isModalOpen,
  isTypingTarget,
} from '@/ui/palette/typing-target'

/**
 * The page's global key bindings, and the one place they are run (#158).
 *
 * A global binding hears every key on the page, so it has to stand down while a
 * modal dialog is open: the dialog is what the keys are for. Each binding used
 * to have a window listener of its own with its own copy of that check, and ⌘K
 * was written without it, so the palette opened over the nesting prompt and
 * placing an element from it dropped the move the prompt was asking about.
 *
 * Now a binding is a row in `SHORTCUTS`, and `dispatchShortcut` asks
 * `isModalOpen()` before running any of them. A row says which presses it
 * answers; the component that owns the action says what it does, through
 * `useGlobalShortcut`, and never sees the event. So a new binding is guarded
 * because it exists, not because its author remembered. `global-shortcuts.test.tsx`
 * drives every row under a dialog, and fails on a row it has no case for.
 */

export interface Shortcut {
  /** Does this press ask for the binding? */
  readonly matches: (event: KeyboardEvent) => boolean
  /**
   * Keep the browser's own action for this press away even when the binding
   * stands down, as it does under a dialog: ⌘S would open Save Page, and ⌘K
   * would search from the address bar.
   */
  readonly claimsBrowserKey?: boolean
}

const chord = (event: KeyboardEvent, letter: string) =>
  (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === letter

/**
 * A bare letter, and not one typed into a field: the handoff prototype's
 * single-letter bindings navigated away on the `g` of "graph" typed into the
 * inventory's name filter (its known gap #1).
 */
const bare = (event: KeyboardEvent, letter: string) =>
  !(event.metaKey || event.ctrlKey || event.altKey) &&
  event.key.toLowerCase() === letter &&
  !isTypingTarget(event.target)

export const SHORTCUTS = {
  /** ⌘K / Ctrl+K opens the command palette. */
  palette: { matches: (event) => chord(event, 'k'), claimsBrowserKey: true },
  /** ⌘S / Ctrl+S saves, as in every other tool that owns a file. */
  save: { matches: (event) => chord(event, 's'), claimsBrowserKey: true },
  /**
   * ⌘Z undoes and ⇧⌘Z / Ctrl+Y redo (#88), except in a text field, which keeps
   * its own undo of the typing.
   */
  undo: {
    matches: (event) => historyShortcut(event) === 'undo' && !hasNativeUndo(event.target),
  },
  redo: {
    matches: (event) => historyShortcut(event) === 'redo' && !hasNativeUndo(event.target),
  },
  /** `g` goes to the graph, `i` to the inventory. */
  graph: { matches: (event) => bare(event, 'g') },
  inventory: { matches: (event) => bare(event, 'i') },
} satisfies Record<string, Shortcut>

export type ShortcutId = keyof typeof SHORTCUTS

export const SHORTCUT_IDS = Object.keys(SHORTCUTS) as ShortcutId[]

/** Run the binding a press asks for, unless a modal dialog is open. */
export function dispatchShortcut(
  event: KeyboardEvent,
  handlers: ReadonlyMap<ShortcutId, () => void>,
): void {
  const id = SHORTCUT_IDS.find((candidate) => SHORTCUTS[candidate].matches(event))
  if (!id) return
  const shortcut: Shortcut = SHORTCUTS[id]
  if (shortcut.claimsBrowserKey) event.preventDefault()
  const run = handlers.get(id)
  // The one check every binding passes through.
  if (!run || isModalOpen()) return
  event.preventDefault()
  run()
}

export interface ShortcutRegistry {
  /** Make `run` what `id` does; the returned function takes it back. */
  register: (id: ShortcutId, run: () => void) => () => void
}

export const GlobalShortcutsContext = createContext<ShortcutRegistry | null>(null)

/**
 * Make `run` what the binding `id` does while the calling component is mounted.
 * It runs only when no modal dialog is open; that is the dispatcher's job, not
 * the caller's.
 */
export function useGlobalShortcut(id: ShortcutId, run: () => void): void {
  const registry = useContext(GlobalShortcutsContext)
  if (!registry) throw new Error('useGlobalShortcut must be used inside <GlobalShortcutsProvider>')
  useEffect(() => registry.register(id, run), [registry, id, run])
}
