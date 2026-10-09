import { useModelStoreContext } from '@/store'
import { useFileWorkspace } from '@/ui/files/context'
import { SaveStateIndicator } from './SaveStateIndicator'
import { ThemeToggle } from './ThemeToggle'
import { useUndoRedo } from './use-undo-redo'

/**
 * The 46px header (handoff "Global chrome" → Header).
 * `grid-template-columns: 208px 1fr auto` — the brand cell lines up with the nav.
 */

export interface HeaderProps {
  /** Opens the command palette (#7). */
  onOpenSearch: () => void
}

export function Header({ onOpenSearch }: HeaderProps) {
  // The tab's own lock: a model another person holds in a shared folder can
  // still be saved as a copy, or replaced by an import (#147).
  const { tabRole } = useModelStoreContext()
  const { save, startImport, fileName, hasHandle, canPickFiles, shared } = useFileWorkspace()
  const readOnly = tabRole === 'reader'
  const { undoLabel, redoLabel, undo, redo } = useUndoRedo()

  const saveTitle = shared.shared
    ? `Save to ${shared.shared.model} in ${shared.shared.folder.name}`
    : hasHandle
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
        <div className="header__divider" aria-hidden="true" />
        <button
          type="button"
          className="header__action"
          onClick={undo}
          disabled={!undoLabel}
          title={undoLabel ? `Undo: ${undoLabel}` : 'Nothing to undo'}
          aria-keyshortcuts="Meta+Z Control+Z"
        >
          Undo
        </button>
        <button
          type="button"
          className="header__action"
          onClick={redo}
          disabled={!redoLabel}
          title={redoLabel ? `Redo: ${redoLabel}` : 'Nothing to redo'}
          aria-keyshortcuts="Meta+Shift+Z Control+Shift+Z Control+Y"
        >
          Redo
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
