import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { loadDemoWorkspace } from '@/io'
import { ModelStore, ModelStoreContext, type ModelStoreContextValue } from '@/store'
import { ElementScreen } from './ElementScreen'

/**
 * An element's documentation as the fact sheet commits it, held to the same
 * rule as a relationship's and the model's (#171): cleared is absent, never
 * `''`, and leaving the field unchanged records nothing.
 */

const APP = 'app-policy-ha'

function setup() {
  const store = new ModelStore(loadDemoWorkspace())
  const dispatch = vi.spyOn(store, 'dispatch')
  const value = { store, role: 'writer', ready: true } as unknown as ModelStoreContextValue
  render(
    <MemoryRouter
      initialEntries={[`/element/${APP}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ModelStoreContext.Provider value={value}>
        <Routes>
          <Route path="/element/:id" element={<ElementScreen />} />
        </Routes>
      </ModelStoreContext.Provider>
    </MemoryRouter>,
  )
  return { store, dispatch, user: userEvent.setup() }
}

describe('an element’s documentation on the fact sheet (#171)', () => {
  it('cleared, is removed rather than stored empty', async () => {
    const { store, dispatch, user } = setup()
    expect(store.element(APP)?.documentation).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Documentation'))
    await user.tab()
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(store.element(APP)).not.toHaveProperty('documentation')
  })

  it('records nothing when the field is left unchanged', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByLabelText('Documentation'))
    await user.tab()
    expect(dispatch).not.toHaveBeenCalled()
  })
})
