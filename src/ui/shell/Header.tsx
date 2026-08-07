import { useModelStoreContext } from '@/store'
import { useFileWorkspace } from '@/ui/files/context'
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
  const { role } = useModelStoreContext()
  const { save, startImport, fileName, hasHandle, canPickFiles } = useFileWorkspace()
  const readOnly = role === 'reader'

  const saveTitle = hasHandle
    ? `Save to ${fileName}`
    : canPickFiles
      ? 'Choose where to save this model'
      : 'Download this model as a file'

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
          onClick={startImport}
          disabled={readOnly}
          title="Import canonical JSON or ArchiMate exchange XML"
        >
          Import
        </button>
        <button
          type="button"
          className="header__action"
          onClick={() => void save('xml', { reuseHandle: false })}
          title="Export as ArchiMate Model Exchange Format XML"
        >
          Export
        </button>
      </div>

      <div className="header__right">
        <SaveStateIndicator
          onSaveFile={() => void save('json')}
          disabled={readOnly}
          title={saveTitle}
        />
        <ThemeToggle />
      </div>
    </header>
  )
}
