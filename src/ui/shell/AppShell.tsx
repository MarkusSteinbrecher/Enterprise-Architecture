import { Outlet } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import './shell.css'

/**
 * Minimal themed frame — brand, nav, content well.
 * The full global chrome (search button, save-state indicator, workspace switcher,
 * model-health footer) lands with issue #6; this is the bootstrap skeleton.
 */
export function AppShell() {
  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__brand">
          <span className="shell__mark" aria-hidden="true" />
          <span className="shell__wordmark">Archipelago</span>
          <span className="shell__version mono">0.2</span>
        </div>
        <div className="shell__header-centre" />
        <div className="shell__header-right">
          <ThemeToggle />
        </div>
      </header>
      <div className="shell__body">
        <nav className="shell__nav" aria-label="Model">
          <div className="section-label shell__nav-label">Model</div>
        </nav>
        <main className="shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
