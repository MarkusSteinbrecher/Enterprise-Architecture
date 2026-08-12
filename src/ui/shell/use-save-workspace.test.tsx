import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { smallWorkspace } from '@/test/fixtures'
import { ModelStore, ModelStoreContext, type ModelStoreContextValue, type TabRole } from '@/store'
import { useSaveWorkspace } from './use-save-workspace'

/**
 * The save owner, tested directly rather than through the header, because the
 * two branches that matter are not both reachable from it: SAVE FILE is disabled
 * for a reader tab, so the guard inside would never run in a component test — and
 * an unexercised guard is how a second call site (the command palette, #7) ends
 * up without one.
 */

let createObjectURL: ReturnType<typeof vi.fn>
let click: ReturnType<typeof vi.fn>

function wrapper(role: TabRole, store: ModelStore) {
  const value = {
    store,
    role,
    ready: true,
    lastSavedAt: undefined,
    workspaces: [],
    takeOver: vi.fn(),
    flush: vi.fn(),
    openWorkspace: vi.fn(),
    createWorkspace: vi.fn(),
    removeWorkspace: vi.fn(),
  } as unknown as ModelStoreContextValue

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <ModelStoreContext.Provider value={value}>{children}</ModelStoreContext.Provider>
  }
}

function downloadedName(): string | undefined {
  return click.mock.instances[0] instanceof HTMLAnchorElement
    ? (click.mock.instances[0] as HTMLAnchorElement).download
    : undefined
}

beforeEach(() => {
  createObjectURL = vi.fn(() => 'blob:test')
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
  click = vi.fn()
  HTMLAnchorElement.prototype.click = click
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useSaveWorkspace', () => {
  it('downloads canonical JSON without clearing the unsaved count', () => {
    const store = new ModelStore(smallWorkspace())
    store.rename('Renamed')
    expect(store.dirty).toBe(1)

    const { result } = renderHook(() => useSaveWorkspace(), { wrapper: wrapper('writer', store) })
    expect(result.current.saveFile()).toEqual({ kind: 'downloaded', fileName: 'renamed.json' })

    expect(createObjectURL).toHaveBeenCalled()
    expect(downloadedName()).toBe('renamed.json')
    // The whole point of the owner: nothing here may claim the model is safe.
    expect(store.dirty).toBe(1)
  })

  it('refuses SAVE FILE from a reader tab without touching the model', () => {
    const store = new ModelStore(smallWorkspace())
    store.rename('Renamed')

    const { result } = renderHook(() => useSaveWorkspace(), { wrapper: wrapper('reader', store) })
    expect(result.current.saveFile()).toEqual({ kind: 'read-only' })

    expect(createObjectURL).not.toHaveBeenCalled()
    expect(click).not.toHaveBeenCalled()
    expect(store.dirty).toBe(1)
  })

  it('lets a reader export the exchange format — it writes nothing', () => {
    const store = new ModelStore(smallWorkspace())

    const { result } = renderHook(() => useSaveWorkspace(), { wrapper: wrapper('reader', store) })
    expect(result.current.exportXml()).toEqual({
      kind: 'downloaded',
      fileName: 'archisurance.xml',
    })
    expect(downloadedName()).toBe('archisurance.xml')
    expect(store.dirty).toBe(0)
  })
})
