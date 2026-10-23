import { useState } from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ModelStore, useModelStoreContext } from '@/store'
import { smallWorkspace } from '@/test/fixtures'
import { renderScreenAs } from '@/test/render'

/**
 * The store is the one reader guard (#198): a screen that forgets its own still
 * cannot write. The real screens all have one, and each closes what a writer
 * opened when the role changes (#195, #197), so none of them can show the
 * store's guard working. This one has none on purpose: it is the next screen,
 * written by someone who did not know.
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
