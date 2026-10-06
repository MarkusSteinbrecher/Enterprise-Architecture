import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import claimsXml from '@/io/fixtures/claims-platform.xml?raw'
import { importExchangeXml } from '@/io'
import type { Workspace } from '@/model'
import { drawnWorkspace, syntheticWorkspace } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { TREE_OPEN_STORAGE_KEY } from '@/ui/shell/AppShell'
import { TREE_VIRTUALISE_ABOVE } from './ModelTree'

function claims(): Workspace {
  const result = importExchangeXml(claimsXml, 'claims-platform.xml')
  if (!result.workspace) throw new Error('fixture did not import')
  return result.workspace
}

/** `drawnWorkspace` with a second, empty Application folder to move things into. */
function withLegacy(): Workspace {
  const workspace = drawnWorkspace()
  workspace.folders.push({ id: 'f-legacy', name: 'Legacy', root: 'application' })
  return workspace
}

function tree(): HTMLElement {
  return screen.getByRole('tree', { name: 'Model tree' })
}

/** The row showing `name`, matched on its name alone (badges and codes aside). */
function row(name: string, kind?: string): HTMLElement {
  const found = queryRow(name, kind)
  if (!found) throw new Error(`no tree row named ${name}`)
  return found
}

function queryRow(name: string, kind?: string): HTMLElement | undefined {
  return within(tree())
    .queryAllByRole('treeitem')
    .find(
      (el) =>
        el.querySelector('.tree__name')?.textContent === name &&
        (kind === undefined || el.dataset.kind === kind),
    )
}

/** The row `aria-activedescendant` points at — the keyboard cursor. */
function activeRow(): HTMLElement | null {
  const id = tree().getAttribute('aria-activedescendant')
  return id ? document.getElementById(id) : null
}

function activeName(): string | null | undefined {
  return activeRow()?.querySelector('.tree__name')?.textContent
}

beforeEach(() => localStorage.clear())

describe('structure', () => {
  it('shows imported folders with their hierarchy', async () => {
    renderApp(claims())
    const user = userEvent.setup()
    await user.click(row('Application'))
    await user.click(row('Claims applications'))
    await user.click(row('Legacy'))
    await user.click(row('Host-based'))
    const host = row('Policy Host')
    expect(host).toHaveAttribute('aria-level', '5')
    expect(row('Legacy CRM')).toHaveAttribute('aria-level', '4')
    expect(row('Host-based')).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows an object without a folder in its default group', async () => {
    renderApp(drawnWorkspace())
    const user = userEvent.setup()
    await user.click(row('Strategy'))
    expect(row('Claim Handling')).toHaveAttribute('aria-level', '2')
    await user.click(row('Technology & Physical'))
    expect(row('Kubernetes Platform')).toHaveAttribute('aria-level', '2')
  })

  it('can be hidden from the nav, and remembers it', async () => {
    renderApp(drawnWorkspace())
    const user = userEvent.setup()
    const toggle = screen.getByRole('button', { name: /Model tree/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(tree()).toBeInTheDocument()
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
    expect(localStorage.getItem(TREE_OPEN_STORAGE_KEY)).toBe('false')
    await user.click(toggle)
    expect(tree()).toBeInTheDocument()
  })
})

describe('keyboard (WAI-ARIA tree pattern)', () => {
  it('moves with the arrows, Home and End, and opens and closes with Right and Left', async () => {
    renderApp(drawnWorkspace())
    const user = userEvent.setup()
    act(() => tree().focus())
    // Focus lands on the first row.
    expect(activeName()).toBe('Strategy')

    await user.keyboard('{ArrowDown}')
    expect(activeName()).toBe('Business')
    expect(row('Business')).toHaveAttribute('aria-expanded', 'false')

    // Right opens a closed row, then steps into it.
    await user.keyboard('{ArrowRight}')
    expect(row('Business')).toHaveAttribute('aria-expanded', 'true')
    expect(activeName()).toBe('Business')
    await user.keyboard('{ArrowRight}')
    expect(activeName()).toBe('Claims')
    expect(activeRow()).toHaveAttribute('aria-level', '2')

    // Left on a closed row goes to its parent; on an open row, closes it.
    await user.keyboard('{ArrowLeft}')
    expect(activeName()).toBe('Business')
    await user.keyboard('{ArrowLeft}')
    expect(row('Business')).toHaveAttribute('aria-expanded', 'false')
    expect(queryRow('Claims')).toBeUndefined()

    await user.keyboard('{End}')
    expect(activeName()).toBe('Views')
    await user.keyboard('{ArrowDown}')
    expect(activeName()).toBe('Views')
    await user.keyboard('{Home}')
    expect(activeName()).toBe('Strategy')
    await user.keyboard('{ArrowUp}')
    expect(activeName()).toBe('Strategy')
  })

  it('says where each row sits for assistive technology', () => {
    renderApp(drawnWorkspace())
    const business = row('Business')
    expect(business).toHaveAttribute('aria-level', '1')
    expect(business).toHaveAttribute('aria-posinset', '2')
    expect(business).toHaveAttribute('aria-setsize', '9')
    // A group with nothing in it has nothing to expand.
    expect(row('Motivation')).not.toHaveAttribute('aria-expanded')
  })

  it('opens a folder with Enter and a view with Enter', async () => {
    renderApp(drawnWorkspace())
    const user = userEvent.setup()
    act(() => tree().focus())
    await user.keyboard('{End}{Enter}')
    expect(row('Views')).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{ArrowDown}{Enter}{ArrowDown}')
    expect(activeName()).toBe('Claims landscape')
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'Claims landscape' })).toBeInTheDocument()
  })

  it('jumps by typed letters, which do not reach the app’s single-letter shortcuts', async () => {
    renderApp(drawnWorkspace())
    const user = userEvent.setup()
    act(() => tree().focus())
    await user.keyboard('t')
    expect(activeName()).toBe('Technology & Physical')
    // `g` opens the dependency graph anywhere else.
    await user.keyboard('g')
    expect(screen.queryByRole('heading', { name: /Dependency graph/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'TABLE' })).toBeInTheDocument()
  })
})

