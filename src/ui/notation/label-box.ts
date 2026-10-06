import type { Appearance } from '@/model'
import type { Box } from './glyphs'

/**
 * Where a tabbed shape, a Group or a Grouping, puts its label (#115).
 *
 * Archi draws top, or no position, in the tab row, centred in a one-line tab,
 * and an explicit middle or bottom over the whole box with the tab left empty:
 * measured off Archi's own render in text-position.test, and read off
 * `GroupFigure` and `GroupingFigure` with javap. A box too small to hold the
 * label keeps it in the tab rather than lose it (#117 review).
 */
export function labelInTab(appearance: Appearance | undefined, whole: Box): boolean {
  const position = appearance?.textPosition
  if (position !== 'middle' && position !== 'bottom') return true
  return whole.w <= 0 || whole.h <= 0
}

/**
 * The label's box, and the appearance it is drawn with. In the tab the label is
 * centred whatever its position says: Archi's top *is* the tab row, and an
 * explicit top laid out at the tab's top edge sat 3 px above Archi's, and above
 * an absent one (#117 review).
 */
export function tabbedLabel(
  appearance: Appearance | undefined,
  inTab: boolean,
  tab: Box,
  whole: Box,
): { box: Box; appearance: Appearance | undefined } {
  if (!inTab) return { box: whole, appearance }
  if (appearance?.textPosition === undefined) return { box: tab, appearance }
  return { box: tab, appearance: { ...appearance, textPosition: 'middle' } }
}

/**
 * Archi's width for a tab its label has left: `GroupFigure` halves the box and
 * `GroupingFigure` divides it by its `INSET`, 1.4. Sized to a name it no longer
 * holds, a long name drew a full-width strip (#117 review).
 */
export function emptyTabWidth(width: number, shape: 'group' | 'grouping'): number {
  return Math.trunc(width / (shape === 'group' ? 2 : 1.4))
}
