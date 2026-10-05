import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { Appearance, ViewNode } from '@/model'
import { importArchimate } from '@/io/archimate-native'
import fixture from '@/io/fixtures/text-position.archimate?raw'
import { GroupShape, NoteShape } from './DiagramObjectShapes'
import { ElementShape } from './ElementShape'

/**
 * Where a label sits when Archi wrote no `textPosition` (#108).
 *
 * EMF writes nothing at the default, top, so the native reader leaves the
 * position unset and each shape's own default applies. For box elements and
 * notes that default is top, as in Archi. For groups and Groupings it is
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
 *
 * So top in Archi is the tab row, and the label is centred in a one-line tab,
 * which is what Archipelago's `middle`-of-the-tab draws. No reader change is
 * needed. Archi places an *explicit* middle or bottom over the whole box, even
 * on a group, and leaves the tab empty; Archipelago kept it in the tab until #115.
 *
 * Elements drawn as a figure (Archi's `type="1"`) are not drawn in imported
 * views; the reader reports the figure as undrawn, so their defaults are not
 * reachable from a file. #115 records how Archi places them.
 */

const { workspace } = importArchimate(fixture)
const nodes = new Map((workspace?.views[0]?.nodes ?? []).map((node) => [node.id, node]))
const elements = new Map((workspace?.elements ?? []).map((element) => [element.id, element]))

function node(id: string): ViewNode {
  const found = nodes.get(id)
  if (!found) throw new Error(`no node ${id} in text-position.archimate`)
  return found
}

function svg(shape: ReactElement): SVGSVGElement {
  const { container } = render(<svg>{shape}</svg>)
  return container.querySelector('svg')!
}

/** The vertical centre of the first line, from its baseline (`NotationText`'s own metrics). */
function firstLineCentre(root: SVGSVGElement, appearance?: Appearance): number {
  const size = appearance?.fontSize ?? 12
  const baseline = Number(root.querySelector('tspan')!.getAttribute('y'))
  return baseline - size * 0.3
}

function drawn(id: string): { root: SVGSVGElement; appearance: Appearance | undefined } {
  const n = node(id)
  const { width, height } = n.bounds
  const appearance = n.appearance
  const props = { width, height, ...(appearance ? { appearance } : {}) }
  switch (n.kind) {
    case 'group':
      return { root: svg(<GroupShape {...props} name={n.name} />), appearance }
    case 'note':
      return {
        root: svg(<NoteShape {...props} text={n.text} appearance={appearance} />),
        appearance,
      }
    case 'element': {
      const element = elements.get(n.element)!
      return {
        root: svg(<ElementShape {...props} type={element.type} name={element.name} />),
        appearance,
      }
    }
    default:
      throw new Error(`unexpected ${n.kind}`)
  }
}

/** The tab's width, off the drawn path (`M0,0H<w>V…H0Z`). */
function tabWidth(root: SVGSVGElement): number {
  const d = root.querySelector('path')!.getAttribute('d')!
  return Number(/^M0,0H([\d.]+)/.exec(d)![1])
}

/** The tab's height, off the drawn path (`M0,0H…V<h>H0Z`). */
function tabHeight(root: SVGSVGElement): number {
  const d = root.querySelector('path')!.getAttribute('d')!
  return Number(/V([\d.]+)/.exec(d)![1])
}

describe('an absent textPosition, read from a file Archi saved (#108)', () => {
  it.each(['group', 'grouping', 'businessactor', 'note'])(
    'leaves the %s’s position unset',
    (kind) => {
      expect(node(`o-${kind}-absent`).appearance?.textPosition).toBeUndefined()
      expect(node(`o-${kind}-1`).appearance?.textPosition).toBe('middle')
      expect(node(`o-${kind}-2`).appearance?.textPosition).toBe('bottom')
    },
  )

  it('draws a group’s label centred in its tab, as Archi does', () => {
    const { root, appearance } = drawn('o-group-absent')
    const tab = tabHeight(root)
    expect(tab).toBeGreaterThan(15)
    expect(Math.abs(firstLineCentre(root, appearance) - tab / 2)).toBeLessThanOrEqual(1)
  })

  it('draws a Grouping’s label in the top row, centred in its tab, as Archi does', () => {
    const { root, appearance } = drawn('o-grouping-absent')
    const centre = firstLineCentre(root, appearance)
    // Archi: 10 from the top. The tab is one line plus 6 (ElementShape's groupingTab).
    expect(Math.abs(centre - (Math.round(12 * 1.25) + 6) / 2)).toBeLessThanOrEqual(1)
  })

  it.each(['businessactor', 'note'])('draws a %s’s label at the top, as Archi does', (kind) => {
    const absent = drawn(`o-${kind}-absent`)
    const middle = drawn(`o-${kind}-1`)
    const bottom = drawn(`o-${kind}-2`)
    // Archi: 11.5 and 12.5 at top; 60 and 107–108 for middle and bottom.
    expect(firstLineCentre(absent.root, absent.appearance)).toBeGreaterThan(5)
    expect(firstLineCentre(absent.root, absent.appearance)).toBeLessThan(18)
    expect(Math.abs(firstLineCentre(middle.root, middle.appearance) - 60)).toBeLessThanOrEqual(3)
    expect(firstLineCentre(bottom.root, bottom.appearance)).toBeGreaterThan(100)
    expect(firstLineCentre(bottom.root, bottom.appearance)).toBeLessThan(115)
  })

  // #115: Archi centres an explicit middle in the whole box (60), not the tab.
  it.each(['group', 'grouping'])(
    'draws a %s’s explicit middle and bottom over the whole box, with the tab empty (#115)',
    (kind) => {
      // Archi: 60 for middle and 108 for bottom, the tab left empty.
      const middle = drawn(`o-${kind}-1`)
      const bottom = drawn(`o-${kind}-2`)
      expect(Math.abs(firstLineCentre(middle.root, middle.appearance) - 60)).toBeLessThanOrEqual(3)
      expect(firstLineCentre(bottom.root, bottom.appearance)).toBeGreaterThan(100)
      expect(firstLineCentre(bottom.root, bottom.appearance)).toBeLessThan(115)
    },
  )

  it('keeps an explicit top in the tab row, like no position at all (#115)', () => {
    const absent = drawn('o-group-absent')
    const top = svg(
      <GroupShape
        width={180}
        height={120}
        name="Group absent"
        appearance={{ textPosition: 'top', textAlignment: 'center' }}
      />,
    )
    // Vertically, the tab row and the top of the box are 2 apart; a centred
    // label tells them apart by where its centre is: the tab's, or the box's.
    for (const root of [top, absent.root]) {
      const centreX = Number(root.querySelector('tspan')!.getAttribute('x'))
      expect(tabWidth(root)).toBeLessThan(150)
      expect(Math.abs(centreX - tabWidth(root) / 2)).toBeLessThanOrEqual(1)
      expect(firstLineCentre(root)).toBeLessThan(tabHeight(root))
    }
  })
})
