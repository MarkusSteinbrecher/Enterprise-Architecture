import {
  DEFAULT_LEGEND_OPTIONS,
  LEGEND_COLOURS,
  LEGEND_SORTS,
  legendRows,
  legendWidthOffset,
  type LegendOptions,
} from '@/model'

/**
 * A legend's options as Archi 5.10 writes them (#134): the value of the note's
 * `legend` feature, `display=15,rows=15,offset=0,color=1,sort=1`
 * (`LegendOptions.toFeatureString`, read at `release_5.10.0`). The `.archimate`
 * reader reads it from Archi's file, and the exchange writer carries it in the
 * view's `archipelago.style` in the same spelling, so both readers parse one
 * format with one parser.
 */
export const LEGEND_FEATURE = 'legend'

/** Archi's `display` bits (`LegendOptions.DISPLAY_*`). */
const DISPLAY = {
  elements: 1,
  relations: 2,
  specializedElements: 4,
  specializedRelations: 8,
} as const

/** The feature value Archi writes for `options`. */
export function legendFeatureValue(options: LegendOptions): string {
  let display = 0
  for (const [key, bit] of Object.entries(DISPLAY) as [keyof typeof DISPLAY, number][]) {
    if (options[key]) display |= bit
  }
  return [
    `display=${display}`,
    `rows=${options.rowsPerColumn}`,
    `offset=${options.widthOffset}`,
    `color=${LEGEND_COLOURS.indexOf(options.colours)}`,
    `sort=${LEGEND_SORTS.indexOf(options.sort)}`,
  ].join(',')
}

const INT_MIN = -(2 ** 31)
const INT_MAX = 2 ** 31 - 1

/**
 * `FeatureOptions.parseInteger`: the first `prefix=` followed by an integer,
 * anywhere in the value (`Matcher.find`, unanchored), or `undefined` where Archi
 * falls back to its default, which includes a number beyond Java's `int`.
 */
function parseInteger(value: string, prefix: string): number | undefined {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`${escaped}=\\s*(-?\\d+)\\s*`).exec(value)
  if (!match?.[1]) return undefined
  const n = Number(match[1])
  return n >= INT_MIN && n <= INT_MAX ? n : undefined
}

/**
 * The options a feature value gives, read as Archi's `LegendOptions(note)`
 * reads them: each key found anywhere, its default where it is missing or is
 * not an integer, and every number clamped by the setter Archi passes it to.
 * `asWritten` is false when the value is not what Archi would write for those
 * options, so the reader can say that something in it was read differently
 * from how it stands.
 */
export function parseLegendFeature(value: string): {
  options: LegendOptions
  asWritten: boolean
} {
  const display = parseInteger(value, 'display') ?? 15
  const rows = parseInteger(value, 'rows')
  const offset = parseInteger(value, 'offset')
  const colour = parseInteger(value, 'color')
  const sort = parseInteger(value, 'sort')
  const options: LegendOptions = {
    elements: (display & DISPLAY.elements) !== 0,
    relations: (display & DISPLAY.relations) !== 0,
    specializedElements: (display & DISPLAY.specializedElements) !== 0,
    specializedRelations: (display & DISPLAY.specializedRelations) !== 0,
    rowsPerColumn:
      rows === undefined
        ? DEFAULT_LEGEND_OPTIONS.rowsPerColumn
        : (legendRows(rows) ?? DEFAULT_LEGEND_OPTIONS.rowsPerColumn),
    widthOffset:
      offset === undefined
        ? DEFAULT_LEGEND_OPTIONS.widthOffset
        : (legendWidthOffset(offset) ?? DEFAULT_LEGEND_OPTIONS.widthOffset),
    // `colorScheme` and `sortMethod` clamp too.
    colours:
      colour === undefined
        ? DEFAULT_LEGEND_OPTIONS.colours
        : LEGEND_COLOURS[Math.min(Math.max(colour, 0), LEGEND_COLOURS.length - 1)]!,
    sort:
      sort === undefined
        ? DEFAULT_LEGEND_OPTIONS.sort
        : LEGEND_SORTS[Math.min(Math.max(sort, 0), LEGEND_SORTS.length - 1)]!,
  }
  return { options, asWritten: legendFeatureValue(options) === value }
}
