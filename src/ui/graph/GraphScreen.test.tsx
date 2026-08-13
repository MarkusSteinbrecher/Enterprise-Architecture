import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyWorkspace } from '@/model'
import { loadDemoWorkspace } from '@/io'
import { renderApp } from '@/test/render'

function demo() {
  return loadDemoWorkspace()
}

/** ELK runs on the main thread under jsdom, so the first paint has no nodes. */
async function nodes() {
  await waitFor(() => expect(document.querySelectorAll('.gnode').length).toBeGreaterThan(0), {
    timeout: 10_000,
  })
  return [...document.querySelectorAll('.gnode')] as HTMLElement[]
}

describe('report chrome', () => {
  it('shows the title, the live stats line and the three colour views', () => {
    renderApp(demo(), { route: '/graph' })
    expect(screen.getByRole('heading', { name: 'Dependency graph' })).toBeInTheDocument()
    expect(screen.getByText(/29 nodes · 47 relations · time point \d{4}/)).toBeInTheDocument()
    for (const view of ['LAYER', 'LIFECYCLE', 'TIME']) {
      expect(screen.getByRole('button', { name: view })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'LAYER' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('rebuilds the legend when the colour view changes', async () => {
    renderApp(demo(), { route: '/graph' })
    const user = userEvent.setup()
    // Scoped to the legend: node sub-labels carry the same words.
    const legend = () => document.querySelector('.chrome__legend') as HTMLElement
    expect(within(legend()).getByText('Business')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'LIFECYCLE' }))
    expect(within(legend()).getByText('Phase Out')).toBeInTheDocument()
    expect(within(legend()).queryByText('Migration')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'TIME' }))
    expect(within(legend()).getByText('Not classified')).toBeInTheDocument()
  })

  it('moves the time point and resets it with TODAY', async () => {
    renderApp(demo(), { route: '/graph' })
    const user = userEvent.setup()
    const slider = screen.getByLabelText('Time point') as HTMLInputElement
    const thisYear = new Date().getFullYear()

    // A range input is set, not typed into.
    fireEvent.change(slider, { target: { value: '2030' } })
    await waitFor(() => expect(screen.getByText('2030')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'TODAY' }))
    expect(screen.getByText(String(thisYear))).toBeInTheDocument()
  })

  it('exports the current graph as an SVG file', async () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
    HTMLAnchorElement.prototype.click = vi.fn()

    renderApp(demo(), { route: '/graph' })
    await nodes()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Export SVG' }))
    expect(createObjectURL).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})

describe('canvas', () => {
  it('lays out every element once ELK has run', async () => {
    renderApp(demo(), { route: '/graph' })
    expect(await nodes()).toHaveLength(29)
  })

  it('labels the three bands', async () => {
    renderApp(demo(), { route: '/graph' })
    await nodes()
    for (const band of ['BUSINESS', 'APPLICATION', 'TECHNOLOGY']) {
      expect(screen.getByText(band)).toBeInTheDocument()
    }
  })

  it('sends an empty browser to the first-run screen rather than an empty canvas', () => {
    renderApp(emptyWorkspace('ws-empty', 'Empty'), { route: '/graph' })
    expect(screen.getByRole('heading', { name: 'Archipelago' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Explore the demo/ })).toBeInTheDocument()
  })

  it('invites the user to trace', async () => {
    renderApp(demo(), { route: '/graph' })
    await nodes()
    expect(screen.getByText('Click a node to trace its dependencies')).toBeInTheDocument()
  })
})

