import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyWorkspace } from '@/model'
import { smallWorkspace } from '@/test/fixtures'
import { ModelStoreProvider } from './ModelStoreProvider'
import { useModelSelector, useModelStoreContext, type ModelStoreContextValue } from './context'
import { listWorkspaces, loadWorkspace, resetDatabaseConnection, saveSnapshot } from './persistence'

/**
 * The workspace lifecycle, driven the way the switcher drives it.
 *
 * These paths had no test at all: `src/test/render.tsx` always passes
 * `ephemeral`, which made `workspaces` permanently `[]`, so open / create /
 * delete never executed in any test — and the switcher tests that "cover" them
 * only ever opened the menu. That is how a delete that a pending autosave undoes
 * got through review. So this file runs the real provider against
 * `fake-indexeddb` and asserts what ends up on disk, not what the menu renders.
 */

let ctx: ModelStoreContextValue | undefined

function Harness() {
  ctx = useModelStoreContext()
  const dirty = useModelSelector((store) => store.dirty)
  const name = useModelSelector((store) => store.name)
  return (
    <div>
      <span data-testid="ready">{String(ctx.ready)}</span>
      <span data-testid="name">{name}</span>
      <span data-testid="dirty">{dirty}</span>
      <span data-testid="listed">{ctx.workspaces.map((meta) => meta.name).join(',')}</span>
    </div>
  )
}

function mount({ ephemeral = false } = {}) {
  return render(
    <ModelStoreProvider ephemeral={ephemeral}>
      <Harness />
    </ModelStoreProvider>,
  )
}

/** The provider boots asynchronously; nothing below is meaningful before it lands. */
async function booted() {
  await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'))
  if (!ctx) throw new Error('the harness never rendered')
  return ctx
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetDatabaseConnection()
  ctx = undefined
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'locks')
})

describe('workspace lifecycle', () => {
  it('creates, lists, opens and deletes a workspace on disk', async () => {
    await saveSnapshot(smallWorkspace())
    mount()
    const store = await booted()

    await act(async () => {
      await store.createWorkspace('Client X')
    })
    expect(screen.getByTestId('name')).toHaveTextContent('Client X')
    expect((await listWorkspaces()).map((meta) => meta.name)).toEqual(['Client X', 'ArchiSurance'])

    await act(async () => {
      await store.openWorkspace('ws-test')
    })
    expect(screen.getByTestId('name')).toHaveTextContent('ArchiSurance')

    await act(async () => {
      await store.removeWorkspace('ws-test')
    })
    expect(await loadWorkspace('ws-test')).toBeUndefined()
    expect((await listWorkspaces()).map((meta) => meta.name)).toEqual(['Client X'])
  })

  it('does not reset the unsaved count when switching workspaces', async () => {
    await saveSnapshot(smallWorkspace())
    await saveSnapshot(emptyWorkspace('ws-other', 'Other'))
    mount()
    const store = await booted()

    await act(async () => {
      store.store.rename('Renamed')
    })
    expect(screen.getByTestId('dirty')).toHaveTextContent(/^2$/)

    // Round-tripping through another workspace used to zero the counter, so a
    // model that existed in no file anywhere reported LOCAL · SAVED.
    await act(async () => {
      await store.openWorkspace('ws-test')
    })
    await act(async () => {
      await store.openWorkspace('ws-other')
    })
    expect(screen.getByTestId('dirty')).not.toHaveTextContent(/^0$/)
  })

  it('restores from IndexedDB without claiming the model is in a file', async () => {
    await saveSnapshot(smallWorkspace())
    mount()
    await booted()

    // Browser storage is a cache. A snapshot that has only ever lived there
    // matches nothing on disk, however many sessions it has survived.
    expect(screen.getByTestId('name')).toHaveTextContent('ArchiSurance')
    expect(screen.getByTestId('dirty')).toHaveTextContent(/^1$/)
  })

  it('leaves a fresh empty workspace when the last one is deleted', async () => {
    await saveSnapshot(smallWorkspace())
    mount()
    const store = await booted()

    await act(async () => {
      await store.removeWorkspace('ws-test')
    })
    expect(screen.getByTestId('name')).toHaveTextContent('Untitled workspace')
    expect(await listWorkspaces()).toHaveLength(1)
  })
})

describe('a delete cannot be undone by a pending autosave', () => {
  it('drops a debounced write armed against the workspace being deleted', async () => {
    await saveSnapshot(smallWorkspace())
    mount()
    const store = await booted()

    // Only the debounce timer is faked; fake-indexeddb drives its own requests
    // through setImmediate and faking those deadlocks every request.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    // The sequence from the report: rename (arms the 800ms debounce), then
    // Delete. `window.confirm` blocks the main thread well past the quiet
    // period, so by the time the user clicks OK the write is already due — and
    // it lands in the gap between deleteWorkspace() and the replace that
    // follows it, putting both records straight back.
    await act(async () => {
      store.store.rename('About to be deleted')
    })

    await act(async () => {
      const removal = store.removeWorkspace('ws-test')
      await vi.advanceTimersByTimeAsync(2_000)
      await removal
    })

    expect(await loadWorkspace('ws-test')).toBeUndefined()
    expect((await listWorkspaces()).map((meta) => meta.id)).not.toContain('ws-test')
  })
})

describe('a reader tab', () => {
  /** jsdom has no Web Locks; without them every tab reports itself the writer. */
  function heldByAnotherTab() {
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: (_name: string, _options: unknown, callback: (lock: null) => unknown) =>
          Promise.resolve(callback(null)),
      },
    })
  }

  it('may not create or delete workspaces', async () => {
    heldByAnotherTab()
    await saveSnapshot(smallWorkspace())
    mount()
    const store = await booted()
    expect(store.role).toBe('reader')

    // The switcher disables both, but the guard lives here so that the next
    // surface to call them does not have to remember.
    await act(async () => {
      await store.createWorkspace('Client X')
      await store.removeWorkspace('ws-test')
    })

    expect((await listWorkspaces()).map((meta) => meta.name)).toEqual(['ArchiSurance'])
    expect(await loadWorkspace('ws-test')).toBeDefined()
  })
})

describe('ephemeral', () => {
  it('keeps the workspace lifecycle out of the database entirely', async () => {
    await saveSnapshot(smallWorkspace())
    mount({ ephemeral: true })
    const store = await booted()

    await act(async () => {
      await store.createWorkspace('Client X')
      await store.removeWorkspace('ws-test')
      await store.openWorkspace('ws-test')
    })

    // The provider documents that it disables persistence; the seeded workspace
    // is how we can tell it did rather than merely intending to.
    expect((await listWorkspaces()).map((meta) => meta.name)).toEqual(['ArchiSurance'])
    expect(await loadWorkspace('ws-test')).toBeDefined()
    expect(screen.getByTestId('listed')).toBeEmptyDOMElement()
  })
})
