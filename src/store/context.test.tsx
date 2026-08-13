import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { smallWorkspace } from '@/test/fixtures'
import { ModelStoreProvider } from './ModelStoreProvider'
import { useModelSelector, useModelStore, useModelVersion } from './context'
import type { ModelStore } from './model-store'

function Counts() {
  const counts = useModelSelector((store) => ({
    elements: store.elementCount,
    relationships: store.relationshipCount,
    dirty: store.dirty,
  }))
  return (
    <div>
      <span data-testid="elements">{counts.elements}</span>
      <span data-testid="relationships">{counts.relationships}</span>
      <span data-testid="dirty">{counts.dirty}</span>
    </div>
  )
}

let captured: ModelStore | undefined

function Capture() {
  captured = useModelStore()
  const version = useModelVersion()
  return <span data-testid="version">{version}</span>
}

function renderApp() {
  return render(
    <ModelStoreProvider initialWorkspace={smallWorkspace()} ephemeral>
      <Capture />
      <Counts />
    </ModelStoreProvider>,
  )
}

describe('React binding', () => {
  it('exposes the store through context', () => {
    renderApp()
    expect(captured?.name).toBe('ArchiSurance')
    expect(screen.getByTestId('elements')).toHaveTextContent('5')
    expect(screen.getByTestId('relationships')).toHaveTextContent('4')
  })

  it('re-renders selectors when the model changes', () => {
    renderApp()
    act(() => {
      captured?.addElement({
        id: 'app-portal',
        type: 'ApplicationComponent',
        name: 'Customer Web Portal',
        properties: {},
      })
    })
    expect(screen.getByTestId('elements')).toHaveTextContent('6')
    expect(screen.getByTestId('dirty')).toHaveTextContent('1')
    expect(screen.getByTestId('version')).toHaveTextContent('1')
  })

  it('reflects undo back into the UI', () => {
    renderApp()
    act(() => {
      captured?.removeElement('app-claims')
    })
    expect(screen.getByTestId('elements')).toHaveTextContent('4')
    act(() => {
      captured?.undo()
    })
    expect(screen.getByTestId('elements')).toHaveTextContent('5')
    expect(screen.getByTestId('relationships')).toHaveTextContent('4')
  })

  it('recomputes a selector when its own inputs change, not just the model', () => {
    // A selector that closes over a prop must be given that prop as a dep, or it
    // keeps returning the value it computed for the previous one — the model
    // version has not changed to tell it otherwise.
    function Name({ id }: { id: string }) {
      const name = useModelSelector((store) => store.element(id)?.name ?? '—', [id])
      return <span data-testid="name">{name}</span>
    }

    // Two things had to change for this to be able to fail.
    //
    // The workspace object is built once and reused: `ModelStoreProvider`
    // memoises the store on `initialWorkspace`, so passing a fresh
    // `smallWorkspace()` to the rerender built a *new store* — and `store` is
    // already in the memo's dep array, so it busted the cache on its own.
    //
    // And the assertions are anchored. `toHaveTextContent` is a substring match,
    // and the stale value here is "Claim Handling Engine", which *contains* the
    // expected "Claim Handling" — so even with the store held still the test
    // passed while rendering the previous element's name.
    const workspace = smallWorkspace()

    const { rerender } = render(
      <ModelStoreProvider initialWorkspace={workspace} ephemeral>
        <Name id="app-claims" />
      </ModelStoreProvider>,
    )
    expect(screen.getByTestId('name')).toHaveTextContent(/^Claim Handling Engine$/)

    rerender(
      <ModelStoreProvider initialWorkspace={workspace} ephemeral>
        <Name id="cap-claim" />
      </ModelStoreProvider>,
    )
    expect(screen.getByTestId('name')).toHaveTextContent(/^Claim Handling$/)
  })

  it('throws a useful error when a hook is used outside the provider', () => {
    function Orphan() {
      useModelStore()
      return null
    }
    // React logs the thrown error itself; the assertion is what matters here.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Orphan />)).toThrow(/inside <ModelStoreProvider>/)
    quiet.mockRestore()
  })
})
