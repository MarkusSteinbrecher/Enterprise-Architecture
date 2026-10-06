import { describe, expect, it } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { toCanonicalJson } from '@/io'
import {
  RELATIONSHIP_TYPE_NAMES,
  absoluteBounds,
  allowedRelationships,
  allowedRelationshipsBetween,
  type Point,
  type RelationshipType,
  type View,
} from '@/model'
import type { ModelStore } from '@/store'
import { click, setup, type User } from '@/test/view-editor'

/**
 * Connecting shapes on the canvas (#129), driven as a user drives it: select a
 * shape, drag from its connect handle to another, and choose from the menu.
 * jsdom lays nothing out, so a client point is a view point.
 */

const centre = (view: View, id: string): Point => {
  const b = absoluteBounds(view, id)!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

type Harness = ReturnType<typeof setup>

/** Select `from`, then drag from its connect handle and release over `to`. */
async function connect(h: Harness, from: string, to: string, at?: Point) {
  const a = centre(h.view(), from)
  await click(h.user, h.nodeEl(from), a)
  const handle = screen.getByTestId('connect-handle')
  const b = at ?? centre(h.view(), to)
  await h.user.pointer([
    { keys: '[MouseLeft>]', target: handle, coords: { clientX: a.x, clientY: a.y } },
    { target: h.nodeEl(to), coords: { clientX: b.x, clientY: b.y } },
    { keys: '[/MouseLeft]', target: h.nodeEl(to), coords: { clientX: b.x, clientY: b.y } },
  ])
}

const menu = () => screen.getByRole('dialog', { name: /^Connect/ })

/** The new relationship types the open menu offers, in its order. */
function offered(): string[] {
  const group = within(menu()).queryByRole('region', { name: 'New relationship' })
  if (!group) return []
  return within(group)
    .getAllByRole('button')
    .map((button) => button.querySelector('.connect-menu__type')!.textContent!)
}

/** The elements two nodes draw, as the store has them. */
function ends(store: ModelStore, view: View, from: string, to: string) {
  const element = (id: string) => {
    const node = view.nodes.find((n) => n.id === id)!
    if (node.kind !== 'element') throw new Error(`${id} draws no element`)
    return store.element(node.element)!
  }
  return [element(from), element(to)] as const
}

async function choose(user: User, type: RelationshipType) {
  const group = within(menu()).getByRole('region', { name: 'New relationship' })
  const button = within(group)
    .getAllByRole('button')
    .find((b) => b.querySelector('.connect-menu__type')?.textContent === type)
  if (!button) throw new Error(`${type} is not offered`)
  await user.click(button)
}

describe('connecting shapes (#129)', () => {
  // Pairs from the claims landscape, the junction among them. `o-split` is a
  // junction joining Triggerings: Accept → it → Valuate and Pay.
  const PAIRS: [string, string][] = [
    ['o-customer-hub', 'o-as-payment'], // Application Component → Application Service
    ['o-handle', 'o-claim-bo'], // Business Process → Business Object
    ['o-req', 'o-goal'], // Requirement → Goal
    ['o-scanner', 'o-backbone'], // Equipment → Communication Network
    ['o-zurich', 'o-insurant'], // Location → Business Role
    ['o-split', 'o-register'], // the junction → Business Process
    ['o-damage', 'o-split'], // Business Event → the junction
  ]

  it('offers exactly what validity.ts allows, for a sample of pairs including a junction', async () => {
    const h = setup()
    const seen: Record<string, string[]> = {}
    for (const [from, to] of PAIRS) {
      await connect(h, from, to)
      const [source, target] = ends(h.store, h.view(), from, to)
      const expected = allowedRelationshipsBetween(h.store, source, target)
      expect(offered(), `${from} → ${to}`).toEqual(expected)
      seen[`${from}>${to}`] = expected
      await h.user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }
    // The sample is not one a menu offering everything would pass, and the
    // junction's own rules decided its two pairs, not the type matrix alone.
    expect(Object.values(seen).some((types) => types.length < RELATIONSHIP_TYPE_NAMES.length)).toBe(
      true,
    )
    expect(seen['o-split>o-register']).toEqual(['Triggering'])
    expect(seen['o-damage>o-split']).toEqual(['Triggering'])
    expect(allowedRelationships('Junction', 'BusinessProcess').length).toBeGreaterThan(1)
    expect(h.dispatch).not.toHaveBeenCalled()
  })

  it('says so, and creates nothing, when no type is allowed', async () => {
    // Through the junction, Accept would trigger a business object.
    const h = setup()
    await connect(h, 'o-split', 'o-claim-bo')
    expect(within(menu()).getByRole('alert')).toHaveTextContent(
      /ArchiMate allows no relationship from Junction .* to Business Object “Claim”\. Nothing was created\./,
    )
    expect(offered()).toEqual([])
    await h.user.click(within(menu()).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(h.dispatch).not.toHaveBeenCalled()
  })

  it('creates the relationship and its connection as one command, and one undo leaves the workspace byte-identical', async () => {
    const h = setup()
    const before = toCanonicalJson(h.store.snapshot())
    const relationships = h.store.relationshipCount
    await connect(h, 'o-customer-hub', 'o-as-payment')
    await choose(h.user, 'Serving')

    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.store.relationshipCount).toBe(relationships + 1)
    const drawn = h.view().connections.at(-1)!
    expect(drawn).toMatchObject({
      kind: 'relationship',
      source: 'o-customer-hub',
      target: 'o-as-payment',
    })
    const made = h.store.relationship(drawn.kind === 'relationship' ? drawn.relationship : '')!
    expect(made).toMatchObject({ type: 'Serving', source: 'ac-customer', target: 'as-payment' })
    expect(h.store.nextUndo?.label).toBe('Added Serving relation to “Claims landscape”')
    // The new line is selected, and drawn.
    expect(screen.getByTestId('selection')).toHaveAttribute('data-selected', drawn.id)
    expect(h.canvas.querySelector(`[data-connection="${drawn.id}"]`)).toBeInTheDocument()

    act(() => void h.store.undo())
    expect(toCanonicalJson(h.store.snapshot())).toBe(before)
    expect(h.canvas.querySelector(`[data-connection="${drawn.id}"]`)).not.toBeInTheDocument()
    act(() => void h.store.redo())
    expect(h.store.relationship(made.id)).toEqual(made)
    expect(h.view().connections.at(-1)).toEqual(drawn)
  })

  it('draws a relationship the model holds and this view does not, adding no relationship', async () => {
    // r-claim-bo: Claim data object realizes the Claim business object, drawn in no view here.
    const h = setup()
    const relationships = h.store.relationshipCount
    await connect(h, 'o-do-claim', 'o-claim-bo')
    const existing = within(menu()).getByRole('region', { name: 'Already in the model' })
    const items = within(existing).getAllByRole('button')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Realization')
    await h.user.click(items[0]!)

    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.store.relationshipCount).toBe(relationships)
    expect(h.view().connections.at(-1)).toMatchObject({
      kind: 'relationship',
      relationship: 'r-claim-bo',
      source: 'o-do-claim',
      target: 'o-claim-bo',
    })
  })

  it('offers no relationship the view already draws, nor one running the other way', async () => {
    const h = setup()
    // r-cust-ins is drawn here as c-cust-ins; r-claim-bo runs from the data object.
    await connect(h, 'o-customer', 'o-insurant')
    expect(within(menu()).getByRole('region', { name: 'New relationship' })).toBeInTheDocument()
    expect(within(menu()).queryByRole('region', { name: 'Already in the model' })).toBeNull()
    await h.user.keyboard('{Escape}')
    await connect(h, 'o-claim-bo', 'o-do-claim')
    expect(within(menu()).getByRole('region', { name: 'New relationship' })).toBeInTheDocument()
    expect(within(menu()).queryByRole('region', { name: 'Already in the model' })).toBeNull()
  })

  it('draws a plain line from a note, with no menu', async () => {
    const h = setup()
    await connect(h, 'o-note-biz', 'o-claim-bo')
    expect(h.view().connections.at(-1)).toMatchObject({
      kind: 'line',
      source: 'o-note-biz',
      target: 'o-claim-bo',
    })
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('draws nothing for a release on the empty canvas or on the shape it started from', async () => {
    const h = setup()
    // (1220, 1100) is below every shape.
    await connect(h, 'o-goal', 'o-goal', { x: 1220, y: 1100 })
    // The gesture has ended: the handle is back on the shape still selected.
    expect(screen.getByTestId('connect-handle')).toHaveAttribute('data-connect', 'o-goal')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // A drag that ends inside the shape it began on, well past the click slop.
    const goal = centre(h.view(), 'o-goal')
    await connect(h, 'o-goal', 'o-goal', { x: goal.x + 40, y: goal.y + 10 })
    expect(screen.getByTestId('connect-handle')).toHaveAttribute('data-connect', 'o-goal')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(h.dispatch).not.toHaveBeenCalled()
  })

  it('shows the line it would draw, and the shape it would end on, while dragging', async () => {
    const h = setup()
    const a = centre(h.view(), 'o-req')
    const b = centre(h.view(), 'o-goal')
    await click(h.user, h.nodeEl('o-req'), a)
    await h.user.pointer([
      {
        keys: '[MouseLeft>]',
        target: screen.getByTestId('connect-handle'),
        coords: { clientX: a.x, clientY: a.y },
      },
      { target: h.nodeEl('o-goal'), coords: { clientX: b.x, clientY: b.y } },
    ])
    expect(screen.getByTestId('rubber-band')).toHaveAttribute('x2', String(b.x))
    const outline = screen.getByTestId('connect-target')
    expect(outline).toHaveAttribute('x', String(absoluteBounds(h.view(), 'o-goal')!.x))
    // Escape drops it, as it drops any drag.
    await h.user.keyboard('{Escape}')
    expect(screen.queryByTestId('rubber-band')).not.toBeInTheDocument()
  })

  it('cancels from the menu with Escape, and gives the canvas its focus back', async () => {
    const h = setup()
    const canvas = screen.getByRole('generic', { name: /^View / })
    canvas.focus()
    await connect(h, 'o-req', 'o-goal')
    expect(menu()).toContainElement(document.activeElement as HTMLElement)
    await h.user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(canvas)
    expect(h.dispatch).not.toHaveBeenCalled()
  })

  it('cannot connect in a reader tab', async () => {
    const h = setup('reader')
    await click(h.user, h.nodeEl('o-req'), centre(h.view(), 'o-req'))
    // Selected, so the panel shows; but there is no handle to connect from.
    expect(screen.getByRole('complementary')).toBeInTheDocument()
    expect(screen.queryByTestId('connect-handle')).not.toBeInTheDocument()
    expect(h.dispatch).not.toHaveBeenCalled()
  })
})

describe('removing a connection (#129)', () => {
  const lineHit = (h: Harness, id: string) => h.canvas.querySelector(`[data-line-hit="${id}"]`)!

  it('selects a line by a press on it', async () => {
    const h = setup()
    await click(h.user, lineHit(h, 'c-cust-ins'), { x: 215, y: 87 })
    expect(screen.getByTestId('selection')).toHaveAttribute('data-selected', 'c-cust-ins')
    expect(
      screen.getByRole('complementary', { name: /Selected: .* relationship/ }),
    ).toHaveTextContent('Customer → Insurant')
  })

  it('removes it from the view only, from the panel or by Delete', async () => {
    const h = setup()
    const relationships = h.store.relationshipCount
    await click(h.user, lineHit(h, 'c-cust-ins'), { x: 215, y: 87 })
    await h.user.click(screen.getByRole('button', { name: 'Remove from view' }))
    expect(h.view().connections.some((c) => c.id === 'c-cust-ins')).toBe(false)
    expect(h.store.relationship('r-cust-ins')).toBeDefined()

    await click(h.user, lineHit(h, 'c-reg-ins'), { x: 425, y: 87 })
    await h.user.keyboard('{Delete}')
    expect(h.view().connections.some((c) => c.id === 'c-reg-ins')).toBe(false)
    expect(h.store.relationship('r-ins-reg')).toBeDefined()
    expect(h.store.relationshipCount).toBe(relationships)
    expect(h.dispatch).toHaveBeenCalledTimes(2)
  })

  it('deletes it from the model after naming the other views that draw it', async () => {
    // r-engine-claim is drawn here and in "Claim data".
    const h = setup()
    const before = toCanonicalJson(h.store.snapshot())
    await click(h.user, lineHit(h, 'c-engine-claim'), { x: 640, y: 600 })
    await h.user.click(screen.getByRole('button', { name: 'Delete from model…' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete relationship from the model' })
    expect(within(dialog).getByRole('list')).toHaveTextContent('Claim data')
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1)
    await h.user.click(within(dialog).getByRole('button', { name: 'Delete from model' }))

    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.store.relationship('r-engine-claim')).toBeUndefined()
    expect(h.store.viewsDrawingRelationship('r-engine-claim')).toEqual([])
    act(() => void h.store.undo())
    expect(toCanonicalJson(h.store.snapshot())).toBe(before)
  })

  it('says when no other view draws it, and Cancel deletes nothing', async () => {
    const h = setup()
    await click(h.user, lineHit(h, 'c-cust-ins'), { x: 215, y: 87 })
    await h.user.click(screen.getByRole('button', { name: 'Delete from model…' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete relationship from the model' })
    expect(dialog).toHaveTextContent('No other view draws it.')
    await h.user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(h.store.relationship('r-cust-ins')).toBeDefined()
    expect(h.dispatch).not.toHaveBeenCalled()
  })

  it('offers a reader tab neither removal', async () => {
    const h = setup('reader')
    await click(h.user, lineHit(h, 'c-cust-ins'), { x: 215, y: 87 })
    expect(screen.getByTestId('selection')).toHaveAttribute('data-selected', 'c-cust-ins')
    expect(screen.queryByRole('button', { name: 'Remove from view' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete from model…' })).not.toBeInTheDocument()
    await h.user.keyboard('{Delete}')
    expect(h.dispatch).not.toHaveBeenCalled()
  })
})
