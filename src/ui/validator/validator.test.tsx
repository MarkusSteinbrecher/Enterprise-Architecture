import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { App } from '@/app/App'
import type { Workspace } from '@/model'
import {
  ModelStore,
  ModelStoreContext,
  ModelStoreProvider,
  useModelStore,
  type ModelStoreContextValue,
  type TabRole,
} from '@/store'
import { ElementScreen } from '@/ui/factsheet/ElementScreen'
import { clean, element, line, main, relationship, shape } from '@/test/validator-fixtures'
import { CHECKS_STORAGE_KEY } from './check-preferences'
import { findingTarget } from './finding-target'
import { GROUP_PAGE } from './ValidatorScreen'

/**
 * The validator screen (#193), in the whole app: Validate, the list, each
 * finding opening its subject, the stale mark, and the checks switched off.
 */

// The real thing, counted: where a finding opens is asked once per model change (#197 review).
vi.mock('./finding-target', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./finding-target')>()
  return { ...actual, findingTarget: vi.fn(actual.findingTarget) }
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

/**
 * A finding of every subject kind, one subject each:
 *
 * - element: "Claim form", which no view draws (Archi, warning);
 * - relationship drawn: a Composition from the clerk to the system, which
 *   ArchiMate does not allow, drawn in Main (Archi, error);
 * - relationship not drawn: a Serving from the system to the role (Archi, warning);
 * - view: "Blank", with nothing in it (Archi, advice);
 * - shape: the process nested in the system in "Nested", which no nesting
 *   relationship backs, and which "Nested" also draws on its own (Archi, advice);
 * - line: Main draws the system's Serving between the clerk and the process,
 *   which are not its ends (Archipelago, error);
 * - folder: "Lost", inside a folder that is not in the model (Archipelago, error).
 */
function everyKind(): Workspace {
  const workspace = clean()
  workspace.elements.push(element('lonely', 'BusinessObject', 'Claim form'))
  workspace.relationships.push(
    relationship('r-bad', 'Composition', 'actor', 'app'),
    relationship('r-hidden', 'Serving', 'app', 'role'),
  )
  main(workspace).connections.push(
    line('c-bad', 'r-bad', 'n-actor', 'n-app'),
    line('c-wrong', 'r-serves', 'n-actor', 'n-process'),
  )
  workspace.views.push(
    { id: 'view-empty', name: 'Blank', properties: {}, nodes: [], connections: [] },
    {
      id: 'view-nest',
      name: 'Nested',
      properties: {},
      // The process twice: the finding is the second shape's, which `?element=` cannot name.
      nodes: [
        shape('m-process-top', 'process'),
        shape('m-app', 'app'),
        shape('m-process', 'process', 'm-app'),
      ],
      connections: [],
    },
  )
  workspace.folders.push({ id: 'f-lost', name: 'Lost', parent: 'f-gone' })
  return workspace
}

let current: { pathname: string; search: string } = { pathname: '', search: '' }
function Where() {
  current = useLocation()
  return null
}

function renderAt(workspace: Workspace, route = '/validate') {
  let store: ModelStore | undefined
  function Probe() {
    store = useModelStore()
    return null
  }
  const ui = (
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ModelStoreProvider initialWorkspace={workspace} ephemeral>
        <App />
        <Probe />
        <Where />
      </ModelStoreProvider>
    </MemoryRouter>
  )
  const result = render(ui)
  return { ...result, store: () => store!, user: userEvent.setup() }
}

const validateButton = () => screen.getByRole('button', { name: 'Validate' })
const section = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) })
const groupNames = (region: HTMLElement) =>
  within(region)
    .getAllByRole('group')
    .map((group) => group.getAttribute('aria-label'))
const checkbox = (label: string) => screen.getByRole('checkbox', { name: new RegExp(label) })

