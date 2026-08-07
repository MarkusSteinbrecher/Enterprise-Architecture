import { render, type RenderResult } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Workspace } from '@/model'
import { ModelStoreProvider } from '@/store'
import { App } from '@/app/App'

/**
 * Render the whole app at a route with a given workspace.
 * `ephemeral` keeps IndexedDB and the Web Lock out of component tests — the
 * store's own tests cover those.
 */
export function renderApp(
  workspace: Workspace,
  { route = '/inventory' }: { route?: string } = {},
): RenderResult {
  return render(
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ModelStoreProvider initialWorkspace={workspace} ephemeral>
        <App />
      </ModelStoreProvider>
    </MemoryRouter>,
  )
}
