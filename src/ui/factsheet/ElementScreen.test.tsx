import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { loadDemoWorkspace } from '@/io'
import { renderApp } from '@/test/render'

function demo() {
  return loadDemoWorkspace()
}

/** The mainframe policy system: fully assessed, five lifecycle dates, many relations. */
const APP = '/element/app-policy-ha'
/** A capability: no lifecycle, no assessment, no TIME — the case that breaks layouts. */
const CAPABILITY = '/element/cap-claim'

describe('header', () => {
  it('carries the breadcrumb, badge, title, tags and completeness ring', () => {
    renderApp(demo(), { route: APP })
    const breadcrumb = document.querySelector('.sheet__breadcrumb')!
    expect(
      within(breadcrumb as HTMLElement).getByRole('link', { name: 'INVENTORY' }),
    ).toHaveAttribute('href', '/inventory')
    expect(within(breadcrumb as HTMLElement).getByText('app-policy-ha')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Home & Away Policy Administration' }),
    ).toBeInTheDocument()
    const header = document.querySelector('.sheet__title-row') as HTMLElement
    expect(within(header).getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('Core')).toBeInTheDocument()
    expect(screen.getByText('Vendor risk')).toBeInTheDocument()
    expect(screen.getByText('COMPLETE')).toBeInTheDocument()
    expect(screen.getByText(/^\d+%$/)).toBeInTheDocument()
  })

  it('draws the tab set with only Overview live', () => {
    renderApp(demo(), { route: APP })
    // Buttons, not `role="tab"`: a tablist with no tabpanel and no aria-controls
    // promises a widget that is not there, and three of the four are stubs.
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    for (const tab of ['Relations', 'Assessment', 'Quality']) {
      expect(screen.getByRole('button', { name: tab })).toBeDisabled()
    }
  })

  it('links Trace in graph to the graph focused on this element', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Trace in graph' }))
    expect(screen.getByRole('heading', { name: 'Dependency graph' })).toBeInTheDocument()
  })
})

describe('sections', () => {
  it('shows documentation, derived lifecycle and the portfolio assessment', () => {
    renderApp(demo(), { route: APP })
    expect(screen.getByText(/Mainframe policy administration/)).toBeInTheDocument()

    expect(screen.getByText(/Current phase: .+ · derived from phase dates/)).toBeInTheDocument()
    expect(screen.getByText('01 Jan 2006')).toBeInTheDocument()
    expect(screen.getByText('01 Jan 2029')).toBeInTheDocument()

    expect(screen.getByText('Unreasonable')).toBeInTheDocument() // functional fit 2
    expect(screen.getByText('Inadequate')).toBeInTheDocument() // technical fit 1
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Migrate')).toBeInTheDocument()
  })

  it('groups relations by type in the handoff order with direction glyphs', () => {
    renderApp(demo(), { route: APP })
    const blocks = document.querySelectorAll('.relation-block__type')
    const order = [...blocks].map((node) => node.textContent)
    expect(order).toEqual([...order].sort(byHandoffOrder))
    expect(screen.getByText(/relations · \d+ types/)).toBeInTheDocument()
    // Serving from the Oracle estate arrives, so an incoming glyph is present.
    expect(document.querySelectorAll('.relation-row__direction').length).toBeGreaterThan(0)
  })

  it('opens a related element from a relation row', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    const relations = document.querySelector('.relations') as HTMLElement
    await user.click(within(relations).getByRole('button', { name: 'Policy Administration' }))
    expect(screen.getByRole('heading', { name: 'Policy Administration' })).toBeInTheDocument()
  })

  it('lists properties including the derived ones', () => {
    renderApp(demo(), { route: APP })
    expect(screen.getByText('archimate.type')).toBeInTheDocument()
    expect(screen.getByText('element.id')).toBeInTheDocument()
    expect(screen.getByText('last.modified')).toBeInTheDocument()
    expect(screen.getByText('owner')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
  })
})

