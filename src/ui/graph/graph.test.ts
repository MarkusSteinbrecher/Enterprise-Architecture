import { afterEach, describe, expect, it } from 'vitest'
import { startOfYear, type Element } from '@/model'
import { loadDemoWorkspace } from '@/io'
import { BANDS, bandOf, partitionOf } from './bands'
import { colourOf, legendFor, subLabelOf } from './colouring'
import { runLayout } from './layout'
import { traceFrom, tracedDependencies } from './trace'
import { buildSvg, wrap } from './export-svg'
import { shapeKeyOf } from './shape-key'

const AT = startOfYear(2026)

function element(over: Partial<Element> = {}): Element {
  return {
    id: 'app-1',
    type: 'ApplicationComponent',
    name: 'CRM System',
    properties: {},
    ...over,
  }
}

describe('bands', () => {
  it('puts each layer in the band the design draws it in', () => {
    expect(bandOf(element())).toBe('application')
    expect(bandOf(element({ type: 'DataObject' }))).toBe('application')
    expect(bandOf(element({ type: 'Node' }))).toBe('technology')
    expect(bandOf(element({ type: 'Facility' }))).toBe('technology')
    expect(bandOf(element({ type: 'BusinessProcess' }))).toBe('business')
    expect(bandOf(element({ type: 'BusinessObject' }))).toBe('business')
  })

  it('folds strategy, motivation and implementation into the business band', () => {
    // They describe intent and change to the business; omitting them would hide
    // the goal that explains why the landscape looks the way it does.
    expect(bandOf(element({ type: 'Capability' }))).toBe('business')
    expect(bandOf(element({ type: 'Goal' }))).toBe('business')
    expect(bandOf(element({ type: 'WorkPackage' }))).toBe('business')
    expect(bandOf(element({ type: 'Grouping' }))).toBe('business')
  })

  it('orders partitions bottom-up for ELK', () => {
    expect(partitionOf('technology')).toBe(0)
    expect(partitionOf('application')).toBe(1)
    expect(partitionOf('business')).toBe(2)
  })
})

describe('colour views', () => {
  const migrating = element({
    profile: {
      timeClassification: 'Migrate',
      lifecycle: { active: '2010-01-01', phaseOut: '2027-01-01', endOfLife: '2028-01-01' },
    },
  })

  it('colours by layer, lifecycle and TIME', () => {
    expect(colourOf(migrating, 'layer', AT)).toEqual({
      stroke: 'var(--app)',
      fill: 'var(--appbg)',
    })
    expect(colourOf(migrating, 'lifecycle', AT).stroke).toBe('var(--lc-act)')
    expect(colourOf(migrating, 'time', AT).stroke).toBe('var(--t-mig)')
  })

  it('recolours as the time point moves', () => {
    expect(colourOf(migrating, 'lifecycle', startOfYear(2027)).stroke).toBe('var(--lc-out)')
    expect(colourOf(migrating, 'lifecycle', startOfYear(2029)).stroke).toBe('var(--lc-eol)')
  })

  it('falls back to the border colour for elements with no TIME class', () => {
    expect(colourOf(element(), 'time', AT).stroke).toBe('var(--bd2)')
  })

  it('builds a legend from the same source as the canvas', () => {
    expect(legendFor('layer').map((entry) => entry.label)).toEqual([
      'Business',
      'Application',
      'Technology',
      'Data',
      'Motivation',
      'Migration',
    ])
    expect(legendFor('lifecycle')).toHaveLength(5)
    // TIME gains a "not classified" entry, because the canvas has one.
    expect(legendFor('time')).toHaveLength(5)
    expect(legendFor('time').at(-1)?.label).toBe('Not classified')
  })

  it('sub-labels with the TIME class, or the phase when there is none', () => {
    expect(subLabelOf(migrating, AT)).toBe('Migrate')
    expect(subLabelOf(element(), AT)).toBe('Active')
  })
})

describe('tracing', () => {
  const workspace = loadDemoWorkspace()

  it('lights the focus and its direct neighbours only', () => {
    const trace = traceFrom('app-claims', workspace.relationships)
    expect(trace.lit.has('app-claims')).toBe(true)
    expect(trace.lit.has('cap-claim')).toBe(true) // realizes
    expect(trace.lit.has('tec-k8s')).toBe(true) // served by
    expect(trace.lit.has('app-portal')).toBe(false) // two hops away
  })

  it('collects incident relationships in both directions', () => {
    const trace = traceFrom('app-claims', workspace.relationships)
    const dependencies = tracedDependencies('app-claims', workspace.relationships)
    expect(dependencies.length).toBe(trace.incident.size)
    expect(dependencies.some((d) => d.direction === 'outgoing')).toBe(true)
    expect(dependencies.some((d) => d.direction === 'incoming')).toBe(true)
  })

  it('returns just the focus for an unconnected element', () => {
    const trace = traceFrom('nobody', workspace.relationships)
    expect([...trace.lit]).toEqual(['nobody'])
    expect(trace.incident.size).toBe(0)
  })
})

