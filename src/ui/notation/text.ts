/**
 * Text layout for SVG shapes. SVG does not wrap, so names are broken into lines
 * here. Width comes from a canvas `measureText` in the browser; where there is no
 * canvas (jsdom), an average-advance estimate keeps tests deterministic.
 */

/** The concrete family behind `--font-ui`, for canvas measurement (which cannot read a CSS variable). */
export const UI_FAMILY = "'Space Grotesk', system-ui, sans-serif"

export type Measure = (text: string, font: string) => number

let context: CanvasRenderingContext2D | null | undefined

function canvasMeasure(text: string, font: string): number {
  if (context === undefined) {
    try {
      context = document.createElement('canvas').getContext('2d')
    } catch {
      context = null
    }
  }
  if (!context) return estimate(text, font)
  context.font = font
  return context.measureText(text).width
}

/**
 * Canvas measures with a fallback face until the web font has loaded, so a width
 * taken before then is wrong and must not be cached. `fontsVersion` bumps when
 * fonts finish loading; text components subscribe to it and lay out again.
 */
let fontsVersion = 0
const fontListeners = new Set<() => void>()

function fontReady(font: string): boolean {
  try {
    return typeof document === 'undefined' || !document.fonts || document.fonts.check(font)
  } catch {
    return true
  }
}

if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.addEventListener?.('loadingdone', () => {
    cache.clear()
    cached = 0
    fontsVersion++
    for (const listener of fontListeners) listener()
  })
}

export function subscribeFonts(listener: () => void): () => void {
  fontListeners.add(listener)
  return () => fontListeners.delete(listener)
}

export function getFontsVersion(): number {
  return fontsVersion
}

/** Average advance of a proportional sans at this size: close enough to lay out by. */
function estimate(text: string, font: string): number {
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 12)
  return text.length * size * 0.55
}

/**
 * Widths are memoised per font and string: a view lays out the same names on every
 * render, and `measureText` is the expensive part of wrapping.
 */
const cache = new Map<string, Map<string, number>>()
const CACHE_LIMIT = 20_000
let cached = 0

export const measureText: Measure = (text, font) => {
  // Keyed per font, then per string — never a joined key: the font family comes
  // from user appearance data and may contain any character.
  let widths = cache.get(font)
  if (!widths) cache.set(font, (widths = new Map()))
  let width = widths.get(text)
  if (width === undefined) {
    width = canvasMeasure(text, font)
    if (!fontReady(font)) return width
    if (cached >= CACHE_LIMIT) {
      cache.clear()
      cached = 0
      cache.set(font, (widths = new Map()))
    }
    widths.set(text, width)
    cached++
  }
  return width
}

/** A line's width budget: one number for every line, or one per line index. */
export type LineWidth = number | ((line: number) => number)

/**
 * Break `text` into lines, honouring explicit line breaks. Each line aims for its
 * `width` budget; the budget can vary per line, so the lines beside a corner icon
 * are narrower than the rest.
 *
 * A word that misses its line's budget moves to the next line. Alone on a line,
 * it is allowed up to `hardWidth`, the full width of the box, rather than being
 * split; only a word wider than the whole box is broken by character. At most
 * `maxLines` lines; when text is cut, the last line ends in an ellipsis.
 */
export function wrapText(
  text: string,
  width: LineWidth,
  font: string,
  {
    maxLines = Infinity,
    hardWidth,
    measure = measureText,
  }: { maxLines?: number; hardWidth?: number; measure?: Measure } = {},
): string[] {
  const budget = (i: number) => Math.max(typeof width === 'number' ? width : width(i), 1)
  const hard = Math.max(hardWidth ?? (typeof width === 'number' ? width : 0), 1)
  const lines: string[] = []
  for (const paragraph of text.split(/\r\n|\r|\n/)) {
    let line = ''
    for (const word of paragraph.split(/ +/)) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate, font) <= budget(lines.length)) {
        line = candidate
        continue
      }
      if (line) {
        lines.push(line)
        line = ''
        if (measure(word, font) <= budget(lines.length)) {
          line = word
          continue
        }
      }
      let rest = word
      // Alone on its line and within the box: keep the word whole.
      if (measure(rest, font) <= Math.max(hard, budget(lines.length))) {
        line = rest
        continue
      }
      // Wider than the box itself: break it by character.
      while (measure(rest, font) > hard && rest.length > 1) {
        let cut = rest.length - 1
        while (cut > 1 && measure(rest.slice(0, cut), font) > hard) cut--
        lines.push(rest.slice(0, cut))
        rest = rest.slice(cut)
      }
      line = rest
    }
    lines.push(line)
  }
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, Math.max(maxLines, 1))
  const lastWidth = Math.max(hard, budget(kept.length - 1))
  let last = `${kept[kept.length - 1]}…`
  while (last.length > 1 && measure(last, font) > lastWidth) last = `${last.slice(0, -2)}…`
  kept[kept.length - 1] = last
  return kept
}

/**
 * A family name as CSS needs it: quoted, with quotes and backslashes escaped and
 * line breaks as CSS escapes (a raw newline ends a CSS string).
 */
export function quoteFamily(name: string): string {
  const escaped = name.replace(/["\\]/g, (c) => `\\${c}`).replace(/\r\n|\r|\n/g, '\\a ')
  return `"${escaped}"`
}
