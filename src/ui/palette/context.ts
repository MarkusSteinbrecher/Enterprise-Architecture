import { createContext, useContext } from 'react'

export interface PaletteContextValue {
  open: boolean
  openPalette: () => void
  closePalette: () => void
}

export const PaletteContext = createContext<PaletteContextValue | null>(null)

export function usePalette(): PaletteContextValue {
  const value = useContext(PaletteContext)
  if (!value) throw new Error('usePalette must be used inside <PaletteProvider>')
  return value
}
