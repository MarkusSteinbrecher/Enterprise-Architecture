import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { loadDemoWorkspace } from '@/io'
import { renderApp } from '@/test/render'

describe('App routing', () => {
  it('redirects / to the inventory', () => {
    renderApp(loadDemoWorkspace(), { route: '/' })
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
  })

  it('renders the graph route', () => {
    renderApp(loadDemoWorkspace(), { route: '/graph' })
    expect(screen.getByRole('heading', { name: 'Dependency graph' })).toBeInTheDocument()
  })

  it('renders an element route from the model', () => {
    renderApp(loadDemoWorkspace(), { route: '/element/app-crm' })
    expect(screen.getByRole('heading', { name: 'CRM System' })).toBeInTheDocument()
    expect(screen.getByText(/Application Component · app-crm/)).toBeInTheDocument()
  })

  it('falls back gracefully for an element that is not in the model', () => {
    renderApp(loadDemoWorkspace(), { route: '/element/nope' })
    expect(screen.getByRole('heading', { name: 'Element not found' })).toBeInTheDocument()
  })

  it('sends an unknown route back to the inventory', () => {
    renderApp(loadDemoWorkspace(), { route: '/nowhere' })
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
  })

  it('renders the brand chrome on every screen', () => {
    renderApp(loadDemoWorkspace(), { route: '/graph' })
    expect(screen.getByText('Archipelago')).toBeInTheDocument()
  })
})
