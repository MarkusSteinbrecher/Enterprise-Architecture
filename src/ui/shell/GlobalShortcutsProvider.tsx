import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  dispatchShortcut,
  GlobalShortcutsContext,
  type ShortcutId,
  type ShortcutRegistry,
} from './global-shortcuts'

/**
 * Holds what each global binding does, and the page's one listener for them
 * (#158). See `global-shortcuts.ts` for why there is only one.
 */
export function GlobalShortcutsProvider({ children }: { children: ReactNode }) {
  const handlers = useRef(new Map<ShortcutId, () => void>())

  const registry = useMemo<ShortcutRegistry>(
    () => ({
      register: (id, run) => {
        handlers.current.set(id, run)
        return () => {
          // Only our own: a newer registration for the same binding stays.
          if (handlers.current.get(id) === run) handlers.current.delete(id)
        }
      },
    }),
    [],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => dispatchShortcut(event, handlers.current)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <GlobalShortcutsContext.Provider value={registry}>{children}</GlobalShortcutsContext.Provider>
  )
}