describe('tracing', () => {
  it('opens the side panel with the stat grid and traced dependencies', async () => {
    renderApp(demo(), { route: '/graph?focus=app-claims' })
    await nodes()

    const panel = screen.getByRole('complementary', {
      name: /Traced dependencies of Claim Handling Engine/,
    })
    expect(within(panel).getByText('Invest')).toBeInTheDocument()
    // Summed from the *relationships* the trace covers (ADR 0001), not from a
    // property on the element. The panel used to read `annual.cost` off the
    // element, which `PortfolioProfile` has no field for and `stripProfileKeys`
    // removes on import — so a real `.archimate` file with costs modelled the
    // supported way showed "—" forever, and the demo hard-coding that key was
    // the only reason this assertion passed.
    expect(within(panel).getByText('1.2M EUR / yr')).toBeInTheDocument()
    expect(within(panel).getByText('Claim Handling')).toBeInTheDocument()
    expect(within(panel).getAllByText('FLOW').length).toBeGreaterThan(0)
    expect(screen.getByText(/Tracing Claim Handling Engine/)).toBeInTheDocument()
  })

  it('re-focuses from a traced dependency row', async () => {
    renderApp(demo(), { route: '/graph?focus=app-claims' })
    await nodes()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /CRM System/ }))
    expect(
      screen.getByRole('complementary', { name: /Traced dependencies of CRM System/ }),
    ).toBeInTheDocument()
  })

  it('clears the trace from the hint box', async () => {
    renderApp(demo(), { route: '/graph?focus=app-claims' })
    await nodes()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'CLEAR' }))
    expect(screen.getByText('Click a node to trace its dependencies')).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('opens the fact sheet from the side panel', async () => {
    renderApp(demo(), { route: '/graph?focus=app-claims' })
    await nodes()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Fact sheet' }))
    expect(screen.getByRole('heading', { name: 'Claim Handling Engine' })).toBeInTheDocument()
  })

  it('toggles focus off when the focused node is clicked again', async () => {
    renderApp(demo(), { route: '/graph' })
    await nodes()
    const user = userEvent.setup()
    // Re-query between clicks: React Flow re-renders the node on focus change.
    const crm = async () => (await nodes()).find((n) => n.textContent?.includes('CRM System'))!

    await user.click(await crm())
    expect(screen.getByRole('complementary')).toBeInTheDocument()
    await user.click(await crm())
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})

describe('URL state', () => {
  it('restores colour view, year and focus from a link', async () => {
    renderApp(demo(), { route: '/graph?colorView=time&year=2031&focus=app-crm' })
    await nodes()
    expect(screen.getByRole('button', { name: 'TIME' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('2031')).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', { name: /Traced dependencies of CRM System/ }),
    ).toBeInTheDocument()
  })

  it('ignores a nonsense colour view', () => {
    renderApp(demo(), { route: '/graph?colorView=rainbow' })
    expect(screen.getByRole('button', { name: 'LAYER' })).toHaveAttribute('aria-pressed', 'true')
  })
})

/**
 * The visual encoding, asserted where it lands.
 *
 * `colourOf` and `legendFor` were tested only as pure functions returning token
 * strings, so replacing `GraphNode`'s entire style object with `{ width, height }`
 * left all 33 graph tests green: a build in which the colour views and
 * click-to-trace have no visible effect would have shipped. A test that a
 * function returns a colour is not a test that the colour is rendered.
 */
describe('the node encoding actually reaches the nodes', () => {
  const nodeFor = (all: HTMLElement[], name: string) =>
    all.find((node) => node.title.startsWith(name))!

  it('paints the layer colour on the node, and repaints it when the view changes', async () => {
    renderApp(demo(), { route: '/graph' })
    const user = userEvent.setup()
    const crm = nodeFor(await nodes(), 'CRM System')

    // An Application Component in the layer view: the application ramp.
    expect(crm.style.background).toBe('var(--appbg)')
    expect(crm.style.borderColor).toBe('var(--app)')

    await user.click(screen.getByRole('button', { name: 'TIME' }))
    const recoloured = nodeFor(await nodes(), 'CRM System')
    // CRM is Migrate, so the TIME ramp takes over. If the style object stopped
    // reaching the node, this is the assertion that notices.
    expect(recoloured.style.borderColor).toBe('var(--t-mig)')
    expect(recoloured.style.borderColor).not.toBe('var(--app)')
  })

  it('dims everything outside the trace, and accents the focused node', async () => {
    renderApp(demo(), { route: '/graph' })
    const all = await nodes()
    const claims = nodeFor(all, 'Claim Handling Engine')

    fireEvent.click(claims)
    const traced = await nodes()

    const focused = nodeFor(traced, 'Claim Handling Engine')
    expect(focused.style.borderColor).toBe('var(--accent)')
    expect(focused.style.borderWidth).toBe('2px')
    expect(focused.style.opacity).toBe('1')

    // Something the trace does not reach is dimmed to the handoff's 0.16.
    const dimmed = traced.filter((node) => node.style.opacity === '0.16')
    expect(dimmed.length).toBeGreaterThan(0)
    expect(dimmed.length).toBeLessThan(traced.length)
  })

  it('draws a past-end-of-life node dashed and faded', async () => {
    renderApp(demo(), { route: '/graph?year=2036' })
    const all = await nodes()

    const dashed = all.filter((node) => node.style.borderStyle === 'dashed')
    expect(dashed.length).toBeGreaterThan(0)
    for (const node of dashed) expect(Number(node.style.opacity)).toBeLessThan(1)

    const solid = all.filter((node) => node.style.borderStyle === 'solid')
    expect(solid.length).toBeGreaterThan(0)
  })

  it('gives the edges arrowheads, because direction is the information', async () => {
    renderApp(demo(), { route: '/graph' })
    await nodes()

    // React Flow does not draw edge paths under jsdom — it needs measured node
    // boxes and there is no layout engine — but it *does* emit one
    // `react-flow__arrowhead` marker per distinct `markerEnd`, and only when an
    // edge asks for one. That is the half of this that jsdom can see; the SVG
    // export test below covers the drawn marker end to end.
    const markers = document.querySelectorAll('marker.react-flow__arrowhead')
    expect(markers.length).toBeGreaterThan(0)
  })
})

describe('when the layout cannot be computed', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('says so instead of sitting on “laying out…” forever', async () => {
    // Reachable in production: the main-thread fallback is a dynamic import of
    // the ~1.4MB ELK chunk, and a tab loaded before a Pages redeploy asks for a
    // hashed chunk that 404s. There was no `.catch`, so the screen kept the
    // "laying out…" stats line, rendered no nodes, skipped the empty state
    // (elements.length > 0) and left an unhandled rejection behind.
    const layout = await import('./layout')
    vi.spyOn(layout, 'runLayout').mockRejectedValue(new Error('chunk load failed'))

    renderApp(demo(), { route: '/graph' })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/layout could not be computed/)
    expect(alert).toHaveTextContent('chunk load failed')
    expect(screen.queryByText(/laying out…/)).not.toBeInTheDocument()
    // And nothing offers to export a file with none of the model in it.
    expect(screen.getByRole('button', { name: 'Export SVG' })).toBeDisabled()
  })
})

