import { describe, expect, it } from 'vitest'
import { startOfYear, type Element } from '@/model'
import { loadDemoWorkspace } from '@/io'
import { BANDS, bandOf, partitionOf } from './bands'
import { colourOf, legendFor, subLabelOf } from './colouring'
import { runLayout } from './layout'
import { traceFrom, tracedDependencies } from './trace'
import { buildSvg, wrap } from './export-svg'

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
