import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  ALWAYS_ALLOWED,
  ELEMENT_TYPES,
  emptyWorkspace,
  parseRelationshipMatrix,
  RELATIONSHIP_TYPE_NAMES,
  RELATIONSHIP_TYPES,
  validateRelationship,
  VIEWPOINTS,
  type ElementType,
} from '@/model'
import { loadDemoWorkspace } from '@/io'
import { renderApp } from '@/test/render'
import { setup } from '@/test/view-editor'
import { ARCHIMATE_VERSION, ELEMENT_GUIDE, RELATIONSHIP_GUIDE } from './content'
import { connectionsBetween, LOOKUP_TYPES } from './connections'
import { ConnectionList } from './GuideScreen'
import { PATTERNS } from './patterns'

/**
 * The ArchiMate guide (#149). The reference half is generated from `src/model`;
 * these tests hold it to sources that are not the guide's own code: Archi's
 * matrix read from disk, the viewpoint table as data, and the validity check.
 */

/** Archi's matrix, read from the file rather than through `validity.ts`. */
const ARCHI_MATRIX = parseRelationshipMatrix(
  readFileSync(join(process.cwd(), 'src', 'model', 'archi', 'relationships.xml'), 'utf8'),
)

function archiAllows(source: string, target: string): string[] {
  const allowed = ARCHI_MATRIX.get(`${source}>${target}`) ?? new Set()
  return RELATIONSHIP_TYPE_NAMES.filter((type) => allowed.has(type))
}

function openGuide(route = '/guide') {
  renderApp(loadDemoWorkspace(), { route })
  return screen.getByRole('heading', { level: 1, name: 'ArchiMate guide' })
}

function entry(type: string): HTMLElement {
  const found = document.getElementById(type)
  if (!found) throw new Error(`no guide entry with id ${type}`)
  return found
}

function relationshipsIn(testId: string): string[] {
  return Array.from(
    screen.getByTestId(testId).querySelectorAll<HTMLElement>('[data-relationship]'),
    (item) => item.dataset.relationship ?? '',
  )
}

describe('element reference', () => {
  it('has an entry with a description and an example for every element type', () => {
    openGuide()
    for (const { type, label, code } of ELEMENT_TYPES) {
      const article = entry(type)
      expect(article.dataset.type).toBe(type)
      expect(within(article).getByRole('heading', { level: 4 })).toHaveTextContent(label)
      expect(article.querySelector('.guide__entry-meta')).toHaveTextContent(code)
      const summary = article.querySelector('.guide__entry-summary')?.textContent?.trim() ?? ''
      const example = article.querySelector('.guide__entry-example')?.textContent?.trim() ?? ''
      // Present before absent: the entry rendered its heading above, so an empty
      // summary is an empty entry, not a page that has not rendered yet.
      expect(summary, `${type} has no description`).not.toBe('')
      expect(example, `${type} has no example`).not.toBe('e.g.')
    }
  })

  it('has no blank description in the content table', () => {
    for (const { type } of ELEMENT_TYPES) {
      expect(ELEMENT_GUIDE[type].summary.trim(), type).not.toBe('')
      expect(ELEMENT_GUIDE[type].example.trim(), type).not.toBe('')
    }
    for (const type of RELATIONSHIP_TYPE_NAMES) {
      expect(RELATIONSHIP_GUIDE[type].summary.trim(), type).not.toBe('')
    }
  })

  it('has an entry for every relationship type', () => {
    openGuide()
    for (const { type, abbr } of RELATIONSHIP_TYPES) {
      const article = entry(`rel-${type}`)
      expect(within(article).getByRole('heading', { level: 4 })).toHaveTextContent(type)
      expect(article.querySelector('.guide__entry-meta')).toHaveTextContent(abbr)
    }
  })

  it('places every element type in the framework grid exactly once', () => {
    openGuide()
    const grid = screen.getByRole('table', { name: 'ArchiMate framework' })
    const linked = within(grid)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
      .filter((href) => !href.includes('#layer-'))
      .map((href) => href.slice(href.indexOf('#') + 1))
    expect(linked.toSorted()).toEqual(ELEMENT_TYPES.map((meta) => meta.type).toSorted())
  })
})

