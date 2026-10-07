import { describe, expect, it } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { toCanonicalJson } from '@/io/canonical-json'
import { absoluteBounds, validateRelationshipBetween, type ElementNode } from '@/model'
import type { ModelStore } from '@/store'
import { LANDSCAPE, click, drag, drawnAt, drop, setup } from '@/test/view-editor'
import { ELEMENT_DRAG_TYPE } from './create'
import { NESTING_TYPES } from './nesting'

/**
 * The question a nesting asks (#131), on the claims landscape, driven as a user
 * drives it. Claims Engine (`o-engine`, 220,480 400×160) is an element's shape
 * with room above its two functions: (300, 500) is inside it and inside no
 * child. Customer Data Hub (`o-customer-hub`, 660,500) has no relationship with
 * the engine; Claim Record (`o-do-claim`) is accessed by it.
 *
 * jsdom lays nothing out: the viewport stays at the origin and 100%, so a client
 * point is a view point.
 */

const INSIDE_ENGINE = { x: 300, y: 500 }
const HUB_PRESS = { x: 700, y: 520 }
const model = (store: ModelStore) => toCanonicalJson(store.snapshot())

const prompt = () => screen.getByRole('dialog', { name: 'Nested in Claims Engine' })
/** A press on the overlay around the prompt, outside the prompt itself. */
const pressOutside = (user: ReturnType<typeof setup>['user']) =>
  user.pointer({ keys: '[MouseLeft]', target: prompt().parentElement! })
const options = () =>
  within(within(prompt()).getByRole('region', { name: 'New relationship' })).getAllByRole('button')

/** The element each of two shapes draws. */
function elementsOf(store: ModelStore, parent: string, child: string) {
  const v = store.view(LANDSCAPE)!
  const of = (id: string) =>
    store.element((v.nodes.find((n) => n.id === id) as ElementNode).element)!
  return { parent: of(parent), child: of(child) }
}

