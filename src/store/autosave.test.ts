import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { smallWorkspace } from '@/test/fixtures'
import { Autosaver } from './autosave'
import { ModelStore } from './model-store'
import { loadGenerations, loadWorkspace, resetDatabaseConnection } from './persistence'

const NEW_APP = {
  id: 'app-portal',
  type: 'ApplicationComponent',
  name: 'Customer Web Portal',
  properties: {},
} as const

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetDatabaseConnection()
  // Only the debounce timer is faked: fake-indexeddb drives its own requests
  // through setImmediate/microtasks, and faking those deadlocks every request.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  vi.useRealTimers()
})

/** Fake timers do not drive requestIdleCallback, so the autosaver falls back to setTimeout. */
async function settle(autosaver: Autosaver, debounceMs = 800) {
  await vi.advanceTimersByTimeAsync(debounceMs + 10)
  await autosaver.flush()
}

describe('autosave', () => {
  it('writes a snapshot after the debounce window', async () => {
    const store = new ModelStore(smallWorkspace())
    const autosaver = new Autosaver(store)
    autosaver.start()

    store.addElement({ ...NEW_APP })
    expect(await loadWorkspace('ws-test')).toBeUndefined() // nothing yet

    await settle(autosaver)
    const saved = await loadWorkspace('ws-test')
    expect(saved?.elements.map((e) => e.id)).toContain('app-portal')

    autosaver.stop()
  })

  it('collapses a burst of edits into one write', async () => {
    const store = new ModelStore(smallWorkspace())
    const autosaver = new Autosaver(store)
    autosaver.start()

    for (let i = 0; i < 20; i += 1) {
      store.updateElement('app-claims', (element) => ({ ...element, name: `Rename ${i}` }))
    }
    await settle(autosaver)

    const generations = await loadGenerations('ws-test')
    expect(generations).toHaveLength(1)
    expect(generations[0]?.workspace.elements.find((e) => e.id === 'app-claims')?.name).toBe(
      'Rename 19',
    )

    autosaver.stop()
  })

  it('does not write while disabled — the reader tab stays out of the way', async () => {
    const store = new ModelStore(smallWorkspace())
    const autosaver = new Autosaver(store)
    autosaver.start()
    autosaver.setEnabled(false)

    store.addElement({ ...NEW_APP })
    await vi.advanceTimersByTimeAsync(2_000)
    await autosaver.flush()

    expect(await loadWorkspace('ws-test')).toBeUndefined()
    expect(autosaver.enabled).toBe(false)

    autosaver.stop()
  })

  it('stops writing once stopped', async () => {
    const store = new ModelStore(smallWorkspace())
    const autosaver = new Autosaver(store)
    autosaver.start()
    autosaver.stop()

    store.addElement({ ...NEW_APP })
    await vi.advanceTimersByTimeAsync(2_000)
    expect(await loadWorkspace('ws-test')).toBeUndefined()
  })

  it('drops a due write while suspended, and resumes on the next change', async () => {
    const store = new ModelStore(smallWorkspace())
    const autosaver = new Autosaver(store)
    autosaver.start()

    store.addElement({ ...NEW_APP })
    // The debounce is armed but has not fired — the state the caller is in when
    // `window.confirm` returns and the workspace is about to be deleted.
    await autosaver.suspend()
    expect(autosaver.suspended).toBe(true)
    await vi.advanceTimersByTimeAsync(2_000)
    await autosaver.flush()
    expect(await loadWorkspace('ws-test')).toBeUndefined()

    // Dropped, not deferred: resuming alone must not replay the write.
    autosaver.resume()
    await vi.advanceTimersByTimeAsync(2_000)
    expect(await loadWorkspace('ws-test')).toBeUndefined()

    store.updateElement('app-claims', (element) => ({ ...element, name: 'Claims' }))
    await settle(autosaver)
    expect((await loadWorkspace('ws-test'))?.elements.map((e) => e.id)).toContain('app-portal')

    autosaver.stop()
  })

  it('suspend does not resolve while a write is in flight', async () => {
    const order: string[] = []
    const store = new ModelStore(smallWorkspace())
    const autosaver = new Autosaver(store, { onSaved: () => order.push('saved') })
    autosaver.start()

    store.addElement({ ...NEW_APP })
    // Start a write without awaiting it, then suspend on top of it. Asserting
    // the snapshot is on disk afterwards would prove nothing — the `await` in
    // the assertion itself gives the write all the time it needs — so this
    // asserts the ordering, which is the only thing that differs.
    const inFlight = autosaver.flush()
    await autosaver.suspend()
    order.push('suspended')

    expect(order).toEqual(['saved', 'suspended'])

    await inFlight
    autosaver.stop()
  })

  it('reports save failures instead of throwing into the mutation path', async () => {
    const store = new ModelStore(smallWorkspace())
    const onError = vi.fn()
    const autosaver = new Autosaver(store, { onError })
    // A workspace that cannot be structured-cloned into IndexedDB.
    store.addElement({
      ...NEW_APP,
      properties: { bad: (() => undefined) as unknown as string },
    })
    autosaver.start()
    await settle(autosaver)
    expect(onError).toHaveBeenCalled()
    autosaver.stop()
  })
})