describe('what can connect to what', () => {
  it('offers every element type except Junction', () => {
    expect(LOOKUP_TYPES.map((meta) => meta.type)).toEqual(
      ELEMENT_TYPES.map((meta) => meta.type).filter((type) => type !== 'Junction'),
    )
  })

  it("agrees with Archi's matrix on every pair, in both directions", () => {
    let pairs = 0
    let onlyAssociation = 0
    let several = 0
    for (const source of LOOKUP_TYPES) {
      for (const target of LOOKUP_TYPES) {
        const { forward, reverse } = connectionsBetween(
          source.type as ElementType,
          target.type as ElementType,
        )
        expect(forward, `${source.type} → ${target.type}`).toEqual(
          archiAllows(source.type, target.type),
        )
        expect(reverse, `${target.type} → ${source.type}`).toEqual(
          archiAllows(target.type, source.type),
        )
        pairs += 1
        if (forward.length === 1 && forward[0] === 'Association') onlyAssociation += 1
        if (forward.length > 1) several += 1
      }
    }
    expect(pairs).toBe(LOOKUP_TYPES.length ** 2)
    // Not vacuous: the matrix varies. Some pairs allow only Association, others more.
    expect(onlyAssociation).toBeGreaterThan(0)
    expect(several).toBeGreaterThan(0)
  })

  it('shows the relationships for the chosen pair, and both directions', async () => {
    openGuide()
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'From' }), 'BusinessActor')
    await user.selectOptions(screen.getByRole('combobox', { name: 'To' }), 'ApplicationComponent')

    expect(relationshipsIn('connections-forward')).toEqual(
      archiAllows('BusinessActor', 'ApplicationComponent'),
    )
    expect(relationshipsIn('connections-reverse')).toEqual(
      archiAllows('ApplicationComponent', 'BusinessActor'),
    )
    expect(relationshipsIn('connections-forward')).toContain('Serving')

    await user.click(screen.getByRole('button', { name: 'Swap source and target' }))
    expect(screen.getByRole('combobox', { name: 'From' })).toHaveValue('ApplicationComponent')
    expect(relationshipsIn('connections-forward')).toEqual(
      archiAllows('ApplicationComponent', 'BusinessActor'),
    )
  })

  it('says so when a direction allows nothing', () => {
    // Unreachable from the selects with Archi 5.10's matrix (Association joins
    // every pair), so the list is driven directly.
    render(
      <MemoryRouter>
        <ConnectionList heading="A → B" types={[]} testId="empty" />
      </MemoryRouter>,
    )
    expect(
      within(screen.getByTestId('empty')).getByText('No relationship is allowed this way.'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('empty').querySelectorAll('[data-relationship]')).toHaveLength(0)
  })

  it('ignores a value that is not an element type', () => {
    openGuide()
    const from = screen.getByRole('combobox', { name: 'From' })
    const before = relationshipsIn('connections-forward')
    expect(before.length).toBeGreaterThan(0)
    fireEvent.change(from, { target: { value: 'NotAType' } })
    expect(relationshipsIn('connections-forward')).toEqual(before)
  })
})

describe('viewpoints', () => {
  it('lists, for each viewpoint, exactly the types it allows', () => {
    openGuide()
    for (const viewpoint of VIEWPOINTS) {
      const block = document.querySelector<HTMLElement>(
        `[data-viewpoint="${CSS.escape(viewpoint.name)}"]`,
      )
      expect(block, viewpoint.name).not.toBeNull()
      expect(within(block!).getByRole('heading')).toHaveTextContent(viewpoint.name)
      if (viewpoint.types === 'all') {
        expect(within(block!).getByText('Allows every element type.')).toBeInTheDocument()
        continue
      }
      const expected = new Set<string>([...viewpoint.types, ...ALWAYS_ALLOWED])
      const listed = Array.from(
        block!.querySelectorAll<HTMLElement>('li[data-type]'),
        (item) => item.dataset.type,
      )
      expect(listed.toSorted(), viewpoint.name).toEqual([...expected].toSorted())
    }
  })
})

