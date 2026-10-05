import type { Appearance } from '@/model'
import type { Box } from './glyphs'

const PAD = 5

/**
 * Where a tabbed shape's label goes. Top, or no position, is the tab row, where
 * Archi draws it; an explicit middle or bottom is placed over the whole box and
 * the tab is left empty, as Archi does (#115, measured in text-position.test).
 */
export function labelBox(appearance: Appearance | undefined, tab: Box, w: number, h: number): Box {
  const position = appearance?.textPosition
  if (position === undefined || position === 'top') return tab
  return { x: PAD, y: PAD, w: w - PAD * 2, h: h - PAD * 2 }
}
