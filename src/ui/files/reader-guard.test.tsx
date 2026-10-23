import { useState } from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import claimsXml from '@/io/fixtures/claims-platform.xml?raw'
import { importExchangeXml } from '@/io'
import type { GroupNode } from '@/model'
import { ModelStore, useModelStoreContext } from '@/store'
import { smallWorkspace } from '@/test/fixtures'
import { renderScreenAs } from '@/test/render'
import { LANDSCAPE } from '@/test/view-editor'
import { ViewScreen } from '@/ui/views/ViewScreen'

/**
 * The store is the one reader guard (#198): a screen that forgets its own still
 * cannot write. The fact sheets and the inventory close what a writer opened
 * when the role changes (#195, #197), so they cannot show the store's guard
 * working; the canvas's inline name editor does not yet, and its commit is
 * refused with a logged error. This screen has no guard on purpose: it is the
 * next screen, written by someone who did not know.
 */
function Unguarded() {
  const { store } = useModelStoreContext()
  const [refused, setRefused] = useState<string>()
  return (
    <>
      <button
        type="button"
        onClick={() => {
          try {
            store.removeElement('proc-claim')
          } catch (error) {
            setRefused(error instanceof Error ? error.name : String(error))
          }
        }}
      >
        Delete Handle Claim
      </button>
      {refused && <p role="alert">{refused}</p>}
    </>
  )
}

function screenAs(role: 'writer' | 'reader') {
  const store = new ModelStore(smallWorkspace())
  const h = renderScreenAs(role, store, { route: '/probe', path: '/probe', screen: <Unguarded /> })
  return { ...h, store, user: userEvent.setup() }
}
const remove = () => screen.getByRole('button', { name: 'Delete Handle Claim' })

describe('a screen with no reader guard of its own (#198)', () => {
  it('writes as a writer, so the probe is a real write', async () => {
    const h = screenAs('writer')
    await h.user.click(remove())
    expect(h.store.element('proc-claim')).toBeUndefined()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('writes nothing once the tab becomes a reader: the store refuses', async () => {
    const h = screenAs('writer')
    h.as('reader')
    const dirty = h.store.dirty
    await h.user.click(remove())
    expect(screen.getByRole('alert')).toHaveTextContent('ReadOnlyModelError')
    expect(h.store.element('proc-claim')).toBeDefined()
    expect(h.store.dirty).toBe(dirty)
    expect(h.store.canUndo).toBe(false)
  })

  it('writes again when the tab can write again', async () => {
    const h = screenAs('reader')
    h.as('writer')
    await h.user.click(remove())
    expect(h.store.element('proc-claim')).toBeUndefined()
  })
})

describe('a view panel’s typing, when the tab becomes a reader (#198)', () => {
  /** The claims landscape, opened with its Business group selected. */
  function landscape() {
    const store = new ModelStore(importExchangeXml(claimsXml, 'claims-platform.xml').workspace!)
    const h = renderScreenAs('writer', store, {
      route: `/view/${LANDSCAPE}?node=o-g-business`,
      path: '/view/:id',
      screen: <ViewScreen />,
    })
    return { ...h, store, user: userEvent.setup() }
  }
  const group = (store: ModelStore) =>
    store.view(LANDSCAPE)!.nodes.find((n) => n.id === 'o-g-business') as GroupNode

  it('is dropped, not written, and the app stays up', async () => {
    const h = landscape()
    const documentation = screen.getByRole('textbox', { name: 'Documentation' })
    await h.user.click(documentation)
    await h.user.type(documentation, 'Typed')
    const before = group(h.store).documentation
    h.as('reader')
    // Present first: the canvas is still drawn, as a reader's.
    expect(document.querySelector('.view-screen__canvas')).not.toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Documentation' })).toBeNull()
    expect(group(h.store).documentation).toBe(before)
    expect(h.store.dirty).toBe(0)
  })

  it('is still written when the field goes for any other reason', async () => {
    const h = landscape()
    const documentation = screen.getByRole('textbox', { name: 'Documentation' })
    await h.user.click(documentation)
    await h.user.type(documentation, 'Typed')
    h.unmount()
    expect(group(h.store).documentation).toBe('Typed')
  })
})
