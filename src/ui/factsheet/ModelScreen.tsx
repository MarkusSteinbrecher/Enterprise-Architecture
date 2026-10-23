import { useEffect, useState } from 'react'
import { useModelSelector, useModelStoreContext } from '@/store'
import { DocumentationSection } from './sections'
import './factsheet.css'

/**
 * The model's own sheet (#171): its name and documentation, as Archi's
 * Properties view shows them when the model is selected in its tree (Archi
 * calls the documentation "Purpose"). The model tree's top entry opens it.
 *
 * As on the element fact sheet, Edit turns the text into fields that commit on
 * leaving them, so each edit is one command: `rename-workspace` for the name,
 * `document-workspace` for the documentation, where clearing it removes it.
 */
export function ModelScreen() {
  const { store, role } = useModelStoreContext()
  const [editing, setEditing] = useState(false)
  // Edit mode opened as a writer ends when the tab becomes a reader, and does
  // not reopen if the tab can write again (#195).
  useEffect(() => {
    if (role === 'reader') setEditing(false)
  }, [role])
  const model = useModelSelector((s) => ({
    id: s.id,
    name: s.name,
    documentation: s.documentation,
    elements: s.elementCount,
    relationships: s.relationshipCount,
    views: s.viewCount,
  }))
  const readOnly = role === 'reader'

  return (
    <div className="sheet">
      <div className="sheet__header">
        <div className="sheet__breadcrumb">
          <span>MODEL</span>
          <span aria-hidden="true">/</span>
          <span>{model.id}</span>
        </div>

        <div className="sheet__title-row">
          <div className="sheet__identity">
            <div style={{ minWidth: 0 }}>
              {editing ? (
                <input
                  // Keyed on the name so an undo or redo shows here (#88).
                  key={model.name}
                  className="sheet__title-input"
                  aria-label="Name"
                  defaultValue={model.name}
                  onBlur={(event) => {
                    // An empty name is a slip: the model keeps its own.
                    const name = event.target.value.trim()
                    if (name) store.rename(name)
                    else event.target.value = model.name
                  }}
                />
              ) : (
                <h1 className="sheet__title">{model.name}</h1>
              )}
              <div className="sheet__meta">
                <span className="sheet__type">Model</span>
                <span className="sheet__meta-divider" aria-hidden="true" />
                <span className="sheet__counts" data-testid="model-counts">
                  {model.elements} elements · {model.relationships} relationships · {model.views}{' '}
                  views
                </span>
              </div>
            </div>
          </div>

          <div className="sheet__actions">
            <button
              type="button"
              className="button button--primary"
              disabled={readOnly}
              onClick={() => setEditing((was) => !was)}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
          </div>
        </div>
      </div>

      <div className="sheet__body sheet__body--single">
        <div className="sheet__main">
          <DocumentationSection
            documentation={model.documentation}
            editing={editing}
            placeholder="What does this model describe, and for whom?"
            onChange={(documentation) => store.document(documentation)}
          />
        </div>
      </div>
    </div>
  )
}