describe('an element with no portfolio profile', () => {
  it('renders without breaking, saying what is not assessed', () => {
    renderApp(demo(), { route: CAPABILITY })
    expect(screen.getByRole('heading', { name: 'Claim Handling' })).toBeInTheDocument()
    expect(screen.getByText(/No lifecycle on Capability/)).toBeInTheDocument()
    // Every phase date reads as an em dash.
    const dates = [...document.querySelectorAll('.lifecycle__date')].map((n) => n.textContent)
    expect(dates).toEqual(['—', '—', '—', '—', '—'])
    // All four assessment cells say "Not assessed".
    expect(screen.getAllByText('Not assessed')).toHaveLength(4)
  })

  it('still scores completeness on the fields it can have', () => {
    renderApp(demo(), { route: CAPABILITY })
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})

describe('editing', () => {
  it('commits documentation through the command stack on blur', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const textarea = screen.getByLabelText('Documentation')
    await user.clear(textarea)
    await user.type(textarea, 'Retired in 2029.')
    await user.tab()

    expect(screen.getByText('LOCAL · 1 UNSAVED')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Retired in 2029.')).toBeInTheDocument()
  })

  it('records the change in the history timeline', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.selectOptions(screen.getByLabelText('Time classification'), 'Eliminate')

    expect(screen.getByText(/Updated assessment of/)).toBeInTheDocument()
    expect(screen.getByText(/\d{4}-\d{2}-\d{2} · you/)).toBeInTheDocument()
  })

  it('changes an assessment and shows it after leaving edit mode', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.selectOptions(screen.getByLabelText('Functional fit'), '4')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Perfect')).toBeInTheDocument()
  })

  it('edits a lifecycle date and re-derives the phase', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const eol = screen.getByLabelText('End of Life date')
    await user.clear(eol)
    await user.type(eol, '2020-01-01')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText(/Current phase: End of Life/)).toBeInTheDocument()
  })

  it('adds and removes a tag', async () => {
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Cloud target')
    renderApp(demo(), { route: CAPABILITY })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: '+ tag' }))
    expect(screen.getByRole('button', { name: 'Remove tag Cloud target' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove tag Cloud target' }))
    expect(
      screen.queryByRole('button', { name: 'Remove tag Cloud target' }),
    ).not.toBeInTheDocument()
    prompt.mockRestore()
  })
})

describe('adding a relation', () => {
  it('refuses an invalid combination and explains the rule', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: '+ Relation' }))

    const dialog = screen.getByRole('dialog', { name: 'Add relation' })
    await user.selectOptions(within(dialog).getByLabelText('Relationship'), 'Access')
    // An application component cannot Access another application component.
    await user.selectOptions(within(dialog).getByLabelText('Element'), 'app-crm')

    expect(within(dialog).getByRole('alert')).toHaveTextContent(/Access targets passive structure/)
    expect(within(dialog).getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('adds a valid relation through the command stack', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: '+ Relation' }))

    const dialog = screen.getByRole('dialog', { name: 'Add relation' })
    await user.selectOptions(within(dialog).getByLabelText('Relationship'), 'Access')
    await user.selectOptions(within(dialog).getByLabelText('Element'), 'obj-claim')
    await user.click(within(dialog).getByRole('button', { name: 'Add' }))

    expect(screen.queryByRole('dialog', { name: 'Add relation' })).not.toBeInTheDocument()
    expect(screen.getByText('LOCAL · 1 UNSAVED')).toBeInTheDocument()
    const relations = document.querySelector('.relations') as HTMLElement
    expect(within(relations).getByRole('button', { name: 'Claim File' })).toBeInTheDocument()
  })

  it('removes a relation in edit mode', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const remove = screen.getAllByRole('button', { name: /^Remove .* relation to / })[0]!
    await user.click(remove)
    expect(screen.getByText('LOCAL · 1 UNSAVED')).toBeInTheDocument()
  })
})

