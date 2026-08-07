import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { LeftNav } from './LeftNav'
import './shell.css'

/**
 * The frame every screen lives in: 46px header, 208px nav, content well.
 * Handoff: `grid-template-rows: 46px 1fr` over `grid-template-columns: 208px 1fr`.
 */

export interface AppShellProps {
  /** Opens the command palette; supplied by the palette provider in #7. */
  onOpenSearch?: () => void
}

export function AppShell({ onOpenSearch = () => {} }: AppShellProps) {
  return (
    <div className="shell">
      <Header onOpenSearch={onOpenSearch} />
      <div className="shell__body">
        <LeftNav />
        <main className="shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