describe('how we model', () => {
  it('recommends only relationships the editor accepts', () => {
    let steps = 0
    for (const pattern of PATTERNS) {
      for (const step of pattern.steps) {
        const result = validateRelationship(step.source, step.type, step.target)
        expect(result.valid, `${pattern.id}: ${result.reason}`).toBe(true)
        steps += 1
      }
    }
    expect(steps).toBe(PATTERNS.reduce((sum, pattern) => sum + pattern.steps.length, 0))
    expect(steps).toBeGreaterThan(0)
  })

  it('renders every step of every pattern', () => {
    openGuide()
    for (const pattern of PATTERNS) {
      const block = document.getElementById(`pattern-${pattern.id}`)!
      expect(within(block).getByRole('heading', { level: 3 })).toHaveTextContent(pattern.title)
      const rendered = Array.from(
        block.querySelectorAll<HTMLElement>('[data-step]'),
        (item) => item.dataset.step,
      )
      expect(rendered).toEqual(
        pattern.steps.map((step) => JSON.stringify([step.source, step.type, step.target])),
      )
    }
  })
})

describe('version and attribution', () => {
  it('states the ArchiMate version and carries the trademark line', () => {
    openGuide()
    expect(ARCHIMATE_VERSION).toBe('3.2')
    expect(screen.getByText(`ArchiMate ${ARCHIMATE_VERSION}`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ADR 0011' })).toHaveAttribute(
      'href',
      expect.stringContaining('0011-stay-on-archimate-3-2.md'),
    )
    expect(
      screen.getByText(/ArchiMate® is a registered trademark of The Open Group/),
    ).toBeInTheDocument()
  })
})

describe('getting there', () => {
  it('scrolls to and focuses the entry a deep link names', () => {
    openGuide('/guide#DataObject')
    expect(entry('DataObject')).toHaveFocus()
  })

  it('moves to the entry when a link inside the guide is followed', async () => {
    openGuide()
    const user = userEvent.setup()
    const startHere = screen.getByRole('list', { name: 'Element types to start with' })
    await user.click(within(startHere).getByRole('link', { name: /Capability/ }))
    expect(entry('Capability')).toHaveFocus()
  })

  it('opens from the fact sheet type label, at that type', async () => {
    const workspace = loadDemoWorkspace()
    const element = workspace.elements[0]!
    renderApp(workspace, { route: `/element/${element.id}` })
    const user = userEvent.setup()
    await user.click(screen.getByTitle(/Open the ArchiMate guide/))
    expect(screen.getByRole('heading', { level: 1, name: 'ArchiMate guide' })).toBeInTheDocument()
    expect(entry(element.type)).toHaveFocus()
  })

  it('opens from the left nav', async () => {
    renderApp(loadDemoWorkspace())
    const user = userEvent.setup()
    const nav = screen.getByRole('navigation', { name: 'Model' })
    await user.click(within(nav).getByRole('link', { name: 'ArchiMate guide' }))
    expect(screen.getByRole('heading', { level: 1, name: 'ArchiMate guide' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'ArchiMate guide' })).toHaveClass(
      'nav__item--active',
    )
  })

  it('opens from first run without a model, and first run still holds an empty browser', async () => {
    renderApp(emptyWorkspace('ws-empty', 'Empty'), { route: '/inventory' })
    expect(screen.getByRole('button', { name: /Start empty/ })).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'Read the guide' }))
    expect(screen.getByRole('heading', { level: 1, name: 'ArchiMate guide' })).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: 'Model' })
    await user.click(within(nav).getByRole('link', { name: /Inventory/ }))
    expect(screen.getByRole('button', { name: /Start empty/ })).toBeInTheDocument()
  })

  it("links the view palette to the armed type's entry, or to the reference", async () => {
    const { user } = setup()
    const palette = screen.getByRole('region', { name: 'Palette' })
    const link = within(palette).getByRole('link', { name: 'What these types mean' })
    expect(link).toHaveAttribute('href', '/guide#elements')

    await user.click(within(palette).getByRole('button', { name: 'Application Component' }))
    expect(
      within(palette).getByRole('link', { name: 'About Application Component' }),
    ).toHaveAttribute('href', '/guide#ApplicationComponent')
  })
})