describe('right rail', () => {
  it('draws the neighbourhood mini-graph and navigates from it', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    const graph = screen.getByRole('group', { name: 'Neighbourhood' })
    const nodes = within(graph).getAllByRole('button')
    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes.length).toBeLessThanOrEqual(7)

    await user.click(nodes[0]!)
    expect(screen.queryByRole('heading', { name: 'Home & Away Policy Administration' })).toBeNull()
  })

  it('says so when an element has no neighbours', () => {
    // This asserted `getByRole('img')`, which only renders when neighbours
    // *exist* — and its own comment admitted the element it used has one. The
    // empty branch renders a paragraph and no svg at all, so the test passed with
    // the branch deleted. An element with no relationships is the only way to
    // reach it.
    const workspace = demo()
    workspace.elements.push({
      id: 'el-lonely',
      type: 'ApplicationComponent',
      name: 'Unconnected System',
      properties: {},
    })

    renderApp(workspace, { route: '/element/el-lonely' })
    // The relations section says the same thing, so scope the query to the rail.
    expect(document.querySelector('.neighbourhood__empty')).toHaveTextContent(
      /Nothing is connected to this element yet/,
    )
    expect(screen.queryByRole('group', { name: 'Neighbourhood' })).not.toBeInTheDocument()
  })
})

describe('a missing element', () => {
  it('explains rather than crashing', () => {
    renderApp(demo(), { route: '/element/nope' })
    expect(screen.getByText(/No element with the id/)).toBeInTheDocument()
  })
})

const HANDOFF_ORDER = [
  'Realization',
  'Serving',
  'Flow',
  'Access',
  'Assignment',
  'Composition',
  'Association',
  'Influence',
  'Aggregation',
  'Triggering',
  'Specialization',
]

function byHandoffOrder(a: string | null, b: string | null): number {
  return HANDOFF_ORDER.indexOf(a ?? '') - HANDOFF_ORDER.indexOf(b ?? '')
}