describe('layout', () => {
  it('lays the demo out in three disjoint bands', async () => {
    const workspace = loadDemoWorkspace()
    const result = await runLayout(workspace.elements, workspace.relationships)

    expect(result.nodes.size).toBe(workspace.elements.length)

    const rects = BANDS.map((band) => result.bands[band]).filter(Boolean)
    expect(rects).toHaveLength(3)
    for (let i = 1; i < rects.length; i += 1) {
      const previous = rects[i - 1]!
      const current = rects[i]!
      expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height)
    }
  })

  it('keeps every node inside its own band', async () => {
    const workspace = loadDemoWorkspace()
    const result = await runLayout(workspace.elements, workspace.relationships)
    for (const node of result.nodes.values()) {
      const rect = result.bands[node.band]!
      expect(node.y).toBeGreaterThanOrEqual(rect.y)
      expect(node.y + 42).toBeLessThanOrEqual(rect.y + rect.height)
    }
  })

  it('survives a model with no relationships', async () => {
    const workspace = loadDemoWorkspace()
    const result = await runLayout(workspace.elements, [])
    expect(result.nodes.size).toBe(workspace.elements.length)
  })

  it('returns an empty layout for an empty model', async () => {
    const result = await runLayout([], [])
    expect(result.nodes.size).toBe(0)
  })
})

describe('SVG export', () => {
  it('wraps a name to two lines at the handoff width', () => {
    expect(wrap('CRM System')).toEqual(['CRM System', undefined])
    expect(wrap('Home & Away Policy Administration')).toEqual([
      'Home & Away Policy',
      'Administration',
    ])
    expect(wrap('Supercalifragilisticexpialidociousapplication')[1]).toMatch(/…$/)
  })

  it('draws a standalone document with bands, edges and nodes', () => {
    const svg = buildSvg({
      title: 'Dependency graph',
      stats: '2 nodes · 1 relations · time point 2026',
      width: 400,
      height: 200,
      bands: { application: { y: 0, height: 80 } },
      nodes: [
        {
          id: 'a',
          x: 0,
          y: 10,
          name: 'CRM System',
          subLabel: 'Migrate',
          stroke: '#3A6EA5',
          fill: '#EBF1F8',
          opacity: 1,
          pastEol: false,
        },
      ],
      edges: [
        {
          id: 'e',
          from: { x: 0, y: 0 },
          to: { x: 10, y: 10 },
          stroke: '#C4CAD1',
          width: 1,
          opacity: 0.62,
          dashed: true,
        },
      ],
    })

    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).toContain('Dependency graph')
    expect(svg).toContain('APPLICATION')
    expect(svg).toContain('CRM System')
    expect(svg).toContain('stroke-dasharray="4 3"')
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
  })

  it('escapes markup in element names', () => {
    const svg = buildSvg({
      title: 'T',
      stats: 's',
      width: 10,
      height: 10,
      bands: {},
      nodes: [
        {
          id: 'a',
          x: 0,
          y: 0,
          name: 'Risk & <Underwriting>',
          subLabel: 'x',
          stroke: '#000',
          fill: '#fff',
          opacity: 1,
          pastEol: false,
        },
      ],
      edges: [],
    })
    expect(svg).toContain('Risk &amp; &lt;Underwriting&gt;')
  })
})

/**
 * The export's whole point is a file that opens outside this app.
 *
 * Both existing `buildSvg` tests pass literal hex, and the screen-level test
 * asserts only that `createObjectURL` was called — so `resolveColour` could be
 * deleted entirely and the suite stayed green, for the acceptance criterion that
 * is *entirely about it*. These drive the real token strings the screen passes.
 */
