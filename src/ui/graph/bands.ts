import { elementTypeMeta, type Element } from '@/model'

/**
 * The three horizontal bands of the dependency graph (handoff "Screen 3").
 *
 * The bands are the cluster affordance — the "cluster" primitive of concept §4.3
 * in its simplest form — and they are what makes a landscape readable at a
 * glance: business on top, applications in the middle, technology underneath.
 *
 * **Where the other layers go.** Strategy, Motivation and Implementation &
 * Migration have no band of their own. They are placed in BUSINESS rather than
 * omitted: a capability, the goal that drives a programme and the work package
 * that delivers it all describe intent and change to the business, and dropping
 * them would hide exactly the elements that explain why the landscape looks the
 * way it does. Physical joins Technology, as the specification treats it.
 */

export const BANDS = ['business', 'application', 'technology'] as const
export type Band = (typeof BANDS)[number]

export const BAND_LABELS: Record<Band, string> = {
  business: 'BUSINESS',
  application: 'APPLICATION',
  technology: 'TECHNOLOGY',
}

/** Colour group whose 4%-mix fill tints the band rectangle. */
export const BAND_TINTS: Record<Band, string> = {
  business: 'var(--biz)',
  application: 'var(--app)',
  technology: 'var(--tec)',
}

export function bandOf(element: Element): Band {
  switch (elementTypeMeta(element.type).layer) {
    case 'application':
      return 'application'
    case 'technology':
    case 'physical':
      return 'technology'
    default:
      // strategy, business, motivation, implementation, other
      return 'business'
  }
}

/**
 * ELK partition index. Layout runs bottom-up (`elk.direction: UP`), so partition
 * 0 is the lowest band on screen.
 */
export function partitionOf(band: Band): number {
  return BANDS.length - 1 - BANDS.indexOf(band)
}
