import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { absoluteBounds, type View } from '@/model'
import { SCREEN, setup } from '@/test/view-editor'

/**
 * A link that names a shape (`?node=`), a line (`?line=`) or an element
 * (`?element=`) opens the view with it selected and centred (#193 review,
 * finding 4). The canvas is given a size, so the auto-fit runs: jsdom lays
 * nothing out.
 *
 * "Centred" is read off the drawing's transform: the subject's centre, in
 * view coordinates, lands on the middle of the canvas. Each subject sits away
 * from the middle of the fitted landscape, so only the centring puts it there.
 */

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(SCREEN.width)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(SCREEN.height)
})

const selected = () =>
  screen.queryAllByTestId('selection').map((s) => s.getAttribute('data-selected'))

/** Where the view point `p` is drawn on the canvas. */
function onScreen(surface: Element, p: { x: number; y: number }) {
  const transform = surface.querySelector('svg > g')!.getAttribute('transform') ?? ''
  const match = /translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/.exec(transform)
  if (!match) throw new Error(`no viewport in "${transform}"`)
  const [x, y, zoom] = match.slice(1).map(Number) as [number, number, number]
  return { x: p.x * zoom + x, y: p.y * zoom + y }
}

const MIDDLE = { x: SCREEN.width / 2, y: SCREEN.height / 2 }

/** The centre of a shape in view coordinates: a nested shape's bounds are its parent's. */
function centreOf(view: View, nodeId: string) {
  const b = absoluteBounds(view, nodeId)!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

describe('opening a view on a subject', () => {
  // Zürich, at the landscape's right edge: (1315, 857.5).
  const ZURICH = 'o-zurich'
  // Customer → Insurant: the line centres on its source, Customer at (115, 87.5),
  // nested in the business group.
  const LINE = 'c-cust-ins'

  it('fits the drawing when the link names nothing, which leaves each subject off the middle', () => {
    const { surface, view } = setup()
    for (const id of [ZURICH, 'o-customer', 'o-insurant']) {
      const at = onScreen(surface, centreOf(view(), id))
      expect(Math.hypot(at.x - MIDDLE.x, at.y - MIDDLE.y)).toBeGreaterThan(100)
    }
  })

  it('centres on the shape `?node=` names, and selects it', () => {
    const { surface, view } = setup('writer', { search: `?node=${ZURICH}` })
    expect(selected()).toEqual([ZURICH])
    expect(onScreen(surface, centreOf(view(), ZURICH))).toEqual(MIDDLE)
  })

  it('centres on the source of the line `?line=` names, and selects it', () => {
    const { surface, view } = setup('writer', { search: `?line=${LINE}` })
    expect(selected()).toEqual([LINE])
    const line = view().connections.find((c) => c.id === LINE)!
    expect(line.source).toBe('o-customer')
    expect(onScreen(surface, centreOf(view(), line.source))).toEqual(MIDDLE)
  })

  it('centres on the drawing of the element `?element=` names, and selects it', () => {
    // Zürich's element, which the landscape draws once.
    const { surface, view } = setup('writer', { search: '?element=loc-zurich' })
    expect(selected()).toEqual([ZURICH])
    expect(onScreen(surface, centreOf(view(), ZURICH))).toEqual(MIDDLE)
  })
})
