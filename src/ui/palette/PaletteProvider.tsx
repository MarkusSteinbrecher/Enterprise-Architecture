import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toggleTheme } from '@/app/theme'
import { useSaveWorkspace } from '@/ui/shell/use-save-workspace'
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
  const { saveFile } = useSaveWorkspace()

  const openPalette = useCallback(() => setOpen(true), [])
  const closePalette = useCallback(() => setOpen(false), [])

  const actions = useMemo<PaletteAction[]>(
    () => [
      { id: 'inventory', label: 'Go to inventory', glyph: 'IN', run: () => navigate('/inventory') },
      { id: 'graph', label: 'Go to graph', glyph: 'GR', run: () => navigate('/graph') },
      { id: 'theme', label: 'Toggle theme', glyph: 'TH', run: () => void toggleTheme() },
      // Through the one owner, not a second copy of it. This action used to
      // inline the download and the `markSaved()` — the header's bug, reproduced
      // by copy-paste — and drop the reader-role guard the header applies, so a
      // tab demoted to reader (whose edits are memory-only, since its autosaver
      // is disabled) could still zero the one indicator that would have said so.
      { id: 'save', label: 'Save file', glyph: 'SV', run: () => void saveFile() },
    ],
    [navigate, saveFile],
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