describe('selection follows the screen beside the tree', () => {
  it('reveals and selects the element whose fact sheet is open', async () => {
    renderApp(drawnWorkspace(), { route: '/element/proc-claim' })
    await screen.findByRole('heading', { name: 'Handle Claim' })
    const handle = row('Handle Claim')
    expect(handle).toHaveAttribute('aria-selected', 'true')
    expect(handle).toHaveAttribute('aria-level', '4')
    expect(row('Core processes')).toHaveAttribute('aria-expanded', 'true')
    expect(row('Claims')).toHaveAttribute('aria-selected', 'false')
  })

  it('opens an element’s fact sheet from the tree', async () => {
    renderApp(drawnWorkspace())
    const user = userEvent.setup()
    await user.click(row('Strategy'))
    await user.click(row('Claim Handling'))
    expect(await screen.findByRole('heading', { name: 'Claim Handling' })).toBeInTheDocument()
    expect(row('Claim Handling')).toHaveAttribute('aria-selected', 'true')
  })

  it('selects on the canvas from the tree, and in the tree from the canvas', async () => {
    renderApp(claims(), { route: '/view/v-landscape' })
    const user = userEvent.setup()
    const canvas = await screen.findByTestId('view-canvas')
    expect(row('Claims landscape')).toHaveAttribute('aria-selected', 'true')

    // Tree → canvas: the element is drawn here, so it is selected, not opened.
    await user.type(
      screen.getByRole('searchbox', { name: 'Filter the model tree' }),
      'Claims Engine',
    )
    await user.click(row('Claims Engine', 'element'))
    expect(
      await screen.findByRole('complementary', { name: /Selected: Claims Engine/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Claims landscape' })).toBeInTheDocument()
    expect(row('Claims Engine', 'element')).toHaveAttribute('aria-selected', 'true')

    // Canvas → tree: with the filter cleared, the tree reveals what the canvas selected.
    await user.clear(screen.getByRole('searchbox', { name: 'Filter the model tree' }))
    await user.click(canvas.querySelector('[data-node="o-host"] [data-shape]')!)
    await screen.findByRole('complementary', { name: /Selected: Policy Host/ })
    await waitFor(() => expect(row('Policy Host')).toHaveAttribute('aria-selected', 'true'))
    expect(row('Host-based')).toHaveAttribute('aria-expanded', 'true')
    expect(row('Claims Engine', 'element')).toHaveAttribute('aria-selected', 'false')
  })

  it('opens the fact sheet of an element the open view does not draw', async () => {
    renderApp(claims(), { route: '/view/v-empty' })
    const user = userEvent.setup()
    await screen.findByText(/^This view is empty./)
    await user.type(screen.getByRole('searchbox', { name: 'Filter the model tree' }), 'Policy Host')
    await user.click(row('Policy Host', 'element'))
    expect(await screen.findByRole('heading', { name: 'Policy Host' })).toBeInTheDocument()
  })
})

describe('moving', () => {
  const dataTransfer = () => ({
    effectAllowed: '',
    dropEffect: '',
    setData: () => undefined,
  })

  it('drags an element into a folder of its group, and refuses one of another group', async () => {
    renderApp(withLegacy())
    const user = userEvent.setup()
    await user.click(row('Application'))
    await user.click(row('Claims apps'))
    const engine = row('Claim Handling Engine')
    expect(engine).toHaveAttribute('aria-level', '3')

    fireEvent.dragStart(engine, { dataTransfer: dataTransfer() })
    // `fireEvent` returns false when the handler cancelled the event — which, for
    // dragover, is how a drop target says yes.
    expect(fireEvent.dragOver(row('Business'), { dataTransfer: dataTransfer() })).toBe(true)
    expect(row('Business')).not.toHaveClass('tree__row--drop')
    expect(fireEvent.dragOver(row('Legacy'), { dataTransfer: dataTransfer() })).toBe(false)
    expect(row('Legacy')).toHaveClass('tree__row--drop')
    fireEvent.drop(row('Legacy'), { dataTransfer: dataTransfer() })

    expect(row('Legacy')).toHaveAttribute('aria-expanded', 'true')
    expect(row('Claims apps')).not.toHaveAttribute('aria-expanded')
    expect(screen.getByTestId('tree-announcer')).toHaveTextContent(
      'Moved “Claim Handling Engine” to “Legacy”.',
    )
  })

  it('refuses to drop a folder into itself', async () => {
    renderApp(drawnWorkspace())
    const user = userEvent.setup()
    await user.click(row('Business'))
    await user.click(row('Claims'))
    fireEvent.dragStart(row('Claims'), { dataTransfer: dataTransfer() })
    expect(fireEvent.dragOver(row('Core processes'), { dataTransfer: dataTransfer() })).toBe(true)
    expect(fireEvent.dragOver(row('Business'), { dataTransfer: dataTransfer() })).toBe(false)
  })

  it('moves with cut and paste from the keyboard, and says why when it cannot', async () => {
    renderApp(withLegacy())
    const user = userEvent.setup()
    await user.click(row('Application'))
    await user.click(row('Claims apps'))
    await user.click(row('Claim Handling Engine'))
    act(() => tree().focus())
    await user.keyboard('{Control>}x{/Control}')
    expect(row('Claim Handling Engine')).toHaveClass('tree__row--cut')

    // Business is another group: refused, and the cut is kept.
    await user.keyboard('{Home}{ArrowDown}{Control>}v{/Control}')
    expect(screen.getByTestId('tree-announcer')).toHaveTextContent(
      /Cannot move “Claim Handling Engine”: .*belongs under Application/,
    )
    expect(row('Claim Handling Engine')).toHaveAttribute('aria-level', '3')

    await user.click(row('Legacy'))
    act(() => tree().focus())
    await user.keyboard('{Control>}v{/Control}')
    expect(row('Legacy')).toHaveAttribute('aria-expanded', 'true')
    expect(row('Claim Handling Engine')).not.toHaveClass('tree__row--cut')
    expect(activeName()).toBe('Claim Handling Engine')
  })
})

describe('folders', () => {
  it('creates a folder in the active group, named on the spot', async () => {
    renderApp(drawnWorkspace())
    const user = userEvent.setup()
    await user.click(row('Application'))
    await user.click(screen.getByRole('button', { name: '+ Folder' }))
    const input = screen.getByRole('textbox', { name: 'Folder name' })
    expect(input).toHaveFocus()
    expect(input).toHaveValue('New folder')
    await user.keyboard('Integration{Enter}')
    expect(row('Integration')).toHaveAttribute('aria-level', '2')
    expect(tree()).toHaveFocus()
    expect(activeName()).toBe('Integration')
  })

  it('renames with F2, and Escape keeps the old name', async () => {
    renderApp(drawnWorkspace())
    const user = userEvent.setup()
    await user.click(row('Business'))
    await user.click(row('Claims'))
    act(() => tree().focus())
    await user.keyboard('{F2}')
    await user.keyboard('{Control>}a{/Control}Claims and recoveries{Escape}')
    expect(row('Claims')).toBeInTheDocument()
    await user.keyboard('{F2}{Control>}a{/Control}Claims and recoveries{Enter}')
    expect(row('Claims and recoveries')).toBeInTheDocument()
    expect(queryRow('Claims')).toBeUndefined()
  })

  it('deletes with Delete, keeping what was in it', async () => {
    renderApp(drawnWorkspace())
    const user = userEvent.setup()
    await user.click(row('Business'))
    await user.click(row('Claims'))
    await user.click(row('Core processes'))
    act(() => tree().focus())
    await user.keyboard('{Delete}')
    expect(queryRow('Core processes')).toBeUndefined()
    // Handle Claim moved up into Claims, which is still open.
    expect(row('Handle Claim')).toHaveAttribute('aria-level', '3')
    expect(activeName()).toBe('Claims')
  })
})

describe('filter', () => {
  it('shows the matches inside their folders, and the whole tree again when cleared', async () => {
    renderApp(claims())
    const user = userEvent.setup()
    const filter = screen.getByRole('searchbox', { name: 'Filter the model tree' })
    await user.type(filter, 'policy host')
    expect(row('Policy Host', 'element')).toHaveAttribute('aria-level', '5')
    expect(queryRow('Legacy CRM')).toBeUndefined()
    expect(screen.getByText(/\d+ shown/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(filter).toHaveValue('')
    expect(queryRow('Policy Host')).toBeUndefined()
    expect(row('Application')).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('at 5,000 elements', () => {
  // Same reason as the inventory's own scale test: jsdom gives every box zero
  // height, so the virtualiser would render nothing and a one-sided bound would
  // pass. A real viewport height makes the windowed branch run.
  const VIEWPORT = 600
  const ROW_HEIGHT = 26
  let offsetHeight: PropertyDescriptor | undefined
  let scrollTo: PropertyDescriptor | undefined

  beforeEach(() => {
    // jsdom does not scroll: `scrollTo` is a stub that leaves `scrollTop` at 0, so
    // the virtualiser could never bring a far row into its window. This one
    // scrolls and says so, the way a browser does.
    scrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo')
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value(this: HTMLElement, options: ScrollToOptions) {
        if (options.top !== undefined) {
          Object.defineProperty(this, 'scrollTop', { configurable: true, value: options.top })
        }
        this.dispatchEvent(new Event('scroll'))
      },
    })
    // …and has no content height, which caps every scroll at 0.
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get(this: HTMLElement) {
        const spacer = this.firstElementChild as HTMLElement | null
        return spacer ? parseFloat(spacer.style.height) || 0 : 0
      },
    })
    offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains('model-tree__scroll') ||
          this.classList.contains('table__scroll')
          ? VIEWPORT
          : ROW_HEIGHT
      },
    })
  })

  afterEach(() => {
    if (offsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight)
    // Ours shadow jsdom's on Element.prototype; deleting them restores it.
    delete (HTMLElement.prototype as { scrollHeight?: unknown }).scrollHeight
    if (scrollTo) Object.defineProperty(HTMLElement.prototype, 'scrollTo', scrollTo)
    else delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo
  })

  it('mounts the visible rows and only those, including the selected one', async () => {
    renderApp(syntheticWorkspace(5_000), { route: '/element/app-42' })
    await screen.findByRole('heading', { name: 'Application 42' })
    const rendered = within(tree()).getAllByRole('treeitem').length
    expect(rendered).toBeGreaterThanOrEqual(Math.floor(VIEWPORT / ROW_HEIGHT))
    expect(rendered).toBeLessThan(TREE_VIRTUALISE_ABOVE)
    // app-42 sorts thousands of rows down; the tree scrolled to it, so the
    // cursor's row is mounted and `aria-activedescendant` names a real element.
    await waitFor(() => expect(activeName()).toBe('Application 42'))
    // Inside Application, which holds 4,900 elements and was opened to reveal it.
    expect(activeRow()).toHaveAttribute('aria-level', '2')
    expect(within(tree()).getAllByRole('treeitem').length).toBeLessThan(TREE_VIRTUALISE_ABOVE)
    expect(row('Application 42')).toHaveAttribute('aria-selected', 'true')
  })
})
