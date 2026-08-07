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