describe('moving a shape into an element’s shape (#131)', () => {
  it('asks which relationship it means, offering exactly the valid types, before committing anything', async () => {
    const { store, dispatch, user, nodeEl } = setup()
    const { parent, child } = elementsOf(store, 'o-engine', 'o-customer-hub')
    expect(
      store.relationshipsOf(child.id).some((r) => r.source === parent.id || r.target === parent.id),
    ).toBe(false)

    await drag(user, nodeEl('o-customer-hub'), HUB_PRESS, INSIDE_ENGINE)

    const valid = NESTING_TYPES.filter((type) => {
      const [source, target] = type === 'Specialization' ? [child, parent] : [parent, child]
      return validateRelationshipBetween(store, source, type, target).valid
    })
    expect(valid.length).toBeGreaterThan(1)
    expect(options().map((button) => button.textContent)).toEqual(
      valid.map((type) =>
        type === 'Specialization'
          ? expect.stringContaining(`${type}Customer Data Hub → Claims Engine`)
          : expect.stringContaining(`${type}Claims Engine → Customer Data Hub`),
      ),
    )
    // The first is first in line, as Archi preselects it.
    expect(options()[0]).toHaveFocus()
    // The shape is drawn where it was dropped while the question is open, and
    // nothing is committed until it is answered.
    expect(drawnAt(nodeEl('o-customer-hub'))).toEqual({ x: 260, y: 480 })
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('makes the chosen relationship and its connection with the move, as one command one undo takes away', async () => {
    const { store, dispatch, user, nodeEl, surface, view } = setup()
    const before = model(store)
    const { parent, child } = elementsOf(store, 'o-engine', 'o-customer-hub')
    const connections = view().connections.length

    await drag(user, nodeEl('o-customer-hub'), HUB_PRESS, INSIDE_ENGINE)
    await user.click(options()[0]!)

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(view().nodes.find((n) => n.id === 'o-customer-hub')!.parent).toBe('o-engine')
    const made = store
      .relationshipsOf(child.id)
      .filter((r) => r.source === parent.id && r.target === child.id)
    expect(made).toHaveLength(1)
    expect(made[0]!.type).toBe('Composition')
    // Drawn between the two shapes, and hidden there by the nesting (#96).
    const drawing = view().connections.find(
      (c) => c.kind === 'relationship' && c.relationship === made[0]!.id,
    )!
    expect(drawing).toMatchObject({ source: 'o-engine', target: 'o-customer-hub' })
    expect(view().connections).toHaveLength(connections + 1)
    expect(surface.querySelector(`[data-connection="${drawing.id}"]`)).toBeNull()
    // The answer ends the question, and the canvas has the keyboard again.
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(surface).toHaveFocus()

    act(() => void store.undo())
    expect(model(store)).toBe(before)
  })

  it.each(['None', 'Escape', 'a press outside'] as const)(
    'nests and makes nothing on %s',
    async (answer) => {
      const { store, dispatch, user, nodeEl, surface, view } = setup()
      const relationships = store.relationshipCount
      const connections = view().connections.length
      await drag(user, nodeEl('o-customer-hub'), HUB_PRESS, INSIDE_ENGINE)
      // Present before absent: the question is open.
      expect(prompt()).toBeInTheDocument()
      if (answer === 'None') {
        await user.click(within(prompt()).getByRole('button', { name: 'None' }))
      } else if (answer === 'Escape') await user.keyboard('{Escape}')
      else await pressOutside(user)

      expect(dispatch).toHaveBeenCalledTimes(1)
      expect(view().nodes.find((n) => n.id === 'o-customer-hub')!.parent).toBe('o-engine')
      expect(store.relationshipCount).toBe(relationships)
      expect(view().connections).toHaveLength(connections)
      expect(screen.queryByRole('dialog')).toBeNull()
      // The canvas has the keyboard again, on a press too: its default would
      // otherwise focus what is under it once the overlay is gone (#156 review).
      expect(surface).toHaveFocus()
    },
  )

  it('applies no answer over a view that changed while the question was open', async () => {
    // An undo is the change a user can make meanwhile; the answer must not
    // re-apply the move on the view as it was, which would quietly revert it.
    const { store, dispatch, user, nodeEl, view } = setup()
    const zurich = absoluteBounds(view(), 'o-zurich')!
    await drag(user, nodeEl('o-zurich'), { x: 1250, y: 840 }, { x: 1260, y: 850 })
    expect(dispatch).toHaveBeenCalledTimes(1)
    await drag(user, nodeEl('o-customer-hub'), HUB_PRESS, INSIDE_ENGINE)
    expect(prompt()).toBeInTheDocument()

    act(() => void store.undo())
    expect(absoluteBounds(view(), 'o-zurich')).toEqual(zurich)
    const relationships = store.relationshipCount
    await user.click(options()[0]!)

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(absoluteBounds(view(), 'o-zurich')).toEqual(zurich)
    expect(view().nodes.find((n) => n.id === 'o-customer-hub')!.parent).toBe('o-g-apps')
    expect(store.relationshipCount).toBe(relationships)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('asks nothing when the move is into a group, or out of one', async () => {
    const { dispatch, user, nodeEl, view } = setup()
    // Into a group: (800, 840) is inside o-g-platform, between its nodes.
    await drag(user, nodeEl('o-zurich'), { x: 1250, y: 840 }, { x: 800, y: 840 })
    expect(view().nodes.find((n) => n.id === 'o-zurich')!.parent).toBe('o-g-platform')
    // Out of the engine, to the empty canvas right of the landscape.
    await drag(user, nodeEl('o-calc'), { x: 460, y: 580 }, { x: 1600, y: 100 })
    expect(view().nodes.find((n) => n.id === 'o-calc')!.parent).toBeUndefined()

    // Present before absent: each move committed.
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('asks nothing when a shape moves within the element’s shape it is nested in', async () => {
    // A shape the question was asked about and answered "none": nothing runs
    // between the two, so only the move staying within its container keeps the
    // question shut. (A function the engine is assigned to would keep it shut
    // through the existing relationship, and could not tell, #156 review.)
    const { dispatch, user, nodeEl, view } = setup()
    await drag(user, nodeEl('o-customer-hub'), HUB_PRESS, INSIDE_ENGINE)
    await user.click(within(prompt()).getByRole('button', { name: 'None' }))
    const hub = () => view().nodes.find((n) => n.id === 'o-customer-hub')!
    expect(hub().parent).toBe('o-engine')
    const at = absoluteBounds(view(), 'o-customer-hub')!
    const press = { x: at.x + 10, y: at.y + 10 }

    await drag(user, nodeEl('o-customer-hub'), press, { x: press.x + 10, y: press.y + 5 })

    // Present before absent: the move committed, still in the engine.
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(hub().parent).toBe('o-engine')
    expect(absoluteBounds(view(), 'o-customer-hub')).toMatchObject({ x: at.x + 10, y: at.y + 5 })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('asks nothing when a relationship the nesting can mean exists, and draws it if the view does not', async () => {
    // Claims Engine accesses Claim Record (r-engine-claim). The view's own
    // drawing of it is removed first, so the nesting has one to draw.
    const { store, dispatch, user, nodeEl, view } = setup('writer', {
      prepare: (s) => s.removeConnection(LANDSCAPE, 'c-engine-claim'),
    })
    expect(store.relationship('r-engine-claim')).toMatchObject({
      type: 'Access',
      source: 'ac-engine',
      target: 'do-claim',
    })
    await drag(user, nodeEl('o-do-claim'), { x: 700, y: 630 }, INSIDE_ENGINE)

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(view().nodes.find((n) => n.id === 'o-do-claim')!.parent).toBe('o-engine')
    expect(
      view().connections.filter(
        (c) => c.kind === 'relationship' && c.relationship === 'r-engine-claim',
      ),
    ).toEqual([expect.objectContaining({ source: 'o-engine', target: 'o-do-claim' })])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('asks about several shapes moved in together, one row each, and makes what each row says', async () => {
    const { store, dispatch, user, nodeEl, view } = setup()
    await click(user, nodeEl('o-customer-hub'), HUB_PRESS)
    await click(user, nodeEl('o-crm'), { x: 900, y: 520 }, 'Shift')
    const relationships = store.relationshipCount

    await drag(user, nodeEl('o-customer-hub'), HUB_PRESS, INSIDE_ENGINE)
    const rows = within(prompt()).getAllByRole('combobox')
    expect(rows).toHaveLength(2)
    expect(within(prompt()).getByLabelText('Customer Data Hub')).toBe(rows[0])
    // Each row starts at its first option; one is turned to none.
    for (const row of rows) expect(row).toHaveDisplayValue(/^Composition: /)
    const crm = within(prompt()).getByLabelText('Legacy CRM')
    await user.selectOptions(crm, '(none)')
    await user.click(within(prompt()).getByRole('button', { name: 'Create' }))

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(
      view()
        .nodes.filter((n) => n.parent === 'o-engine')
        .map((n) => n.id),
    ).toEqual(expect.arrayContaining(['o-customer-hub', 'o-crm']))
    expect(store.relationshipCount).toBe(relationships + 1)
    expect(
      store
        .relationshipsOf('ac-engine')
        .filter((r) => r.type === 'Composition')
        .map((r) => r.target),
    ).toEqual(['ac-customer'])
  })
})

describe('placing a new element in an element’s shape (#131)', () => {
  it('asks before the name opens, and makes element, shape and relationship as one command', async () => {
    const { store, dispatch, user, surface, view } = setup()
    const before = model(store)
    const nodes = view().nodes.length
    await user.click(
      within(screen.getByRole('region', { name: 'Palette' })).getByRole('button', {
        name: 'Application Interface',
      }),
    )
    expect(surface.textContent).not.toMatch(/Application\s*Interface/)
    await click(user, surface, INSIDE_ENGINE)

    // The new shape is drawn, as the element it will be, while the question is
    // open, and nothing is made yet.
    expect(prompt()).toBeInTheDocument()
    expect(surface.querySelectorAll('[data-node]')).toHaveLength(nodes + 1)
    // Drawn from the element the answer will make, not as a missing one.
    expect(surface.textContent).not.toContain('Missing element')
    expect(surface.textContent).toMatch(/Application\s*Interface/)
    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox', { name: /^(Element|Group) name$/ })).toBeNull()

    await user.click(options()[0]!)
    expect(dispatch).toHaveBeenCalledTimes(1)
    const node = view().nodes[view().nodes.length - 1] as ElementNode
    expect(node.parent).toBe('o-engine')
    expect(store.element(node.element)?.type).toBe('ApplicationInterface')
    expect(store.relationshipsOf(node.element)).toEqual([
      expect.objectContaining({ type: 'Composition', source: 'ac-engine', target: node.element }),
    ])
    // Only now does its name open for typing.
    expect(screen.getByRole('textbox', { name: /^(Element|Group) name$/ })).toHaveFocus()

    await user.keyboard('{Escape}')
    act(() => void store.undo())
    expect(model(store)).toBe(before)
  })

  it('opens the name for typing after a press outside, which answers none', async () => {
    // The press's default would blur the name the answer opens, which commits
    // it as it is and closes it before anything is typed (#156 review).
    const { store, dispatch, user, surface, view } = setup()
    const relationships = store.relationshipCount
    await user.click(
      within(screen.getByRole('region', { name: 'Palette' })).getByRole('button', {
        name: 'Application Interface',
      }),
    )
    await click(user, surface, INSIDE_ENGINE)
    expect(prompt()).toBeInTheDocument()

    await pressOutside(user)

    expect(dispatch).toHaveBeenCalledTimes(1)
    const node = view().nodes[view().nodes.length - 1] as ElementNode
    expect(node.parent).toBe('o-engine')
    expect(store.relationshipCount).toBe(relationships)
    const name = screen.getByRole('textbox', { name: /^(Element|Group) name$/ })
    expect(name).toHaveFocus()
    await user.keyboard('Claims API{Enter}')
    expect(store.element(node.element)?.name).toBe('Claims API')
  })
})

describe('dropping an element from the model tree into an element’s shape (#131)', () => {
  it('asks, and makes the shape and the relationship as one command', async () => {
    const { store, dispatch, user, surface, view } = setup()
    // Policy Host has no relationship with the engine.
    expect(
      store
        .relationshipsOf('ac-host')
        .some((r) => r.source === 'ac-engine' || r.target === 'ac-engine'),
    ).toBe(false)
    expect(drop(surface, { [ELEMENT_DRAG_TYPE]: 'ac-host' }, INSIDE_ENGINE)).toBe(true)
    expect(dispatch).not.toHaveBeenCalled()

    await user.click(options()[0]!)
    expect(dispatch).toHaveBeenCalledTimes(1)
    const node = view().nodes[view().nodes.length - 1] as ElementNode
    expect(node).toMatchObject({ element: 'ac-host', parent: 'o-engine' })
    expect(store.relationshipsOf('ac-host').filter((r) => r.source === 'ac-engine')).toEqual([
      expect.objectContaining({ type: 'Composition' }),
    ])
    expect(surface).toHaveFocus()
  })
})
