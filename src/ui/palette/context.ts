import { createContext, useContext, useEffect } from 'react'
import type { PaletteAction } from './CommandPalette'

export interface PaletteContextValue {
  open: boolean
  openPalette: () => void
  closePalette: () => void
  /**
   * Actions the screen on show adds to the palette (#130: the view editor's
   * "New element in view…"). One screen at a time; `[]` takes them away.
   */
  setScreenActions: (actions: PaletteAction[]) => void
}

export const PaletteContext = createContext<PaletteContextValue | null>(null)

export function usePalette(): PaletteContextValue {
  const value = useContext(PaletteContext)
  if (!value) throw new Error('usePalette must be used inside <PaletteProvider>')
  return value
}

/**
 * Offer `actions` in the command palette while the calling screen is mounted.
 * Pass a memoised array: a new one each render re-registers each render. A
 * screen rendered without the palette, as in a unit test, offers nothing.
 */
export function useScreenActions(actions: PaletteAction[]): void {
  const palette = useContext(PaletteContext)
  const set = palette?.setScreenActions
  useEffect(() => {
    if (!set) return
    set(actions)
    return () => set([])
  }, [set, actions])
}
