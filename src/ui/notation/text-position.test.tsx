import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { Appearance } from '@/model'
import { importArchimate } from '@/io/archimate-native'
import fixture from '@/io/fixtures/text-position.archimate?raw'
import { ViewDrawing } from '@/ui/views/ViewDrawing'
import { absoluteIndex, childrenIndex } from '@/ui/views/geometry'
import { GroupShape } from './DiagramObjectShapes'
import { ElementShape } from './ElementShape'

/**
 * Where a label sits when Archi wrote no `textPosition` (#108).
 *
 * EMF writes nothing at the default, top, so the native reader leaves the
 * position unset and each shape's own default applies. For box elements, notes
 * and view references that default is top, as in Archi. For groups and Groupings it is
 * `middle` of the tab, which looked like a mismatch. Archi settles it:
 * `text-position.archimate` was saved by Archi 5.10 and drawn by its HTML
 * report (`--html.createReport`). Each shape is 180 × 120. The label's centre
 * at absent is measured from the shape's top:
 *
 * | shape         | absent (top)           | `1` middle | `2` bottom |
 * | ------------- | ---------------------- | ---------- | ---------- |
 * | Group         | 9.5, mid-tab (tab 18.5) | 60, body   | 108, body  |
 * | Grouping      | 10                     | 60         | 108        |
 * | BusinessActor | 11.5                   | 60         | 108        |
 * | Note          | 12.5                   | 60         | 107        |
 * | View reference | 12                    | 60         | 108        |
 *
 * So top in Archi is the tab row, and the label is centred in a one-line tab,
 * which is what Archipelago's `middle`-of-the-tab draws. No reader change is
 * needed. Archi places an *explicit* middle or bottom over the whole box, even
 * on a group, and leaves the tab empty; so does Archipelago since #115.
 *
 * The view is drawn the way the canvas and the export draw it, through
 * `ViewDrawing`, and each label is held to Archi's number within 1.5 (#116
 * review: a test that compared Archipelago with itself let a label drift 8 px).
 *
 * Elements drawn as a figure (Archi's `type="1"`) are not drawn in imported
 * views; the reader reports the figure as undrawn, so their defaults are not
 * reachable from a file. #115 records how Archi places them.
 */

const workspace = importArchimate(fixture).workspace!
const view = workspace.views[0]!

/** The view as the canvas draws it. Rendered per test: each test's cleanup unmounts it. */
const drawing = () =>
  render(
    <svg>
      <ViewDrawing
        view={view}
        bounds={absoluteIndex(view)}
        children={childrenIndex(view)}
        lookups={{
          element: (id) => workspace.elements.find((element) => element.id === id),
          relationship: (id) => workspace.relationships.find((r) => r.id === id),
          viewName: (id) => workspace.views.find((v) => v.id === id)?.name,
        }}
      />
    </svg>,
  ).container

/**
 * How close a label must sit to Archi's. Archi's numbers are read off its 2×
 * report image, so they hold to half a pixel; a label 1.5 off is still Archi's.
 */
const NEAR = 1.5

/** Archi's label centres from the top of each shape: absent, `1`, `2` (see above). */
const ARCHI: Record<string, [number, number, number]> = {
  group: [9.5, 60, 108],
  grouping: [10, 60, 108],
  businessactor: [11.5, 60, 108],
  note: [12.5, 60, 107],
  viewref: [12, 60, 108],
}

/**
 * The vertical centre of a node's first line, in its own coordinates: the
 * baseline less 0.3 em, from `NotationText`'s metrics (a 12 px default face, a
 * baseline 0.8 em into a 1.25 em line). The fixture sets no font.
 */
function centre(id: string): number {
  const tspan = drawing().querySelector(`[data-node="${id}"] tspan`)
  if (!tspan) throw new Error(`no label drawn for ${id}`)
  return Number(tspan.getAttribute('y')) - 12 * 0.3
}