describe('the time point', () => {
  it('refuses a year outside the slider’s own range', async () => {
    // `Number.isFinite(year) && year > 0` waved this through, `startOfYear` gave
    // NaN, and every `ms <= at` comparison in `deriveLifecyclePhase` then failed
    // — so every element rendered as Plan. A fully drawn landscape, entirely
    // wrong, with the stats line reading a year the slider did not.
    renderApp(demo(), { route: '/graph?year=999999999' })
    const all = await nodes()

    const stats = screen.getByText(/time point \d+/).textContent!
    expect(stats).not.toContain('999999999')

    const slider = screen.getByRole('slider') as HTMLInputElement
    expect(Number(stats.match(/time point (\d+)/)![1])).toBe(Number(slider.value))

    // Not every element is in Plan, which is what NaN produced.
    const subLabels = all.map((node) => node.title)
    expect(subLabels.some((label) => !label.includes('Plan'))).toBe(true)
  })
})

describe('a focus this workspace does not contain', () => {
  it('is ignored rather than ghosting the whole graph', async () => {
    // A stale bookmark, or a re-import with regenerated ids. `traceFrom` took the
    // raw parameter while the panel was gated on the element existing, so all 29
    // nodes dimmed to 0.16 with no panel, no CLEAR, and a hint denying anything
    // was traced — and `fitView` matched no nodes and divided by a zero-width box.
    renderApp(demo(), { route: '/graph?focus=el-does-not-exist' })
    const all = await nodes()

    // Not "every node is fully opaque" — past-end-of-life nodes are legitimately
    // faded. Nothing is dimmed to the trace's 0.16, which is the tell.
    expect(all.some((node) => node.style.opacity === '0.16')).toBe(false)
    expect(screen.getByText('Click a node to trace its dependencies')).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: /Traced dependencies/ })).toBeNull()
  })
})
