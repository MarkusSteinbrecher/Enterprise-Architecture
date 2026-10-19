import { describe, expect, it } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { toCanonicalJson } from '@/io'
import {
  ELEMENT_TYPE_NAMES,
  LAYERS,
  RELATIONSHIP_TYPE_NAMES,
  absoluteBounds,
  allowedTargets,
  elementTypeMeta,
  typeLabel,
  validateRelationshipBetween,
  viewpointAllows,
  type Element,
  type ElementType,
  type Point,
  type RelationshipContext,
  type RelationshipType,
  type View,
} from '@/model'
import { pressOutside } from '@/test/dialogs'
import { LANDSCAPE, click, setup } from '@/test/view-editor'
import { MAGIC_TARGET_GROUPS, RELATIONSHIP_PHRASES, magicEdit, magicMenu } from './magic'

/**
 * The magic connector (#132): a connect gesture released on empty canvas.
 * jsdom lays nothing out, so a client point is a view point.
 */

/** Below every shape of the claims landscape. */
const EMPTY: Point = { x: 1220, y: 1100 }

const centre = (view: View, id: string): Point => {
  const b = absoluteBounds(view, id)!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

type Harness = ReturnType<typeof setup>

/** Select `from`, then drag from its connect handle and release on empty canvas at `at`. */
async function magic(h: Harness, from: string, at: Point = EMPTY) {
  const a = centre(h.view(), from)
  await click(h.user, h.nodeEl(from), a)
  const handle = screen.getByTestId('connect-handle')
  await h.user.pointer([
    { keys: '[MouseLeft>]', target: handle, coords: { clientX: a.x, clientY: a.y } },
    { target: h.surface, coords: { clientX: at.x, clientY: at.y } },
    { keys: '[/MouseLeft]', target: h.surface, coords: { clientX: at.x, clientY: at.y } },
  ])
}

const menu = () => screen.getByRole('dialog', { name: /^New element from / })

/** The relationship column, as its phrases. */
const phrases = () =>
  within(within(menu()).getByRole('region', { name: 'Relationship' }))
    .getAllByRole('button')
    .map((b) => b.querySelector('.magic-menu__phrase')!.textContent)

/** The element column for the relationship in line, as `layer: type` labels. */
const targets = () =>
  within(menu())
    .getAllByRole('group')
    .flatMap((group) =>
      within(group)
        .getAllByRole('button')
        .map((b) => `${group.getAttribute('aria-label')}: ${b.textContent}`),
    )

async function pick(h: Harness, type: RelationshipType, target: ElementType) {
  await h.user.click(
    within(within(menu()).getByRole('region', { name: 'Relationship' })).getByRole('button', {
      name: new RegExp(RELATIONSHIP_PHRASES[type]),
    }),
  )
  await h.user.click(
    within(within(menu()).getByRole('region', { name: /: new element$/ })).getByRole('button', {
      name: typeLabel(target),
    }),
  )
}

/** Every (relationship, target type) pair a menu offers, as `Rel>Type`. */
const pairsOf = (entries: ReturnType<typeof magicMenu>) =>
  entries.flatMap((entry) =>
    entry.groups.flatMap((group) => group.types.map((type) => `${entry.type}>${type}`)),
  )

/** A model with nothing in it: no junction rules apply. */
const EMPTY_MODEL: RelationshipContext = {
  element: () => undefined,
  relationshipsOf: () => [],
}

const element = (type: ElementType, id = `x-${type}`): Element => ({
  id,
  type,
  name: '',
  properties: {},
})

describe('the magic connector menu (#132)', () => {
  it('groups target types as Archi does: every element type once, in its layer', () => {
    const listed = MAGIC_TARGET_GROUPS.flatMap((group) => group.types)
    expect(new Set(listed).size).toBe(listed.length)
    expect([...listed].sort()).toEqual([...ELEMENT_TYPE_NAMES].sort())
    for (const group of MAGIC_TARGET_GROUPS) {
      for (const type of group.types) expect(elementTypeMeta(type).layer, type).toBe(group.layer)
    }
    expect(MAGIC_TARGET_GROUPS.map((g) => g.layer)).toEqual([...LAYERS])
    // Archi's order, not the catalogue's, where Course of Action comes first.
    expect(MAGIC_TARGET_GROUPS[0]!.types).toEqual([
      'Resource',
      'Capability',
      'ValueStream',
      'CourseOfAction',
    ])
  })

  // A sample across the layers, with the composites and the junction.
  const SOURCES: ElementType[] = [
    'BusinessActor',
    'BusinessProcess',
    'ApplicationComponent',
    'DataObject',
    'Node',
    'Equipment',
    'Goal',
    'WorkPackage',
    'Location',
    'Grouping',
    'Junction',
  ]

  it('offers exactly the valid (relationship, target type) pairs, for a sample of source types', () => {
    for (const sourceType of SOURCES) {
      const source = element(sourceType)
      const offered = pairsOf(magicMenu(EMPTY_MODEL, source, undefined))
      // Every pair the rules allow, found by asking them about every pair.
      const valid = RELATIONSHIP_TYPE_NAMES.flatMap((rel) =>
        ELEMENT_TYPE_NAMES.filter(
          (target) =>
            validateRelationshipBetween(EMPTY_MODEL, source, rel, element(target, 'new')).valid,
        ).map((target) => `${rel}>${target}`),
      )
      expect(new Set(offered), sourceType).toEqual(new Set(valid))
      expect(offered.length, sourceType).toBe(new Set(offered).size)
      // And, by the matrix alone, where no junction rule can apply.
      const matrix = RELATIONSHIP_TYPE_NAMES.flatMap((rel) =>
        allowedTargets(sourceType, rel).map((target) => `${rel}>${target}`),
      )
      expect(new Set(offered), `${sourceType}, by the matrix`).toEqual(new Set(matrix))
    }
    // Not a menu offering everything: a business object composes no actor.
    expect(pairsOf(magicMenu(EMPTY_MODEL, element('DataObject'), undefined))).not.toContain(
      'Assignment>BusinessActor',
    )
  })

  it('lists relationship types in catalogue order, with Archi’s phrases', () => {
    const entries = magicMenu(EMPTY_MODEL, element('ApplicationComponent'), undefined)
    expect(entries.map((e) => e.type)).toEqual([...RELATIONSHIP_TYPE_NAMES])
    expect(entries.map((e) => e.phrase)).toEqual(
      RELATIONSHIP_TYPE_NAMES.map((type) => RELATIONSHIP_PHRASES[type]),
    )
    expect(entries.find((e) => e.type === 'Serving')?.phrase).toBe('Serves')
    // Every type reaches a junction, so only a junction's rules empty an entry
    // (below). A data object is assigned to nothing else: one group, one type.
    const assignment = magicMenu(EMPTY_MODEL, element('DataObject'), undefined).find(
      (e) => e.type === 'Assignment',
    )
    expect(assignment?.groups).toEqual([{ layer: 'other', label: 'Other', types: ['Junction'] }])
  })

  it('keeps to the type a junction already joins', () => {
    const h = setup()
    // `j-split` joins Triggerings in the claims landscape.
    const split = h.store.element('j-split')!
    const entries = magicMenu(h.store, split, undefined)
    // Every other type's entry is dropped, as Archi drops an empty submenu.
    expect(entries.map((e) => e.type)).toEqual(['Triggering'])
    // And through it only what Accept may trigger: no business object.
    expect(pairsOf(entries)).not.toContain('Triggering>BusinessObject')
    expect(pairsOf(entries)).toContain('Triggering>BusinessProcess')
    // With nothing on it, a junction offers more than one type.
    expect(magicMenu(EMPTY_MODEL, element('Junction'), undefined).length).toBeGreaterThan(1)
  })

  it('offers no target type outside the view’s viewpoint, and keeps the junction and grouping', () => {
    const viewpoint = 'Application Cooperation'
    const source = element('ApplicationComponent')
    const all = pairsOf(magicMenu(EMPTY_MODEL, source, undefined))
    const filtered = pairsOf(magicMenu(EMPTY_MODEL, source, viewpoint))
    for (const pair of filtered) {
      const type = pair.split('>')[1] as ElementType
      expect(viewpointAllows(viewpoint, type), pair).toBe(true)
    }
    // Exactly the unfiltered pairs the viewpoint allows: it removes, and only that.
    expect(filtered).toEqual(
      all.filter((pair) => viewpointAllows(viewpoint, pair.split('>')[1] as ElementType)),
    )
    expect(all).toContain('Serving>BusinessActor')
    expect(filtered).not.toContain('Serving>BusinessActor')
    expect(filtered).toContain('Association>Junction')
    expect(filtered).toContain('Composition>Grouping')
  })

  it('makes nothing from a shape that draws no element', () => {
    const h = setup()
    let n = 0
    const id = () => `id-${n++}`
    const edit = magicEdit(
      h.view(),
      'o-note-biz',
      'Association',
      'BusinessActor',
      EMPTY,
      () => false,
      id,
    )
    expect(edit).toBeUndefined()
    expect(n).toBe(0)
  })
})

describe('the magic connector on the canvas (#132)', () => {
  it('opens on a release on empty canvas, and lists Archi’s phrases', async () => {
    const h = setup()
    await magic(h, 'o-customer-hub')
    expect(phrases()).toContain('Serves')
    expect(phrases()[0]).toBe('Composed of')
    expect(h.dispatch).not.toHaveBeenCalled()
  })

  it('creates element, relationship, node and connection in one command, and one undo removes all four', async () => {
    const h = setup()
    const before = toCanonicalJson(h.store.snapshot())
    const elements = h.store.elementCount
    const relationships = h.store.relationshipCount
    const nodes = h.view().nodes.length
    const connections = h.view().connections.length
    await magic(h, 'o-customer-hub')
    await pick(h, 'Serving', 'BusinessProcess')

    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.store.elementCount).toBe(elements + 1)
    expect(h.store.relationshipCount).toBe(relationships + 1)
    expect(h.view().nodes).toHaveLength(nodes + 1)
    expect(h.view().connections).toHaveLength(connections + 1)
    const node = h.view().nodes.at(-1)!
    if (node.kind !== 'element') throw new Error('the new node draws no element')
    const made = h.store.element(node.element)!
    expect(made).toMatchObject({ type: 'BusinessProcess', name: 'Business Process' })
    // Placed where the gesture ended, top-left at the pointer, at the top level.
    expect(node.bounds).toMatchObject({ x: EMPTY.x, y: EMPTY.y })
    expect(node).not.toHaveProperty('parent')
    const line = h.view().connections.at(-1)!
    expect(line).toMatchObject({ kind: 'relationship', source: 'o-customer-hub', target: node.id })
    if (line.kind !== 'relationship') throw new Error('the new line draws no relationship')
    expect(h.store.relationship(line.relationship)).toMatchObject({
      type: 'Serving',
      source: 'ac-customer',
      target: made.id,
    })
    // Its name opens for typing, as Archi opens a new shape's.
    expect(screen.getByRole('textbox', { name: 'Element name' })).toHaveFocus()

    act(() => void h.store.undo())
    expect(toCanonicalJson(h.store.snapshot())).toBe(before)
  })

  it('is driven by the keyboard alone, and focus reaches the canvas after the name', async () => {
    const h = setup()
    const canvas = screen.getByRole('generic', { name: /^View / })
    canvas.focus()
    await magic(h, 'o-customer-hub')
    const types = within(menu()).getByRole('region', { name: 'Relationship' })
    const first = within(types).getAllByRole('button')[0]!
    expect(first).toHaveFocus()
    expect(first).toHaveAttribute('aria-expanded', 'true')

    // Down to the second type: its element types come up beside it.
    await h.user.keyboard('{ArrowDown}')
    const second = within(types).getAllByRole('button')[1]!
    expect(second).toHaveFocus()
    expect(second).toHaveAttribute('aria-expanded', 'true')
    expect(first).toHaveAttribute('aria-expanded', 'false')
    const entries = magicMenu(h.store, h.store.element('ac-customer')!, undefined)
    expect(targets()[0]).toBe(
      `${entries[1]!.groups[0]!.label}: ${typeLabel(entries[1]!.groups[0]!.types[0]!)}`,
    )
    // Up wraps from the first to the last.
    await h.user.keyboard('{ArrowUp}{ArrowUp}')
    expect(within(types).getAllByRole('button').at(-1)).toHaveFocus()
    await h.user.keyboard('{ArrowDown}{ArrowDown}')
    expect(second).toHaveFocus()

    // Right into the element types, down one, left back, and in again with Enter.
    await h.user.keyboard('{ArrowRight}')
    const panel = within(menu()).getByRole('region', { name: /: new element$/ })
    const options = within(panel).getAllByRole('button')
    expect(options[0]).toHaveFocus()
    await h.user.keyboard('{ArrowDown}')
    expect(options[1]).toHaveFocus()
    await h.user.keyboard('{ArrowLeft}')
    expect(second).toHaveFocus()
    await h.user.keyboard('{Enter}{ArrowDown}')
    expect(options[1]).toHaveFocus()
    await h.user.keyboard('{Enter}')

    expect(h.dispatch).toHaveBeenCalledTimes(1)
    const made = h.view().nodes.at(-1)!
    if (made.kind !== 'element') throw new Error('the new node draws no element')
    expect(h.store.element(made.element)!.type).toBe(entries[1]!.groups[0]!.types[1])
    const name = screen.getByRole('textbox', { name: 'Element name' })
    expect(name).toHaveFocus()
    await h.user.keyboard('{Enter}')
    expect(document.activeElement).toBe(canvas)
  })

  it('wraps within the element types, however long the list in line before it was', async () => {
    const h = setup()
    await magic(h, 'o-customer-hub')
    const types = within(within(menu()).getByRole('region', { name: 'Relationship' })).getAllByRole(
      'button',
    )
    const entries = magicMenu(h.store, h.store.element('ac-customer')!, undefined)
    const count = (i: number) => entries[i]!.groups.reduce((n, g) => n + g.types.length, 0)
    // Association reaches every type; Assignment, after it in line here, far fewer.
    const long = entries.findIndex((e) => e.type === 'Association')
    const short = entries.findIndex((e) => e.type === 'Assignment')
    expect(count(short)).toBeLessThan(count(long))
    expect(count(short)).toBeGreaterThan(1)
    // Hovering a type brings its element types up, as Archi's submenus open.
    await h.user.hover(types[long]!)
    expect(types[long]).toHaveAttribute('aria-expanded', 'true')
    expect(targets()).toHaveLength(count(long))
    await h.user.click(types[short]!)
    const options = within(
      within(menu()).getByRole('region', { name: /: new element$/ }),
    ).getAllByRole('button')
    expect(options).toHaveLength(count(short))
    expect(options[0]).toHaveFocus()
    await h.user.keyboard('{ArrowUp}')
    expect(options.at(-1)).toHaveFocus()
    await h.user.keyboard('{ArrowDown}')
    expect(options[0]).toHaveFocus()
  })

  it('cancels with Escape, makes nothing, and gives the canvas its focus back', async () => {
    const h = setup()
    const canvas = screen.getByRole('generic', { name: /^View / })
    canvas.focus()
    await magic(h, 'o-customer-hub')
    expect(menu()).toContainElement(document.activeElement as HTMLElement)
    await h.user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(canvas)
    expect(h.dispatch).not.toHaveBeenCalled()
  })

  it('cancels on a press outside, and gives the canvas its focus back (#157)', async () => {
    const h = setup()
    const canvas = screen.getByRole('generic', { name: /^View / })
    canvas.focus()
    await magic(h, 'o-customer-hub')
    await pressOutside(h.user, menu())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(canvas)
    expect(h.dispatch).not.toHaveBeenCalled()
  })

  it('creates a junction with no name to type, and hands focus to the canvas', async () => {
    const h = setup()
    const canvas = screen.getByRole('generic', { name: /^View / })
    await magic(h, 'o-customer-hub')
    await pick(h, 'Serving', 'Junction')
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    const node = h.view().nodes.at(-1)!
    if (node.kind !== 'element') throw new Error('the new node draws no element')
    expect(h.store.element(node.element)).toMatchObject({ type: 'Junction', name: '' })
    expect(screen.queryByRole('textbox', { name: 'Element name' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(canvas)
    // Selected, as a new shape is: the connect handle sits on it alone.
    expect(screen.getByTestId('connect-handle')).toHaveAttribute('data-connect', node.id)
  })

  it('offers only the viewpoint’s target types in a view with one', async () => {
    const h = setup('writer', {
      prepare: (s) =>
        s.updateView(LANDSCAPE, (v) => ({ ...v, viewpoint: 'Application Cooperation' })),
    })
    await magic(h, 'o-customer-hub')
    const serves = within(within(menu()).getByRole('region', { name: 'Relationship' })).getByRole(
      'button',
      { name: /Serves/ },
    )
    await h.user.click(serves)
    const offered = targets()
    expect(offered).toContain('Application: Application Component')
    expect(offered.some((t) => t.startsWith('Business:'))).toBe(false)
    expect(offered).not.toContain('Business: Business Actor')
  })

  it('opens no menu from a note, whose line needs a shape to end on', async () => {
    const h = setup()
    await magic(h, 'o-note-biz')
    // The gesture ended: the handle is back on the note.
    expect(screen.getByTestId('connect-handle')).toHaveAttribute('data-connect', 'o-note-biz')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(h.dispatch).not.toHaveBeenCalled()
  })

  it('opens no menu from a shape whose element is not in the model', async () => {
    const h = setup('writer', {
      prepare: (s) =>
        s.updateView(LANDSCAPE, (v) => ({
          ...v,
          nodes: v.nodes.map((n) =>
            n.id === 'o-customer-hub' && n.kind === 'element' ? { ...n, element: 'gone' } : n,
          ),
        })),
    })
    await magic(h, 'o-customer-hub')
    expect(screen.getByTestId('connect-handle')).toHaveAttribute('data-connect', 'o-customer-hub')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(h.dispatch).not.toHaveBeenCalled()
  })
})
