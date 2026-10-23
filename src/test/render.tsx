import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Workspace } from '@/model'
import {
  ModelStoreContext,
  ModelStoreProvider,
  type ModelStore,
  type ModelStoreContextValue,
  type TabRole,
} from '@/store'
import { App } from '@/app/App'
import { FileWorkspaceProvider } from '@/ui/files/FileWorkspaceProvider'
import { GlobalShortcutsProvider } from '@/ui/shell/GlobalShortcutsProvider'

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const

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
    <MemoryRouter initialEntries={[route]} future={FUTURE}>
      <ModelStoreProvider initialWorkspace={workspace} ephemeral>
        <App />
      </ModelStoreProvider>
    </MemoryRouter>,
  )
}

/**
 * Render one screen with the tab's role in the test's hands. `as(role)`
 * re-renders with that role and keeps the store and the screen's own state,
 * as losing a shared folder's lock does (ADR 0010): `role` becomes `'reader'`
 * while `tabRole` stays `'writer'`, so the app shows the screen, not the
 * takeover page. The role reaches the screen through the app's own
 * `FileWorkspaceProvider`, which also tells the store (#198).
 */
export function renderScreenAs(
  role: TabRole,
  store: ModelStore,
  { route, path, screen }: { route: string; path: string; screen: ReactElement },
): RenderResult & { as: (role: TabRole) => void } {
  const ui = (role: TabRole) => {
    const value: ModelStoreContextValue = {
      store,
      role,
      tabRole: 'writer',
      ready: true,
      lastSavedAt: undefined,
      takeOver: async () => {},
      flush: async () => {},
      workspaces: [],
      openWorkspace: async () => {},
      createWorkspace: async () => {},
      removeWorkspace: async () => {},
    }
    return (
      <MemoryRouter initialEntries={[route]} future={FUTURE}>
        <GlobalShortcutsProvider>
          <ModelStoreContext.Provider value={value}>
            <FileWorkspaceProvider>
              <Routes>
                <Route path={path} element={screen} />
              </Routes>
            </FileWorkspaceProvider>
          </ModelStoreContext.Provider>
        </GlobalShortcutsProvider>
      </MemoryRouter>
    )
  }
  const result = render(ui(role))
  return { ...result, as: (next) => result.rerender(ui(next)) }
}