describe('an absent textPosition, read from a file Archi saved (#108)', () => {
  it.each(Object.keys(ARCHI))('leaves the %s’s position unset', (kind) => {
    const position = (id: string) =>
      view.nodes.find((node) => node.id === id)?.appearance?.textPosition
    expect(view.nodes.some((node) => node.id === `o-${kind}-absent`)).toBe(true)
    expect(position(`o-${kind}-absent`)).toBeUndefined()
    expect(position(`o-${kind}-1`)).toBe('middle')
    expect(position(`o-${kind}-2`)).toBe('bottom')
  })

  it.each(Object.keys(ARCHI))('draws an absent position on a %s where Archi does', (kind) => {
    expect(Math.abs(centre(`o-${kind}-absent`) - ARCHI[kind]![0])).toBeLessThanOrEqual(NEAR)
  })

  it.each(['businessactor', 'note', 'viewref'])(
    'draws a %s’s middle and bottom where Archi does',
    (kind) => {
      expect(Math.abs(centre(`o-${kind}-1`) - ARCHI[kind]![1])).toBeLessThanOrEqual(NEAR)
      expect(Math.abs(centre(`o-${kind}-2`) - ARCHI[kind]![2])).toBeLessThanOrEqual(NEAR)
    },
  )
})

/** A node's tab, off its first path (`M0,0H<w>V<h>H0Z`), as the canvas draws it. */
function tabOf(id: string): { w: number; h: number } {
  const d = drawing().querySelector(`[data-node="${id}"] path`)!.getAttribute('d')!
  const [, w, h] = /^M0,0H([\d.]+)V([\d.]+)/.exec(d)!
  return { w: Number(w), h: Number(h) }
}

/** The first line's centre in a shape drawn on its own (`centre`'s metric). */
function shapeCentre(shape: ReactElement): number {
  const { container } = render(<svg>{shape}</svg>)
  const tspan = container.querySelector('tspan')
  if (!tspan) throw new Error('no label drawn')
  return Number(tspan.getAttribute('y')) - 12 * 0.3
}

describe('an explicit textPosition on a tabbed shape (#115)', () => {
  it.each(['group', 'grouping'])('draws a %s’s middle and bottom where Archi does', (kind) => {
    expect(Math.abs(centre(`o-${kind}-1`) - ARCHI[kind]![1])).toBeLessThanOrEqual(NEAR)
    expect(Math.abs(centre(`o-${kind}-2`) - ARCHI[kind]![2])).toBeLessThanOrEqual(NEAR)
  })

  it.each([
    ['group', 90],
    ['grouping', 128],
  ] as const)('leaves a %s’s tab empty, at Archi’s width (%i of 180)', (kind, width) => {
    // GroupFigure halves the box; GroupingFigure divides it by 1.4.
    for (const id of [`o-${kind}-1`, `o-${kind}-2`]) expect(tabOf(id).w).toBe(width)
    // In the tab, the tab is sized to the name instead.
    expect(tabOf(`o-${kind}-absent`).w).not.toBe(width)
  })

  it.each([
    [
      'group',
      (a?: Appearance) => <GroupShape width={180} height={120} name="Group" appearance={a} />,
    ],
    [
      'grouping',
      (a?: Appearance) => (
        <ElementShape
          type="Grouping"
          width={180}
          height={120}
          name="Grouping"
          {...(a ? { appearance: a } : {})}
        />
      ),
    ],
  ] as const)(
    'draws a %s’s explicit top where an absent position goes, as Archi does',
    (kind, shape) => {
      // Archi never writes the default, so no saved file holds one; both read top.
      const absent = shapeCentre(shape())
      const top = shapeCentre(shape({ textPosition: 'top' }))
      expect(Math.abs(top - absent)).toBeLessThan(0.01)
      expect(Math.abs(top - ARCHI[kind]![0])).toBeLessThanOrEqual(NEAR)
    },
  )

  it('keeps the label of a box too small to hold it in the tab, rather than lose it', () => {
    const { container } = render(
      <svg>
        <GroupShape
          width={180}
          height={10}
          name="Collapsed"
          appearance={{ textPosition: 'middle' }}
        />
      </svg>,
    )
    expect(container.querySelector('tspan')?.textContent).toBe('Collapsed')
  })
})
