import { useSyncExternalStore } from 'react'
import type { Appearance, TextAlignment, TextPosition } from '@/model'
import type { Box } from './glyphs'
import { UI_FAMILY, getFontsVersion, quoteFamily, subscribeFonts, wrapText } from './text'

/**
 * A name wrapped into a box, honouring the text alignment, text position and
 * font overrides a view object can carry (#75). Names are human-authored
 * content, so the default face is the UI sans (UI spec §2.1).
 */

export interface NotationTextProps {
  name: string
  box: Box
  appearance?: Appearance | undefined
  defaultAlignment: TextAlignment
  defaultPosition: TextPosition
  /**
   * A corner the text must keep clear of (the type icon): lines whose top falls
   * within `height` of the box top are held to `width`. The rest use the box.
   */
  clear?: { height: number; width: number } | undefined
  /** How wide one unbreakable word may run before it is split; defaults to the box. */
  hardWidth?: number | undefined
}

const DEFAULT_SIZE = 12

export function NotationText({
  name,
  box,
  appearance,
  defaultAlignment,
  defaultPosition,
  clear,
  hardWidth,
}: NotationTextProps) {
  // Re-measure once the web font has loaded; widths taken before it are the fallback face's.
  useSyncExternalStore(subscribeFonts, getFontsVersion, getFontsVersion)
  if (!name || box.w <= 0 || box.h <= 0) return null
  const size = appearance?.fontSize ?? DEFAULT_SIZE
  const style = appearance?.fontStyle ?? []
  const bold = style.includes('bold')
  const italic = style.includes('italic')
  const family = appearance?.fontName
    ? `${quoteFamily(appearance.fontName)}, ${UI_FAMILY}`
    : UI_FAMILY
  const font = `${italic ? 'italic ' : ''}${bold ? '600 ' : ''}${size}px ${family}`
  const leading = Math.round(size * 1.25)
  const maxLines = Math.max(1, Math.floor(box.h / leading))
  const alignment = appearance?.textAlignment ?? defaultAlignment
  const position = appearance?.textPosition ?? defaultPosition
  // Only top-positioned text knows where its lines fall before layout; middle and
  // bottom text keeps clear of the corner on every line.
  const cleared = (i: number) =>
    clear !== undefined && (position !== 'top' || i * leading < clear.height)
  const lines = wrapText(name, (i) => (cleared(i) ? clear!.width : box.w), font, {
    maxLines,
    hardWidth: hardWidth ?? box.w,
  })
  // Right-aligned lines beside the corner end where the clear zone starts.
  const reserve = clear ? (box.w - clear.width) / 2 : 0

  const x = alignment === 'left' ? box.x : alignment === 'right' ? box.x + box.w : box.x + box.w / 2
  const anchor = alignment === 'left' ? 'start' : alignment === 'right' ? 'end' : 'middle'
  const blockH = lines.length * leading
  const top =
    position === 'top'
      ? box.y
      : position === 'bottom'
        ? box.y + box.h - blockH
        : box.y + (box.h - blockH) / 2
  // A baseline sits about 0.8 em below the top of its line box.
  const firstBaseline = top + (leading - size) / 2 + size * 0.8
  const decoration = [
    style.includes('underline') && 'underline',
    style.includes('strikethrough') && 'line-through',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <text
      x={x}
      textAnchor={anchor}
      fontSize={size}
      fontFamily={appearance?.fontName ? family : 'var(--font-ui)'}
      fontWeight={bold ? 600 : undefined}
      fontStyle={italic ? 'italic' : undefined}
      textDecoration={decoration || undefined}
      fill={appearance?.fontColor ?? 'var(--ink)'}
      pointerEvents="none"
    >
      {lines.map((line, i) => (
        <tspan
          key={i}
          x={alignment === 'right' && cleared(i) ? x - reserve : x}
          y={Math.round((firstBaseline + i * leading) * 100) / 100}
        >
          {line}
        </tspan>
      ))}
    </text>
  )
}
