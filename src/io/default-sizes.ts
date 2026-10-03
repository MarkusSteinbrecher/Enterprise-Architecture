import type { ElementType, ViewNodeKind } from '@/model'

/**
 * The size Archi draws a shape at when the file does not say (#13).
 *
 * Archi stores a shape left at its default size as `width="-1" height="-1"`, and
 * its exchange export writes those through as `w="-1" h="-1"`, which its own XSD
 * rejects. Both readers resolve them to what Archi shows on screen. These are
 * Archi's out-of-the-box figure defaults; a user can change the element default
 * in Archi's preferences, and nothing in the file records that, so a model drawn
 * with a different default can come in at a different size.
 */
export function defaultNodeSize(
  kind: ViewNodeKind,
  elementType?: ElementType,
): { width: number; height: number } {
  if (kind === 'group') return { width: 400, height: 140 }
  if (kind === 'note') return { width: 185, height: 80 }
  if (elementType === 'Junction') return { width: 15, height: 15 }
  if (elementType === 'Grouping') return { width: 400, height: 140 }
  return { width: 120, height: 55 }
}