describe('the exported SVG stands alone', () => {
  const originalGetComputedStyle = window.getComputedStyle

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle
  })

  /** jsdom cannot compute `var()`; a browser can, so this is what one would return. */
  function browserLikeColours(map: Record<string, string>) {
    // `Element` in this file is the model's, not the DOM's — the import at the
    // top shadows it.
    window.getComputedStyle = ((element: HTMLElement) => {
      const declared = element.style.color
      return { color: map[declared] ?? 'rgb(0, 0, 0)' } as CSSStyleDeclaration
    }) as unknown as typeof window.getComputedStyle
  }

  const GRAPH = {
    title: 'Dependency graph',
    stats: '2 nodes · 1 relations',
    nodes: [
      {
        id: 'a',
        x: 0,
        y: 0,
        name: 'CRM System',
        subLabel: 'Migrate',
        stroke: 'var(--app)',
        fill: 'var(--appbg)',
        opacity: 1,
        pastEol: false,
      },
      {
        id: 'b',
        x: 200,
        y: 0,
        name: 'Claims',
        subLabel: 'Invest',
        stroke: 'var(--app)',
        fill: 'var(--appbg)',
        opacity: 1,
        pastEol: false,
      },
    ],
    edges: [
      {
        id: 'e',
        from: { x: 75, y: 21 },
        to: { x: 275, y: 21 },
        stroke: 'var(--bd2)',
        width: 1,
        opacity: 0.62,
        dashed: false,
        curved: true,
      },
    ],
    bands: { application: { y: 0, height: 80 } },
    width: 350,
    height: 80,
  }

  it('carries no var() or color-mix() through to the file', () => {
    browserLikeColours({
      'var(--app)': 'rgb(58, 110, 165)',
      'var(--appbg)': 'rgb(235, 241, 248)',
      'var(--bd2)': 'rgb(196, 202, 209)',
      'var(--paper)': 'rgb(250, 250, 251)',
      'var(--ink)': 'rgb(14, 17, 22)',
      'var(--ink3)': 'rgb(140, 147, 155)',
      'var(--bd)': 'rgb(225, 228, 232)',
    })

    const svg = buildSvg(GRAPH)
    // The failure this guards is silent: `resolveColour` falls back to the value
    // it was given, so a miss re-emits the app-only string it exists to remove
    // and the file renders black-on-black in Inkscape with nothing to explain it.
    expect(svg).not.toContain('var(')
    expect(svg).not.toContain('color-mix(')
    expect(svg).toContain('rgb(58, 110, 165)')
  })

  it('draws same-band edges as curves and gives every edge an arrowhead', () => {
    browserLikeColours({ 'var(--bd2)': 'rgb(196, 202, 209)' })
    const svg = buildSvg(GRAPH)

    // The marker has to be defined *in the file*: an SVG marker cannot inherit
    // the stroke of the line that uses it.
    expect(svg).toMatch(/<marker id="arrow-0"[^>]*>/)
    expect(svg).toMatch(/marker-end="url\(#arrow-0\)"/)
    // Same band: a quadratic bowed off the straight run, so two edges over the
    // same stretch of row do not lie on top of each other.
    expect(svg).toMatch(/<path d="M 75 21 Q [-\d.]+ [-\d.]+ 275 21"/)
  })

  it('draws a cross-band edge straight', () => {
    browserLikeColours({ 'var(--bd2)': 'rgb(196, 202, 209)' })
    const svg = buildSvg({ ...GRAPH, edges: [{ ...GRAPH.edges[0]!, curved: false }] })
    expect(svg).toContain('<line x1="75"')
    expect(svg).not.toContain('<path d="M 75 21 Q')
  })
})

describe('the re-layout key', () => {
  const el = (id: string) => ({
    id,
    type: 'ApplicationComponent' as const,
    name: id,
    properties: {},
  })

  it('tells apart shapes a raw join would collide', () => {
    // `['a,b']` and `['a','b']` both join to `"a,b"`. The key decides whether
    // layout re-runs, so a collision leaves the canvas drawing a model that is
    // no longer loaded — or nothing at all, since `buildView` skips every node
    // the stale layout has never placed.
    const one = shapeKeyOf([el('a,b')], [])
    const two = shapeKeyOf([el('a'), el('b')], [])
    expect(one).not.toBe(two)
  })

  it('tells apart relationship shapes a raw join would collide', () => {
    const one = shapeKeyOf([el('a>b'), el('c')], [])
    const two = shapeKeyOf([el('a'), el('b>c')], [])
    expect(one).not.toBe(two)
  })

  it('is stable for the same shape', () => {
    const elements = [el('a'), el('b')]
    const rels = [{ id: 'r', type: 'Serving' as const, source: 'a', target: 'b', properties: {} }]
    expect(shapeKeyOf(elements, rels)).toBe(shapeKeyOf([...elements], [...rels]))
  })
})
