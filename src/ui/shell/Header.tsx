import { useModelStoreContext } from '@/store'
import { downloadWorkspace } from '@/io'
import { SaveStateIndicator } from './SaveStateIndicator'
import { ThemeToggle } from './ThemeToggle'

/**
 * The 46px header (handoff "Global chrome" → Header).
 * `grid-template-columns: 208px 1fr auto` — the brand cell lines up with the nav.
 */

export interface HeaderProps {
  /** Opens the command palette (#7). */
  onOpenSearch: () => void
}

export function Header({ onOpenSearch }: HeaderProps) {
  const { store, role } = useModelStoreContext()
  const readOnly = role === 'reader'

  const saveFile = () => {
    downloadWorkspace(store.snapshot(), 'json')
    store.markSaved()
  }

  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__mark" aria-hidden="true" />
        <span className="header__wordmark">Archipelago</span>
        <span className="header__version">0.2</span>
      </div>

      <div className="header__centre">
        <button type="button" className="search-button" onClick={onOpenSearch}>
          <span className="search-button__glyph" aria-hidden="true" />
          <span className="search-button__label">Search elements, relations, actions</span>
          <span className="search-button__key">⌘K</span>
        </button>
        <div className="header__divider" aria-hidden="true" />
        <button
          type="button"
          className="header__action"
          disabled
          title="Importing a file lands with the import dialog and its error surface (#11)"
        >
          Import
        </button>
        <button
          type="button"
          className="header__action"
          onClick={() => downloadWorkspace(store.snapshot(), 'xml')}
          title="Export as ArchiMate Model Exchange Format XML"
        >
          Export
        </button>
      </div>

      <div className="header__right">
        <SaveStateIndicator onSaveFile={saveFile} disabled={readOnly} />
        <ThemeToggle />
      </div>
    </header>
  )
}
