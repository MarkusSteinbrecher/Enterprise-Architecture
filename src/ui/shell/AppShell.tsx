import { Outlet } from 'react-router-dom'
import { usePalette } from '@/ui/palette/context'
import { Header } from './Header'
import { LeftNav } from './LeftNav'
import './shell.css'

/**
 * The frame every screen lives in: 46px header, 208px nav, content well.
 * Handoff: `grid-template-rows: 46px 1fr` over `grid-template-columns: 208px 1fr`.
 */

export function AppShell() {
  const { openPalette } = usePalette()

  return (
    <div className="shell">
      <Header onOpenSearch={openPalette} />
      <div className="shell__body">
        <LeftNav />
        <main className="shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
