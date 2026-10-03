import { lazy, Suspense, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useModelSelector, useModelStoreContext } from '@/store'
import { AppShell } from '@/ui/shell/AppShell'
import { InventoryScreen } from '@/ui/inventory/InventoryScreen'
import { ElementScreen } from '@/ui/factsheet/ElementScreen'
import { GraphScreen } from '@/ui/graph/GraphScreen'
import { ViewScreen } from '@/ui/views/ViewScreen'
import { PaletteProvider } from '@/ui/palette/PaletteProvider'
import { FileWorkspaceProvider } from '@/ui/files/FileWorkspaceProvider'
import { FirstRun } from '@/ui/files/FirstRun'
import { ImportDialog } from '@/ui/files/ImportDialog'
import { TakeoverScreen } from '@/ui/files/TakeoverScreen'
import { SaveNotice } from '@/ui/files/SaveNotice'

/**
 * `/element/:id` re-renders without remounting, so every piece of per-element
 * state the fact sheet holds — the `editing` flag, the uncontrolled inputs'
 * `defaultValue` — silently carried the previous element onto the next one, and
 * committed it on blur. Keying the route on the id makes that class of bug
 * impossible rather than something each new piece of state has to remember.
 */
function KeyedElementScreen() {
  const { id = '' } = useParams()
  return <ElementScreen key={id} />
}

/** Same reason as above: viewport and selection are per view. */
function KeyedViewScreen() {
  const { id = '' } = useParams()
  return <ViewScreen key={id} />
}

/**
 * Dev-only screens, absent from the production bundle: `import.meta.env.DEV` is
 * a build-time constant, so the lazy import is dropped with the dead branch.
 */
const NotationGallery = import.meta.env.DEV
  ? lazy(() => import('@/ui/notation/NotationGallery'))
  : null

export function App() {
  return (
    <FileWorkspaceProvider>
      <PaletteProvider>
        <AppRoutes />
        <ImportDialog />
        <SaveNotice />
      </PaletteProvider>
    </FileWorkspaceProvider>
  )
}

/**
 * Three states before the app proper: a tab that lost the writer lock, a browser
 * with nothing in it yet, and everything else.
 */
function AppRoutes() {
  const { role, ready } = useModelStoreContext()
  const elementCount = useModelSelector((store) => store.elementCount)
  const [startedEmpty, setStartedEmpty] = useState(false)
  const { pathname } = useLocation()

  // The notation gallery needs no model, so it skips first run and the shell.
  if (NotationGallery && pathname === '/dev/notation') {
    return (
      <Suspense fallback={null}>
        <NotationGallery />
      </Suspense>
    )
  }
  if (role === 'reader') return <TakeoverScreen />
  if (ready && elementCount === 0 && !startedEmpty) {
    return <FirstRun onStartEmpty={() => setStartedEmpty(true)} />
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/inventory" replace />} />
        <Route path="/inventory" element={<InventoryScreen />} />
        <Route path="/element/:id" element={<KeyedElementScreen />} />
        <Route path="/graph" element={<GraphScreen />} />
        <Route path="/view/:id" element={<KeyedViewScreen />} />
        <Route path="*" element={<Navigate to="/inventory" replace />} />
      </Route>
    </Routes>
  )
}
