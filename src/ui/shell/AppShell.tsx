import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { usePalette } from '@/ui/palette/context'
import { ModelTree } from '@/ui/tree/ModelTree'
import { Header } from './Header'
import { LeftNav } from './LeftNav'
import './shell.css'

/**
 * The frame every screen lives in: 46px header, 208px nav, content well.
 * Handoff: `grid-template-rows: 46px 1fr` over `grid-template-columns: 208px 1fr`.
 *
 * The model tree (#80) is a panel between the nav and the content, as in Archi,
 * so it stays beside whatever it opened. Whether it is shown is a per-browser
 * convenience, so it lives in localStorage and survives without it.
 */

export const TREE_OPEN_STORAGE_KEY = 'archipelago.tree-open'
const TREE_ID = 'model-tree'

function readTreeOpen(): boolean {
  try {
    return localStorage.getItem(TREE_OPEN_STORAGE_KEY) !== 'false'
  } catch {
    // Storage can be blocked (private mode, third-party cookie policies).
    return true
  }
}

export function AppShell() {
  const { openPalette } = usePalette()
  const [treeOpen, setTreeOpen] = useState(readTreeOpen)
  const toggleTree = useCallback(() => {
    setTreeOpen((open) => {
      try {
        localStorage.setItem(TREE_OPEN_STORAGE_KEY, String(!open))
      } catch {
        // The panel still toggles; it just will not be remembered.
      }
      return !open
    })
  }, [])

  return (
    <div className="shell">
      <Header onOpenSearch={openPalette} />
      <div className={`shell__body${treeOpen ? ' shell__body--tree' : ''}`}>
        <LeftNav treeOpen={treeOpen} treeId={TREE_ID} onToggleTree={toggleTree} />
        {treeOpen && <ModelTree id={TREE_ID} />}
        <main className="shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
