import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import claimsXml from '@/io/fixtures/claims-platform.xml?raw'
import { importExchangeXml } from '@/io'
import { absoluteBounds, type View, type ViewNode, type Workspace } from '@/model'
import { renderApp } from '@/test/render'
import {
  absoluteIndex,
  childrenIndex,
  chopbox,
  connectionRoute,
  drawingBounds,
  fitViewport,
  zoomAround,
} from './geometry'
import { ViewDrawing, type DrawingLookups } from './ViewDrawing'
import { buildViewSvg, rasterise, viewFileName } from './export-view'

function fixture(): Workspace {
  const result = importExchangeXml(claimsXml, 'claims-platform.xml')
  if (!result.workspace) throw new Error('fixture did not import')
  return result.workspace
}

const LANDSCAPE = 'v-landscape'

function landscape(workspace = fixture()): View {
  return workspace.views.find((v) => v.id === LANDSCAPE)!
}

/** Sum the `translate()` of a node's own `<g>` and of every node `<g>` around it. */
function domPosition(el: Element): { x: number; y: number } {
  let x = 0
  let y = 0
  for (let g: Element | null = el; g; g = g.parentElement?.closest('[data-node]') ?? null) {
    const match = /translate\(([-\d.e]+) ([-\d.e]+)\)/.exec(g.getAttribute('transform') ?? '')
    if (!match) throw new Error(`node ${g.getAttribute('data-node')} has no translate`)
    x += Number(match[1])
    y += Number(match[2])
  }
  return { x, y }
}

const node = (id: string, bounds: Partial<ViewNode['bounds']> = {}, parent?: string): ViewNode => ({
  id,
  kind: 'note',
  text: id,
  bounds: { x: 0, y: 0, width: 10, height: 10, ...bounds },
  ...(parent ? { parent } : {}),
})

const view = (nodes: ViewNode[], connections: View['connections'] = []): View => ({
  id: 'v',
  name: 'V',
  properties: {},
  nodes,
  connections,
})

describe('geometry', () => {
  it('resolves every fixture node to the same absolute bounds as the model does', () => {
    const v = landscape()
    const index = absoluteIndex(v)
    expect(index.size).toBe(45)
    for (const n of v.nodes) expect(index.get(n.id), n.id).toEqual(absoluteBounds(v, n.id))
  })

  it('anchors a line where it leaves the box, toward its next point', () => {
    const box = { x: 0, y: 0, width: 100, height: 50 }
    expect(chopbox(box, { x: 200, y: 25 })).toEqual({ x: 100, y: 25 })
    expect(chopbox(box, { x: 50, y: -100 })).toEqual({ x: 50, y: 0 })
    // Centre to a corner-ish point: exits through the nearer edge.
    expect(chopbox(box, { x: 150, y: 75 })).toEqual({ x: 100, y: 50 })
  })

  it('routes through the bend-points, anchored at both ends', () => {
    const bounds = new Map([
      ['a', { x: 0, y: 0, width: 20, height: 20 }],
      ['b', { x: 100, y: 100, width: 20, height: 20 }],
    ])
    const route = connectionRoute(
      { id: 'c', kind: 'line', source: 'a', target: 'b', bendpoints: [{ x: 10, y: 110 }] },
      bounds,
    )
    expect(route).toEqual([
      { x: 10, y: 20 },
      { x: 10, y: 110 },
      { x: 100, y: 110 },
    ])
    expect(
      connectionRoute({ id: 'c', kind: 'line', source: 'a', target: 'gone' }, bounds),
    ).toBeUndefined()
  })

  it('measures the drawing including bend-points outside every node', () => {
    const v = view(
      [node('a', { x: 10, y: 10 })],
      [{ id: 'c', kind: 'line', source: 'a', target: 'a', bendpoints: [{ x: 300, y: -40 }] }],
    )
    expect(drawingBounds(v, absoluteIndex(v))).toEqual({ x: 10, y: -40, width: 290, height: 60 })
    expect(drawingBounds(view([]), new Map())).toBeUndefined()
  })

  it('fits a large drawing into the screen, centred, and never enlarges a small one', () => {
    const big = fitViewport({ x: 0, y: 0, width: 2000, height: 1000 }, 1000, 600, 0)
    expect(big.zoom).toBe(0.5)
    expect(big).toEqual({ x: 0, y: 50, zoom: 0.5 })
    const small = fitViewport({ x: 100, y: 100, width: 100, height: 50 }, 1000, 600, 0)
    expect(small.zoom).toBe(1)
    // Centred: the drawing's centre (150, 125) lands on the screen's centre (500, 300).
    expect(150 * small.zoom + small.x).toBe(500)
    expect(125 * small.zoom + small.y).toBe(300)
  })

  it('zooms about the pointer, keeping the point under it still', () => {
    const before = { x: 30, y: -20, zoom: 1 }
    const after = zoomAround(before, 2, { x: 400, y: 300 })
    const under = (vp: typeof before) => ({ x: (400 - vp.x) / vp.zoom, y: (300 - vp.y) / vp.zoom })
    expect(under(after)).toEqual(under(before))
    expect(after.zoom).toBe(2)
  })

  it('draws a node with a broken parent chain at the top level rather than losing it', () => {
    const v = view([
      node('orphan', {}, 'not-in-view'),
      node('a', {}, 'b'),
      node('b', {}, 'a'),
      node('root'),
      node('child', {}, 'root'),
    ])
    const tree = childrenIndex(v)
    expect(tree.get(undefined)!.map((n) => n.id)).toEqual(['orphan', 'a', 'b', 'root'])
    expect(tree.get('root')!.map((n) => n.id)).toEqual(['child'])
    // Every node is drawn exactly once.
    const drawn = [...tree.values()].flat().map((n) => n.id)
    expect(drawn.sort()).toEqual(['a', 'b', 'child', 'orphan', 'root'])
  })
})

