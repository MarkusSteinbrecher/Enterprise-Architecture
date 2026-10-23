import { afterEach, describe, expect, it } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { toCanonicalJson } from '@/io/canonical-json'
import { absoluteBounds } from '@/model'
import type { ModelStore } from '@/store'
import { stubDownloads } from '@/test/downloads'
import { LANDSCAPE, click, drag, drawnAt, drop, setup, type User } from '@/test/view-editor'
import { ELEMENT_DRAG_TYPE } from './create'
import { buildViewSvg } from './export-view'
import { GHOST_OPACITY } from './ViewDrawing'

/**
 * Ghosting on the canvas (#194): a shape whose element the view's viewpoint
 * does not allow is drawn ghosted, and so is a line with such a shape at an
 * end, as in Archi 5.10. The claims landscape is drawn with Layered, which
 * allows everything; Application Cooperation allows the application layer and
 * Location, so Customer (a Business Actor) is refused and Claims Portal (an
 * Application Component) is not.
 *
 * Every assertion that something is not ghosted comes after the shape has been
 * found, so a canvas that has not drawn cannot pass it.
 */

const COOPERATION = 'Application Cooperation'
const CUSTOMER = { x: 60, y: 80 }
const PORTAL = { x: 60, y: 520 }
const EMPTY_SPOT = { x: 1600, y: 100 }

const model = (store: ModelStore) => toCanonicalJson(store.snapshot())
const withCooperation = (s: ModelStore) =>
  s.updateView(LANDSCAPE, (v) => ({ ...v, viewpoint: COOPERATION }))
const viewpointSelect = () => screen.getByRole('combobox', { name: 'Viewpoint' })
const ghosts = (canvas: Element) =>
  [...canvas.querySelectorAll('[data-ghost]')].map(
    (el) => el.getAttribute('data-node') ?? el.getAttribute('data-connection'),
  )

afterEach(() => document.documentElement.style.removeProperty('--ghost-opacity'))

/** Select a line by a click on its hit path, and return its panel. */
async function selectLine(user: User, canvas: Element, id: string) {
  const hit = canvas.querySelector(`[data-line-hit="${id}"]`)!
  const [a, b] = hit
    .getAttribute('d')!
    .slice(1)
    .split('L')
    .map((pair) => pair.split(',').map(Number) as [number, number])
  await click(user, hit, { x: (a![0] + b![0]) / 2, y: (a![1] + b![1]) / 2 })
  expect(screen.getByTestId('selection')).toHaveAttribute('data-selected', id)
  return screen.getByRole('complementary', { name: /^Selected( line|: .* relationship)$/ })
}

describe('ghosting on the canvas (#194)', () => {
  it('ghosts a Business Actor under Application Cooperation, not an Application Component, and neither under None', async () => {
    const { user, nodeEl, canvas } = setup()
    await user.selectOptions(viewpointSelect(), COOPERATION)
    expect(nodeEl('o-customer')).toHaveAttribute('data-ghost', 'true')
    expect(nodeEl('o-customer')).toHaveAttribute('opacity', GHOST_OPACITY)
    expect(nodeEl('o-portal')).toBeInTheDocument()
    expect(nodeEl('o-portal')).not.toHaveAttribute('data-ghost')
    expect(nodeEl('o-portal')).not.toHaveAttribute('opacity')

    await user.selectOptions(viewpointSelect(), 'None')
    expect(nodeEl('o-customer')).toBeInTheDocument()
    expect(nodeEl('o-customer')).not.toHaveAttribute('data-ghost')
    expect(nodeEl('o-customer')).not.toHaveAttribute('opacity')
    expect(ghosts(canvas)).toEqual([])
  })

  it('ghosts a line with a ghosted end, and not one between two allowed shapes', async () => {
    const { user, canvas } = setup()
    await user.selectOptions(viewpointSelect(), COOPERATION)
    const line = (id: string) => canvas.querySelector(`[data-connection="${id}"]`)!
    // Technology Service → Application Component: the source is refused.
    expect(line('c-hosting-engine')).toHaveAttribute('data-ghost', 'true')
    expect(line('c-hosting-engine')).toHaveAttribute('opacity', GHOST_OPACITY)
    expect(line('c-portal-engine')).toBeInTheDocument()
    expect(line('c-portal-engine')).not.toHaveAttribute('data-ghost')
  })

  it('re-ghosts at once when the viewpoint changes, and one undo restores the viewpoint and the drawing', async () => {
    const { store, dispatch, user, nodeEl, canvas, view } = setup()
    const json = model(store)
    await user.selectOptions(viewpointSelect(), COOPERATION)
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(nodeEl('o-customer')).toHaveAttribute('data-ghost', 'true')

    act(() => void store.undo())
    expect(view().viewpoint).toBe('Layered')
    expect(viewpointSelect()).toHaveValue('Layered')
    expect(nodeEl('o-customer')).toBeInTheDocument()
    expect(nodeEl('o-customer')).not.toHaveAttribute('data-ghost')
    expect(ghosts(canvas)).toEqual([])
    expect(model(store)).toBe(json)
  })
})

