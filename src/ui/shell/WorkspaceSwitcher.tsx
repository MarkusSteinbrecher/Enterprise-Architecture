import { useEffect, useRef, useState } from 'react'
import { useModelSelector, useModelStoreContext } from '@/store'

/**
 * Workspace switcher (handoff: `WORKSPACE` label + a 32px button).
 *
 * Multi-workspace is a real feature of the store (#4), not a label: a consulting
 * architect runs one workspace per engagement in the same browser. Create,
 * rename and delete live here because there is nowhere else in the chrome for
 * them and a modal would be heavier than the job deserves.
 */

export function WorkspaceSwitcher() {
  const { store, workspaces, openWorkspace, createWorkspace, removeWorkspace, role } =
    useModelStoreContext()
  const name = useModelSelector((s) => s.name)
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const readOnly = role === 'reader'

  return (
    <div className="workspace" ref={container}>
      <button
        type="button"
        className="workspace__button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={name}
      >
        <span className="workspace__name">{name}</span>
        <span className="workspace__caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="workspace__menu" role="menu">
          {workspaces.map((meta) => (
            <button
              key={meta.id}
              type="button"
              role="menuitem"
              className={`workspace__option${meta.id === store.id ? ' workspace__option--current' : ''}`}
              onClick={() => {
                setOpen(false)
                void openWorkspace(meta.id)
              }}
            >
              <span className="workspace__name">{meta.name}</span>
              <span className="workspace__meta">{meta.elementCount}</span>
            </button>
          ))}
          {workspaces.length > 0 && <div className="workspace__menu-divider" />}

          <button
            type="button"
            role="menuitem"
            className="workspace__option workspace__command"
            disabled={readOnly}
            onClick={() => {
              setOpen(false)
              const chosen = window.prompt('Name for the new workspace', 'New workspace')
              if (chosen?.trim()) void createWorkspace(chosen.trim())
            }}
          >
            New workspace…
          </button>
          <button
            type="button"
            role="menuitem"
            className="workspace__option workspace__command"
            disabled={readOnly}
            onClick={() => {
              setOpen(false)
              const chosen = window.prompt('Rename this workspace', name)
              if (chosen?.trim()) store.rename(chosen.trim())
            }}
          >
            Rename…
          </button>
          <button
            type="button"
            role="menuitem"
            className="workspace__option workspace__command"
            disabled={readOnly || workspaces.length === 0}
            onClick={() => {
              setOpen(false)
              if (window.confirm(`Delete “${name}” from this browser? This cannot be undone.`)) {
                void removeWorkspace(store.id)
              }
            }}
          >
            Delete…
          </button>
        </div>
      )}
    </div>
  )
}