describe('the view screen', () => {
  it('draws every node of the Archi fixture at its stored bounds, nested in its parent', async () => {
    const workspace = fixture()
    const v = landscape(workspace)
    renderApp(workspace, { route: `/view/${LANDSCAPE}` })
    const canvas = await screen.findByTestId('view-canvas')

    const drawn = canvas.querySelectorAll('[data-node]')
    expect(drawn).toHaveLength(45)
    for (const n of v.nodes) {
      const el = canvas.querySelector(`[data-node="${n.id}"]`)
      expect(el, n.id).not.toBeNull()
      const { x, y } = absoluteBounds(v, n.id)!
      expect(domPosition(el!), n.id).toEqual({ x, y })
      // Nested in the DOM exactly as in the model.
      const domParent = el!.parentElement!.closest('[data-node]')?.getAttribute('data-node')
      expect(domParent ?? undefined, n.id).toBe(n.parent)
    }
    // And the fixture really does nest: this is not vacuous.
    expect(v.nodes.filter((n) => n.parent).length).toBeGreaterThan(20)
  })

  it('draws every connection, through its bend-points', async () => {
    const workspace = fixture()
    const v = landscape(workspace)
    renderApp(workspace, { route: `/view/${LANDSCAPE}` })
    const canvas = await screen.findByTestId('view-canvas')
    expect(canvas.querySelectorAll('[data-connection]')).toHaveLength(40)

    const bent = v.connections.filter((c) => c.bendpoints?.length)
    expect(bent.length).toBeGreaterThan(0)
    for (const c of bent) {
      const d = canvas.querySelector(`[data-connection="${c.id}"] path`)!.getAttribute('d')!
      for (const p of c.bendpoints!) expect(d, c.id).toContain(`${p.x},${p.y}`)
    }
  })

  it('draws relationships with their notation and the rest as plain lines', async () => {
    renderApp(fixture(), { route: `/view/${LANDSCAPE}` })
    const canvas = await screen.findByTestId('view-canvas')
    expect(canvas.querySelectorAll('[data-connection] [data-relationship]')).toHaveLength(38)
    expect(canvas.querySelectorAll('[data-node][data-kind="group"]')).toHaveLength(3)
    expect(canvas.querySelectorAll('[data-node][data-kind="note"]')).toHaveLength(2)
    expect(canvas.querySelectorAll('[data-node][data-kind="view-ref"]')).toHaveLength(1)
  })

  it('applies a stored appearance override', async () => {
    renderApp(fixture(), { route: `/view/${LANDSCAPE}` })
    const canvas = await screen.findByTestId('view-canvas')
    // The fixture's Business group carries fillColor #fff5d6.
    const group = canvas.querySelector('[data-node="o-g-business"] > [data-shape="group"] path')!
    expect(group.getAttribute('fill')).toBe('#fff5d6')
  })

  it('shows a summary of the selected element, and opens its fact sheet', async () => {
    const workspace = fixture()
    renderApp(workspace, { route: `/view/${LANDSCAPE}` })
    const canvas = await screen.findByTestId('view-canvas')
    const shape = canvas.querySelector('[data-node="o-engine"] [data-shape]')!
    await userEvent.click(shape)

    const panel = await screen.findByRole('complementary', { name: /Selected: Claims Engine/ })
    expect(within(panel).getByText('Application Component')).toBeInTheDocument()
    expect(screen.getByTestId('selection')).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('button', { name: 'Open fact sheet' }))
    expect(await screen.findByRole('heading', { name: 'Claims Engine' })).toBeInTheDocument()
  })

  it('selects the element a link asks for', async () => {
    renderApp(fixture(), { route: `/view/${LANDSCAPE}?element=ac-engine` })
    expect(
      await screen.findByRole('complementary', { name: /Selected: Claims Engine/ }),
    ).toBeInTheDocument()
  })

  it('says so when the view does not exist', async () => {
    renderApp(fixture(), { route: '/view/no-such-view' })
    expect(await screen.findByRole('alert')).toHaveTextContent('no-such-view')
  })

  it('says so when the view is empty, and offers nothing to export', async () => {
    renderApp(fixture(), { route: '/view/v-empty' })
    expect(await screen.findByText('This view is empty.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export SVG' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export PNG' })).toBeDisabled()
  })

  it('lists the views from the left nav', async () => {
    renderApp(fixture(), { route: '/views' })
    const link = await screen.findByRole('link', { name: 'Claims landscape' })
    expect(link).toHaveAttribute('href', `/view/${LANDSCAPE}`)
    expect(screen.getByRole('link', { name: /Views/ })).toBeInTheDocument()
  })
})

describe('Appears in views', () => {
  it('lists the views that draw the element, linking to it selected', async () => {
    renderApp(fixture(), { route: '/element/ac-engine' })
    const link = await screen.findByRole('link', { name: 'Claims landscape' })
    expect(link).toHaveAttribute('href', `/view/${LANDSCAPE}?element=ac-engine`)
  })

  it('says so when the element is in no view', async () => {
    const workspace = fixture()
    workspace.views = []
    renderApp(workspace, { route: '/element/ac-engine' })
    expect(await screen.findByText('Not drawn in any view.')).toBeInTheDocument()
  })
})

describe('export', () => {
  const lookups = (workspace: Workspace): DrawingLookups => ({
    element: (id) => workspace.elements.find((e) => e.id === id),
    relationship: (id) => workspace.relationships.find((r) => r.id === id),
    viewName: (id) => workspace.views.find((v) => v.id === id)?.name,
  })

  function drawn(workspace: Workspace) {
    const v = landscape(workspace)
    const bounds = absoluteIndex(v)
    const { container } = render(
      <svg>
        <ViewDrawing
          view={v}
          bounds={bounds}
          children={childrenIndex(v)}
          lookups={lookups(workspace)}
        />
      </svg>,
    )
    return {
      v,
      g: container.querySelector<SVGGElement>('[data-view-drawing]')!,
      area: drawingBounds(v, bounds)!,
    }
  }

  it('writes an SVG that contains every node and every connection', () => {
    const { v, g, area } = drawn(fixture())
    const { svg } = buildViewSvg(g, area, v.name)
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    expect(doc.documentElement.tagName).toBe('svg')
    const nodes = new Set(
      [...doc.querySelectorAll('[data-node]')].map((el) => el.getAttribute('data-node')),
    )
    const connections = new Set(
      [...doc.querySelectorAll('[data-connection]')].map((el) =>
        el.getAttribute('data-connection'),
      ),
    )
    expect(nodes).toEqual(new Set(v.nodes.map((n) => n.id)))
    expect(connections).toEqual(new Set(v.connections.map((c) => c.id)))
    expect(doc.querySelector('title')!.textContent).toBe('Claims landscape')
  })

  it('names the fonts concretely, so the file stands alone', () => {
    const { v, g, area } = drawn(fixture())
    const { svg } = buildViewSvg(g, area, v.name)
    expect(svg).toContain('Space Grotesk')
    expect(svg).not.toContain('var(--font')
  })

  it('frames the whole drawing with a margin', () => {
    const { v, g, area } = drawn(fixture())
    const out = buildViewSvg(g, area, v.name)
    expect(out.width).toBe(Math.ceil(area.width + 40))
    expect(out.height).toBe(Math.ceil(area.height + 40))
    expect(out.svg).toContain(`viewBox="${area.x - 20} ${area.y - 20} ${out.width} ${out.height}"`)
  })

  it('fails a PNG loudly when the browser cannot draw the SVG', async () => {
    await expect(
      rasterise({ svg: '<svg/>', width: 10, height: 10 }, 2, () =>
        Promise.reject(new Error('no image')),
      ),
    ).rejects.toThrow('no image')
  })

  it('fails a PNG loudly when there is no canvas to draw on', async () => {
    // jsdom has no 2D canvas: getContext returns null, which must not become an empty file.
    await expect(
      rasterise({ svg: '<svg/>', width: 10, height: 10 }, 2, () =>
        Promise.resolve(document.createElement('img')),
      ),
    ).rejects.toThrow('cannot draw to a canvas')
  })

  it('makes a file name from the view name', () => {
    expect(viewFileName('Claims landscape', 'svg')).toBe('claims-landscape.svg')
    expect(viewFileName('  ***  ', 'png')).toBe('view.png')
  })
})