describe('a ghosted shape is still a shape (#194)', () => {
  it('is selected, and its panel names the viewpoint that excludes it', async () => {
    const { user, nodeEl } = setup('writer', { prepare: withCooperation })
    await click(user, nodeEl('o-customer'), CUSTOMER)
    const panel = screen.getByRole('complementary', { name: 'Selected: Customer' })
    expect(panel).toHaveTextContent(
      'Ghosted: the Application Cooperation viewpoint does not allow this element.',
    )
  })

  it('says nothing about ghosting in the panel of a shape the viewpoint allows', async () => {
    const { user, nodeEl } = setup('writer', { prepare: withCooperation })
    await click(user, nodeEl('o-portal'), PORTAL)
    const panel = screen.getByRole('complementary', { name: 'Selected: Claims Portal' })
    expect(within(panel).getByText('Open fact sheet')).toBeInTheDocument()
    expect(panel).not.toHaveTextContent(/Ghosted/)
  })

  it('moves by a drag, as one command, and stays ghosted', async () => {
    const { dispatch, user, nodeEl, view } = setup('writer', { prepare: withCooperation })
    const before = absoluteBounds(view(), 'o-customer')!
    await drag(user, nodeEl('o-customer'), CUSTOMER, { x: 75, y: 85 }, { x: 90, y: 100 })
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(drawnAt(nodeEl('o-customer'))).toEqual({ x: before.x + 30, y: before.y + 20 })
    expect(nodeEl('o-customer')).toHaveAttribute('data-ghost', 'true')
  })

  it('is removed from the view with Delete', async () => {
    const { dispatch, user, nodeEl, canvas } = setup('writer', { prepare: withCooperation })
    await click(user, nodeEl('o-customer'), CUSTOMER)
    await user.keyboard('{Delete}')
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(canvas.querySelector('[data-node="o-portal"]')).not.toBeNull()
    expect(canvas.querySelector('[data-node="o-customer"]')).toBeNull()
  })

  it('names the viewpoint in a ghosted line’s panel, whichever end is refused, and not in an allowed one’s', async () => {
    const { user, canvas } = setup('writer', { prepare: withCooperation })
    const note =
      'Ghosted: the Application Cooperation viewpoint does not allow an element at its end.'
    // Technology Service → Claims Engine: the source is refused.
    expect(await selectLine(user, canvas, 'c-hosting-engine')).toHaveTextContent(note)
    // Claims Engine → a Requirement: the target is.
    const toRequirement = await selectLine(user, canvas, 'c-engine-req')
    expect(toRequirement).toHaveTextContent(/^Relationship.*Claims Engine → /)
    expect(toRequirement).toHaveTextContent(note)
    const allowed = await selectLine(user, canvas, 'c-portal-engine')
    expect(allowed).toHaveTextContent('Claims Portal → Claims Engine')
    expect(allowed).not.toHaveTextContent(/Ghosted/)
  })

  it('names no viewpoint in a plain line’s panel, which draws no concept, even from a ghosted shape', async () => {
    const { user, canvas } = setup('writer', {
      prepare: (s) => {
        withCooperation(s)
        s.updateView(LANDSCAPE, (v) => ({
          ...v,
          connections: [
            ...v.connections,
            { id: 'l-customer', kind: 'line', source: 'o-customer', target: 'o-portal' },
          ],
        }))
      },
    })
    const panel = await selectLine(user, canvas, 'l-customer')
    expect(panel).toHaveTextContent('Customer → Claims Portal')
    expect(panel).not.toHaveTextContent(/Ghosted/)
  })
})

