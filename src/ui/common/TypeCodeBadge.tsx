import { elementTypeMeta, type ElementType } from '@/model'
import './type-code-badge.css'

/**
 * The two-letter monospace type code in a layer-coloured box (UI spec §2.2,
 * ADR UI-2) — the deliberate substitute for the ArchiMate shape set.
 *
 * It is legible at 17px, needs no vendored SVG library, and works identically in
 * the table, cards, graph, breadcrumb, relation rows and the palette. The size
 * varies by context, so it is a prop rather than five near-identical components.
 */

export interface TypeCodeBadgeProps {
  type: ElementType
  /** Box edge in px — 17 relation rows, 19 table/palette, 22 cards, 38 fact sheet. */
  size?: number
  /** Font size in px; defaults to a proportion of `size`. */
  fontSize?: number
  title?: string
}

export function TypeCodeBadge({ type, size = 19, fontSize, title }: TypeCodeBadgeProps) {
  const meta = elementTypeMeta(type)
  return (
    <span
      className="type-code"
      title={title ?? meta.label}
      style={{
        width: size,
        height: size,
        fontSize: fontSize ?? Math.max(7, Math.round(size * 0.45 * 10) / 10),
        color: `var(--${meta.colourGroup})`,
        borderColor: `var(--${meta.colourGroup})`,
        background: `var(--${meta.colourGroup}bg)`,
      }}
    >
      {meta.code}
    </span>
  )
}
