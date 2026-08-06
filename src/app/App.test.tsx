import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from './App'

function renderAt(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>,
  )
}

describe('App routing', () => {
  it('redirects / to the inventory', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
  })

  it('renders the graph route', () => {
    renderAt('/graph')
    expect(screen.getByRole('heading', { name: 'Dependency graph' })).toBeInTheDocument()
  })

  it('renders an element route with its id', () => {
    renderAt('/element/app-crm')
    expect(screen.getByText(/app-crm/)).toBeInTheDocument()
  })

  it('renders the brand chrome on every screen', () => {
    renderAt('/inventory')
    expect(screen.getByText('Archipelago')).toBeInTheDocument()
  })
})