describe('the fixes from the #27 review', () => {
  it('does not carry edit mode, or one element’s fields, onto the next', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Home & Away Policy Administration')

    // Follow a relation. `/element/:id` re-renders without remounting, so the
    // `editing` flag and the uncontrolled inputs' `defaultValue` used to survive
    // — and the stale name was then committed onto the element you landed on the
    // moment the field lost focus.
    const relations = document.querySelector('.sheet__main') as HTMLElement
    await user.click(within(relations).getByRole('button', { name: 'Policy Administration' }))
    expect(screen.getByRole('heading', { name: 'Policy Administration' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()

    // And the element we arrived at still has its own name.
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Policy Administration')
  })

  it('clears a fit level instead of storing zero', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    const score = () =>
      Number(document.querySelector('.sheet__ring-value')!.textContent!.slice(0, -1))

    const before = score()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.selectOptions(screen.getByLabelText('Functional fit'), '')
    await user.click(screen.getByRole('button', { name: 'Done' }))

    // `Number('')` is 0, and `filled(0)` is 1 — so clearing this used to *raise*
    // the completeness score, because the field it removed still counted as
    // present. One field fewer has to score lower, and only clearing it properly
    // does that; storing a zero leaves the number where it was.
    expect(score()).toBeLessThan(before)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Functional fit')).toHaveValue('')
  })

  it('clears a TIME classification instead of storing an empty string', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.selectOptions(screen.getByLabelText('Time classification'), '')
    await user.click(screen.getByRole('button', { name: 'Done' }))

    // `'' as TimeClassification` compiles, and `value ?? 'Not assessed'` keeps an
    // empty string — so the cell rendered blank instead of saying it is unset,
    // and the exchange writer dropped it through a falsy guard without a problem
    // report. Ajv rejects it against the app's own published schema.
    const cells = [...document.querySelectorAll('.assessment__cell')]
    const time = cells.find((cell) => cell.textContent?.includes('Time classification'))!
    expect(time).toHaveTextContent('Not assessed')
  })

  it('refuses a tag containing the separator, and registers the ones it takes', async () => {
    const prompt = vi.spyOn(window, 'prompt')
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})

    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    // A tag is joined with `, ` on the way out and split on `,` on the way back,
    // so this one would return as two tags with `problems: []`.
    prompt.mockReturnValue('Core, regulated')
    await user.click(screen.getByRole('button', { name: '+ tag' }))
    expect(alert).toHaveBeenCalledWith(expect.stringMatching(/cannot contain a comma/))
    expect(screen.queryByText('Core, regulated')).not.toBeInTheDocument()

    prompt.mockReturnValue('Cloud native')
    await user.click(screen.getByRole('button', { name: '+ tag' }))
    expect(screen.getByText('Cloud native')).toBeInTheDocument()

    // Registered, not just written onto the element — otherwise the inventory
    // cannot filter by it and every chip renders in the neutral fallback.
    await user.click(screen.getByRole('link', { name: /Inventory/ }))
    expect(screen.getByRole('button', { name: /^Cloud native 1$/ })).toBeInTheDocument()

    prompt.mockRestore()
    alert.mockRestore()
  })

  it('lists a self-relation once, and counts it once', async () => {
    const workspace = demo()
    workspace.relationships.push({
      id: 'rel-self',
      type: 'Association',
      source: 'app-policy-ha',
      target: 'app-policy-ha',
      properties: {},
    })

    renderApp(workspace, { route: APP })
    // `relationshipsOf` is outgoing ++ incoming and a self-relation is in both,
    // so it appeared twice — a duplicate React key, an inflated relation count,
    // and deleting one of the two identical rows removed both.
    const rows = [...document.querySelectorAll('.relation-row')].filter((row) =>
      row.textContent?.includes('Home & Away Policy Administration'),
    )
    expect(rows).toHaveLength(1)
  })

  it('does not offer to assess an element type that is not scored on it', () => {
    renderApp(demo(), { route: CAPABILITY })
    // The cells still render — UI spec §4 makes "a capability shows Not
    // assessed" a case the screen must hold up for — but the pickers are gone,
    // because a value set here would be stored, exported, and ignored by every
    // completeness-driven report.
    expect(screen.getByText(/fit, criticality and TIME are scored on/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Functional fit')).not.toBeInTheDocument()
  })

  it('does not tell you a field is missing and inapplicable at once', () => {
    const workspace = demo()
    workspace.elements.push({
      id: 'el-new-app',
      type: 'ApplicationComponent',
      name: 'Brand New System',
      properties: {},
    })

    renderApp(workspace, { route: '/element/el-new-app' })
    // `hasLifecycle` answers "are any dates set", which said "No lifecycle dates
    // on this element type" beside a ring reading 0% whose tooltip named the
    // lifecycle dates as missing.
    expect(screen.getByText(/No phase dates yet — expected of this element type/)).toBeVisible()
    expect(screen.queryByText(/No lifecycle on/)).not.toBeInTheDocument()
  })

  it('keeps focus inside the add-relation dialog and gives it back on close', async () => {
    renderApp(demo(), { route: APP })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const opener = screen.getByRole('button', { name: '+ Relation' })
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Add relation' })
    expect(dialog.contains(document.activeElement)).toBe(true)

    // Tab used to walk out onto the chrome behind the overlay, where Enter
    // downloads a file nobody asked for.
    for (let i = 0; i < 12; i += 1) await user.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Add relation' })).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('makes the neighbourhood nodes reachable rather than presentational', () => {
    renderApp(demo(), { route: APP })
    const graph = screen.getByRole('group', { name: 'Neighbourhood' })
    // `role="img"` made the subtree presentational while it held up to seven
    // focusable nodes — tab stops announced as nothing.
    expect(within(graph).getAllByRole('button').length).toBeGreaterThan(0)
  })
})
