import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/ui/shell/AppShell'
import { InventoryScreen } from '@/ui/inventory/InventoryScreen'
import { ElementScreen } from '@/ui/factsheet/ElementScreen'
import { GraphScreen } from '@/ui/graph/GraphScreen'
import { PaletteProvider } from '@/ui/palette/PaletteProvider'

export function App() {
  return (
    <PaletteProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="/inventory" element={<InventoryScreen />} />
          <Route path="/element/:id" element={<ElementScreen />} />
          <Route path="/graph" element={<GraphScreen />} />
          <Route path="*" element={<Navigate to="/inventory" replace />} />
        </Route>
      </Routes>
    </PaletteProvider>
  )
}
