import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toggleTheme } from '@/app/theme'
import { downloadWorkspace } from '@/io'
import { useModelStoreContext } from '@/store'
import { CommandPalette, type PaletteAction } from './CommandPalette'
import { PaletteContext } from './context'
import { isTypingTarget } from './typing-target'

/**
 * Owns palette visibility and the global keyboard bindings.
 *
 * `⌘K` / `Ctrl+K` opens (clearing the query — the palette is remounted, so the
 * query cannot survive), `Esc` closes, and bare `g` / `i` jump to the graph and
 * the inventory. Those single-letter bindings are suppressed while the palette is
 * open *and* while any text input has focus, which is the handoff's known
 * prototype gap #1.
 */

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { store } = useModelStoreContext()

  const openPalette = useCallback(() => setOpen(true), [])
  const closePalette = useCallback(() => setOpen(false), [])

  const actions = useMemo<PaletteAction[]>(
    () => [
      { id: 'inventory', label: 'Go to inventory', glyph: 'IN', run: () => navigate('/inventory') },
      { id: 'graph', label: 'Go to graph', glyph: 'GR', run: () => navigate('/graph') },
      { id: 'theme', label: 'Toggle theme', glyph: 'TH', run: () => void toggleTheme() },
      {
        id: 'save',
        label: 'Save file',
        glyph: 'SV',
        run: () => {
          downloadWorkspace(store.snapshot(), 'json')
          store.markSaved()
        },
      },
    ],
    [navigate, store],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault()
        setOpen(true)
        return
      }
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }

      // Everything below is a bare single-letter binding.
      if (open) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      if (key === 'g') navigate('/graph')
      else if (key === 'i') navigate('/inventory')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, navigate])

  const value = useMemo(
    () => ({ open, openPalette, closePalette }),
    [open, openPalette, closePalette],
  )

  return (
    <PaletteContext.Provider value={value}>
      {children}
      {open && (
        <CommandPalette
          onClose={closePalette}
          onOpenElement={(id) => navigate(`/element/${id}`)}
          actions={actions}
        />
      )}
    </PaletteContext.Provider>
  )
}
