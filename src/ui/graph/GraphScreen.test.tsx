import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