describe('the validator screen (#193)', () => {
  it('runs only when asked, then lists findings by severity, then by check, with counts', async () => {
    const { user } = renderAt(everyKind())
    expect(await screen.findByText(/^Not validated yet/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /^Errors/ })).toBeNull()

    await user.click(validateButton())
    expect(screen.getByLabelText('Last run')).toHaveTextContent('3 errors · 2 warnings · 2 advice')
    expect(section('Errors')).toHaveAccessibleName('Errors 3')
    expect(groupNames(section('Errors'))).toEqual([
      'Illegal relation, 1',
      'view.connection-mismatch, 1',
      'folder.dangling-parent, 1',
    ])
    expect(groupNames(section('Warnings'))).toEqual(['Unused element, 1', 'Unused relation, 1'])
    expect(groupNames(section('Advice'))).toEqual(['Empty view, 1', 'Visual nesting, 1'])
    // Archi's and Archipelago's are told apart.
    const groups = within(section('Errors')).getAllByRole('group')
    expect(groups[0]).toHaveTextContent('Archi')
    expect(groups[1]).toHaveTextContent('Archipelago')
  })

  it('says so when the model is clean', async () => {
    const { user } = renderAt(clean())
    await user.click(await screen.findByRole('button', { name: 'Validate' }))
    expect(screen.getByLabelText('Last run')).toHaveTextContent('0 findings')
    expect(screen.getByText('No problems found.')).toBeInTheDocument()
  })

  describe('opens the subject of each finding', () => {
    async function open(name: RegExp) {
      const h = renderAt(everyKind())
      await h.user.click(await screen.findByRole('button', { name: 'Validate' }))
      await h.user.click(screen.getByRole('link', { name }))
      return h
    }
    const selected = () =>
      screen.queryAllByTestId('selection').map((s) => s.getAttribute('data-selected'))

    it('an element, on its fact sheet', async () => {
      await open(/"Claim form" is not used in a view/)
      expect(await screen.findByRole('heading', { name: 'Claim form' })).toBeInTheDocument()
      expect(current.pathname).toBe('/element/lonely')
    })

    it('a relationship a view draws, on that view with its line selected', async () => {
      await open(/Composition from "Clerk" to "Claims system" is not permitted/)
      expect(await screen.findByTestId('view-canvas')).toBeInTheDocument()
      expect(current.pathname).toBe('/view/view-main')
      expect(selected()).toEqual(['c-bad'])
    })

    it('a relationship no view draws, on the fact sheet of its source', async () => {
      await open(/^Serving from "Claims system" to "Claims handler" is not used/)
      expect(await screen.findByRole('heading', { name: 'Claims system' })).toBeInTheDocument()
      expect(current.pathname).toBe('/element/app')
    })

    it('a view, on the canvas', async () => {
      await open(/"Blank" is empty/)
      expect(await screen.findByText(/^This view is empty./)).toBeInTheDocument()
      expect(current.pathname).toBe('/view/view-empty')
    })

    it('a shape, on its view with it selected', async () => {
      await open(/"Handle claim" is nested inside of "Claims system"/)
      expect(await screen.findByTestId('view-canvas')).toBeInTheDocument()
      expect(current.pathname).toBe('/view/view-nest')
      expect(selected()).toEqual(['m-process'])
      // The URL says what the tree reads once the view is open: the shape's element.
      expect(current.search).toBe('?element=process')
      expect(
        screen.getByRole('complementary', { name: /Selected: Handle claim/ }),
      ).toBeInTheDocument()
    })

    it('a line, on its view with it selected', async () => {
      await open(/connection "c-wrong" draws Serving/)
      expect(await screen.findByTestId('view-canvas')).toBeInTheDocument()
      expect(current.pathname).toBe('/view/view-main')
      expect(selected()).toEqual(['c-wrong'])
      expect(current.search).toBe('')
    })

    it('a folder, in the model tree, which opens to show it', async () => {
      localStorage.setItem('archipelago.tree-open', 'false')
      const h = renderAt(everyKind())
      await h.user.click(await screen.findByRole('button', { name: 'Validate' }))
      expect(screen.queryByRole('tree', { name: 'Model tree' })).toBeNull()
      await h.user.click(screen.getByRole('link', { name: /Folder "Lost" is inside "f-gone"/ }))
      const tree = await screen.findByRole('tree', { name: 'Model tree' })
      const row = within(tree)
        .getAllByRole('treeitem')
        .find((item) => item.querySelector('.tree__name')?.textContent === 'Lost')
      expect(row).toHaveAttribute('aria-selected', 'true')
      // Still on the validator, with the list beside the tree.
      expect(current.pathname).toBe('/validate')
      expect(screen.getByLabelText('Last run')).toBeInTheDocument()
      // Open for this visit; the remembered choice is the user's.
      expect(localStorage.getItem('archipelago.tree-open')).toBe('false')
    })

    it('a folder again, after the tree was closed, opens the tree again', async () => {
      localStorage.setItem('archipelago.tree-open', 'false')
      const h = renderAt(everyKind())
      await h.user.click(await screen.findByRole('button', { name: 'Validate' }))
      const link = () => screen.getByRole('link', { name: /Folder "Lost" is inside "f-gone"/ })
      await h.user.click(link())
      expect(await screen.findByRole('tree', { name: 'Model tree' })).toBeInTheDocument()
      await h.user.click(screen.getByRole('button', { name: /Model tree/ }))
      expect(screen.queryByRole('tree', { name: 'Model tree' })).toBeNull()

      // The same URL as before, so only the navigation itself is new.
      await h.user.click(link())
      expect(current.search).toBe('?folder=f-lost')
      const tree = await screen.findByRole('tree', { name: 'Model tree' })
      const row = within(tree)
        .getAllByRole('treeitem')
        .find((item) => item.querySelector('.tree__name')?.textContent === 'Lost')
      expect(row).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('keeps the list when a finding has been opened and Back is pressed', async () => {
    const { user } = renderAt(everyKind())
    await user.click(await screen.findByRole('button', { name: 'Validate' }))
    await user.click(screen.getByRole('link', { name: /"Claim form" is not used/ }))
    expect(await screen.findByRole('heading', { name: 'Claim form' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Validator' }))
    expect(screen.getByLabelText('Last run')).toHaveTextContent('3 errors')
  })

  describe('a stale run', () => {
    it('is marked as soon as the model changes, and cleared by validating again', async () => {
      const { user, store } = renderAt(everyKind())
      await user.click(await screen.findByRole('button', { name: 'Validate' }))
      expect(screen.getByLabelText('Last run')).toBeInTheDocument()
      expect(screen.queryByRole('status')).toBeNull()

      act(() => {
        store().updateElement('lonely', (e) => ({ ...e, name: 'Claim form v2' }))
      })
      expect(screen.getByRole('status')).toHaveTextContent('The model has changed since this run')

      await user.click(validateButton())
      expect(screen.getByRole('link', { name: /"Claim form v2" is not used/ })).toBeInTheDocument()
      expect(screen.queryByRole('status')).toBeNull()
    })

    it('is not marked by a save, which changes nothing in the model', async () => {
      const { user, store } = renderAt(everyKind())
      act(() => {
        store().updateElement('lonely', (e) => ({ ...e, name: 'Claim form v2' }))
      })
      await user.click(await screen.findByRole('button', { name: 'Validate' }))
      act(() => store().markSaved())
      expect(store().dirty).toBe(0)
      expect(screen.getByLabelText('Last run')).toBeInTheDocument()
      expect(screen.queryByRole('status')).toBeNull()
    })

    it('lists a subject deleted since the run without a link', async () => {
      const { user, store } = renderAt(everyKind())
      await user.click(await screen.findByRole('button', { name: 'Validate' }))
      act(() => store().removeElement('lonely'))
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('"Claim form" is not used in a view.')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /"Claim form" is not used/ })).toBeNull()
      expect(screen.getByText(/no longer in the model/)).toBeInTheDocument()
    })

    it('asks where its findings open once per model change, not on every render', async () => {
      const { user, store } = renderAt(everyKind())
      await user.click(await screen.findByRole('button', { name: 'Validate' }))
      const rows = document.querySelectorAll('.validator__finding').length
      expect(rows).toBe(7)
      vi.mocked(findingTarget).mockClear()
      // Switching a check re-renders the list and leaves the model as it is.
      await user.click(checkbox('Unused elements'))
      expect(screen.getByRole('status')).toHaveTextContent('The checks have changed since this run')
      expect(findingTarget).not.toHaveBeenCalled()
      // A change to the model asks again, once for each row listed.
      act(() => store().updateElement('lonely', (e) => ({ ...e, name: 'Claim form v2' })))
      expect(screen.getByRole('status')).toHaveTextContent('The model has changed since this run')
      expect(findingTarget).toHaveBeenCalledTimes(rows)
    })

    it('of another workspace is never shown', async () => {
      const { user, store } = renderAt(everyKind())
      await user.click(await screen.findByRole('button', { name: 'Validate' }))
      expect(screen.getByLabelText('Last run')).toBeInTheDocument()
      act(() => store().replaceWorkspace({ ...clean(), id: 'ws-other' }, { markClean: true }))
      expect(screen.getByText(/^Not validated yet/)).toBeInTheDocument()
      expect(screen.queryByLabelText('Last run')).toBeNull()
    })

    it('of the same workspace opened again is stale', async () => {
      const { user, store } = renderAt(everyKind())
      await user.click(await screen.findByRole('button', { name: 'Validate' }))
      act(() => store().replaceWorkspace(everyKind(), { markClean: true }))
      expect(screen.getByLabelText('Last run')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('The model has changed')
    })
  })

  describe('switching a check off', () => {
    it('removes its findings from the next run, not from the one on show', async () => {
      const { user } = renderAt(everyKind())
      await user.click(await screen.findByRole('button', { name: 'Validate' }))
      await user.click(checkbox('Unused elements'))
      expect(checkbox('Unused elements')).not.toBeChecked()
      expect(groupNames(section('Warnings'))).toContain('Unused element, 1')
      expect(screen.getByRole('status')).toHaveTextContent('The checks have changed since this run')

      await user.click(validateButton())
      expect(groupNames(section('Warnings'))).toEqual(['Unused relation, 1'])
      expect(screen.queryByRole('status')).toBeNull()
    })

    it('is remembered across a reload', async () => {
      const first = renderAt(everyKind())
      await first.user.click(await screen.findByRole('button', { name: 'Validate' }))
      await first.user.click(checkbox('Empty views'))
      first.unmount()

      const { user } = renderAt(everyKind())
      expect(await screen.findByRole('checkbox', { name: /Empty views/ })).not.toBeChecked()
      expect(checkbox('Unused elements')).toBeChecked()
      await user.click(validateButton())
      expect(groupNames(section('Advice'))).toEqual(['Visual nesting, 1'])
    })

    it('works where storage is blocked, with every check on to start with', async () => {
      localStorage.setItem(CHECKS_STORAGE_KEY, JSON.stringify({ 'empty-views': false }))
      const blocked = () => {
        throw new DOMException('blocked', 'SecurityError')
      }
      vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked })
      const { user } = renderAt(everyKind())
      expect(await screen.findByRole('checkbox', { name: /Empty views/ })).toBeChecked()
      for (const box of screen.getAllByRole('checkbox')) expect(box).toBeChecked()

      await user.click(checkbox('Unused elements'))
      await user.click(validateButton())
      expect(groupNames(section('Warnings'))).toEqual(['Unused relation, 1'])

      // The palette's run uses the same choice, for the rest of the visit.
      await user.keyboard('{Control>}k{/Control}')
      await user.keyboard('Validate model{Enter}')
      expect(groupNames(section('Warnings'))).toEqual(['Unused relation, 1'])
    })
  })

  it('runs from the command palette and shows the list', async () => {
    const { user } = renderAt(everyKind(), '/inventory')
    expect(await screen.findByRole('link', { name: /Inventory/ })).toBeInTheDocument()
    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('Validate model')
    await user.keyboard('{Enter}')
    expect(current.pathname).toBe('/validate')
    expect(screen.getByLabelText('Last run')).toHaveTextContent('3 errors · 2 warnings · 2 advice')
  })

  it('offers the rest of a long group, and puts focus on the first finding it shows', async () => {
    const workspace = clean()
    for (let i = 0; i < GROUP_PAGE + 5; i += 1) {
      workspace.elements.push(element(`spare-${i}`, 'BusinessObject', `Spare ${i}`))
    }
    const { user } = renderAt(workspace)
    await user.click(await screen.findByRole('button', { name: 'Validate' }))
    const group = within(section('Warnings')).getByRole('group')
    expect(within(group).getAllByRole('link')).toHaveLength(GROUP_PAGE)
    await user.click(within(group).getByRole('button', { name: 'Show 5 more findings' }))
    expect(within(group).getAllByRole('link')).toHaveLength(GROUP_PAGE + 5)
    expect(within(group).queryByRole('button')).toBeNull()
    expect(document.activeElement).toBe(within(group).getAllByRole('link')[GROUP_PAGE])
  })
})

describe('deleting from the fact sheet', () => {
  it('deletes the element and puts focus on the notice that says so', async () => {
    const { user, store } = renderAt(everyKind(), '/element/lonely')
    await user.click(await screen.findByRole('button', { name: 'Delete…' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete element from the model' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete from model' }))
    expect(store().element('lonely')).toBeUndefined()
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent('“Claim form” is deleted from the model.')
    expect(document.activeElement).toBe(notice)
  })

  it('is offered only in the tab that holds the model', () => {
    const sheet = (role: TabRole) => {
      const value = { store: new ModelStore(everyKind()), role, tabRole: 'writer', ready: true }
      return render(
        <MemoryRouter initialEntries={['/element/lonely']}>
          <ModelStoreContext.Provider value={value as unknown as ModelStoreContextValue}>
            <Routes>
              <Route path="/element/:id" element={<ElementScreen />} />
            </Routes>
          </ModelStoreContext.Provider>
        </MemoryRouter>,
      )
    }
    const writer = sheet('writer')
    expect(screen.getByRole('button', { name: 'Delete…' })).toBeInTheDocument()
    writer.unmount()
    sheet('reader')
    expect(screen.getByRole('heading', { name: 'Claim form' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete…' })).toBeNull()
  })

  it('says no view draws an element no view draws', async () => {
    const { user } = renderAt(everyKind(), '/element/lonely')
    await user.click(await screen.findByRole('button', { name: 'Delete…' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete element from the model' })
    expect(dialog).toHaveTextContent('Business Object “Claim form” leaves the model.')
    expect(dialog).toHaveTextContent('No view draws it.')
    expect(dialog).not.toHaveTextContent(/other view|every view|Also/)
  })

  it('counts the relationships of an element no view draws, and nothing more', async () => {
    const workspace = everyKind()
    workspace.relationships.push(relationship('r-lonely', 'Association', 'lonely', 'app'))
    const { user } = renderAt(workspace, '/element/lonely')
    await user.click(await screen.findByRole('button', { name: 'Delete…' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete element from the model' })
    expect(dialog).toHaveTextContent('“Claim form” leaves the model, with its 1 relationship.')
  })

  it('names every view that draws it, none of them "other"', async () => {
    const { user } = renderAt(everyKind(), '/element/app')
    await user.click(await screen.findByRole('button', { name: 'Delete…' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete element from the model' })
    expect(dialog).toHaveTextContent(
      /“Claims system” leaves the model, with its \d+ relationships, and every view that draws it\./,
    )
    expect(within(dialog).getByText('Drawn in')).toBeInTheDocument()
    expect(
      within(dialog)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Main', 'Nested'])
    expect(dialog).not.toHaveTextContent(/Also|other view/)
  })

  describe('when the tab becomes a reader with the dialog open', () => {
    function sheet() {
      const store = new ModelStore(everyKind())
      const ui = (role: TabRole) => (
        <MemoryRouter initialEntries={['/element/lonely']}>
          <ModelStoreContext.Provider
            value={
              { store, role, tabRole: 'writer', ready: true } as unknown as ModelStoreContextValue
            }
          >
            <Routes>
              <Route path="/element/:id" element={<ElementScreen />} />
            </Routes>
          </ModelStoreContext.Provider>
        </MemoryRouter>
      )
      const result = render(ui('writer'))
      return { store, user: userEvent.setup(), as: (role: TabRole) => result.rerender(ui(role)) }
    }
    const dialog = () => screen.queryByRole('dialog', { name: 'Delete element from the model' })

    it('closes it, so a reader cannot delete', async () => {
      const h = sheet()
      await h.user.click(screen.getByRole('button', { name: 'Delete…' }))
      expect(dialog()).toBeInTheDocument()
      h.as('reader')
      // Present first: the sheet is still there, as a reader's.
      expect(screen.getByRole('heading', { name: 'Claim form' })).toBeInTheDocument()
      expect(dialog()).toBeNull()
      expect(screen.queryByRole('button', { name: 'Delete from model' })).toBeNull()
      expect(h.store.element('lonely')).toBeDefined()
    })

    it('does not reopen it when the tab can write again', async () => {
      const h = sheet()
      await h.user.click(screen.getByRole('button', { name: 'Delete…' }))
      h.as('reader')
      h.as('writer')
      expect(screen.getByRole('button', { name: 'Delete…' })).toBeInTheDocument()
      expect(dialog()).toBeNull()
    })
  })

  it('cancels without deleting', async () => {
    const { user, store } = renderAt(everyKind(), '/element/lonely')
    await user.click(await screen.findByRole('button', { name: 'Delete…' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('heading', { name: 'Claim form' })).toBeInTheDocument()
    expect(store().element('lonely')).toBeDefined()
  })
})