describe('a greyed tree row dragged onto the view (#194)', () => {
  it('draws the element, ghosted, as Archi does: its drop applies no viewpoint check', () => {
    const { dispatch, surface, view, canvas } = setup('writer', { prepare: withCooperation })
    expect(drop(surface, { [ELEMENT_DRAG_TYPE]: 'ba-customer' }, EMPTY_SPOT)).toBe(true)
    expect(dispatch).toHaveBeenCalledTimes(1)
    const node = view().nodes[view().nodes.length - 1]!
    expect(node).toMatchObject({ kind: 'element', element: 'ba-customer' })
    expect(canvas.querySelector(`[data-node="${node.id}"]`)).toHaveAttribute('data-ghost', 'true')
    // Its line to Insured Person is drawn too, ghosted with it.
    const line = view().connections[view().connections.length - 1]!
    expect(line).toMatchObject({
      kind: 'relationship',
      relationship: 'r-cust-ins',
      source: node.id,
    })
    expect(canvas.querySelector(`[data-connection="${line.id}"]`)).toHaveAttribute(
      'data-ghost',
      'true',
    )
  })
})

describe('image export keeps the ghosting (#194)', () => {
  async function exported(user: ReturnType<typeof setup>['user']) {
    const { createObjectURL } = stubDownloads()
    await user.click(screen.getByRole('button', { name: 'Export SVG' }))
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob | undefined
    return { createObjectURL, svg: blob ? await blob.text() : undefined }
  }

  it('writes the ghosted shapes and lines at the token’s opacity, as a number, and nothing else', async () => {
    document.documentElement.style.setProperty('--ghost-opacity', '0.4')
    const { user } = setup('writer', { prepare: withCooperation })
    const { svg } = await exported(user)
    const doc = new DOMParser().parseFromString(svg!, 'image/svg+xml')
    const opacityOf = (selector: string) => doc.querySelector(selector)!.getAttribute('opacity')
    expect(opacityOf('[data-node="o-customer"]')).toBe('0.4')
    expect(opacityOf('[data-connection="c-hosting-engine"]')).toBe('0.4')
    expect(opacityOf('[data-node="o-portal"]')).toBeNull()
    expect(svg).not.toContain('var(--ghost-opacity)')
  })

  it('fails the export, saying why, rather than writing a file that has lost the ghosting', async () => {
    const { user } = setup('writer', { prepare: withCooperation })
    const { createObjectURL } = await exported(user)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'SVG export failed: The export cannot resolve var(--ghost-opacity).',
    )
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('fails on a token that is not a number, or an opacity it cannot read as one token', () => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.append(shape)
    const area = { x: 0, y: 0, width: 10, height: 10 }
    document.documentElement.style.setProperty('--ghost-opacity', 'faint')
    shape.setAttribute('opacity', GHOST_OPACITY)
    expect(() => buildViewSvg(g, area, 'v')).toThrow('cannot resolve var(--ghost-opacity)')
    document.documentElement.style.setProperty('--ghost-opacity', '0.4')
    expect(buildViewSvg(g, area, 'v').svg).toContain('opacity="0.4"')
    shape.setAttribute('opacity', 'var(--ghost-opacity, 1)')
    expect(() => buildViewSvg(g, area, 'v')).toThrow('cannot resolve var(--ghost-opacity, 1)')
  })

  it('needs no token for a view with nothing ghosted', async () => {
    const { user } = setup()
    const { svg } = await exported(user)
    expect(svg).toContain('data-node="o-customer"')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('ghosting is not stored (#194, ADR 0004)', () => {
  it('leaves the saved file byte-identical after drawing, selecting and exporting a ghosted view', async () => {
    let before = ''
    const { store, user, nodeEl } = setup('writer', {
      prepare: (s) => {
        withCooperation(s)
        before = model(s)
      },
    })
    expect(before).toContain('"viewpoint": "Application Cooperation"')
    expect(nodeEl('o-customer')).toHaveAttribute('data-ghost', 'true')
    await click(user, nodeEl('o-customer'), CUSTOMER)
    screen.getByRole('complementary', { name: 'Selected: Customer' })
    document.documentElement.style.setProperty('--ghost-opacity', '0.4')
    stubDownloads()
    await user.click(screen.getByRole('button', { name: 'Export SVG' }))
    expect(model(store)).toBe(before)
  })
})
