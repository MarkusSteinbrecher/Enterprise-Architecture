import { useEffect } from 'react'
import { useFileWorkspace } from './context'
import './files.css'

/**
 * A one-line confirmation after a save or a failed one.
 *
 * The save-state indicator says whether there is anything unsaved; this says
 * *where it went*, which the indicator cannot, and then gets out of the way.
 * Nothing else in the app is allowed to be a toast.
 */

const DISMISS_AFTER_MS = 4_000

export function SaveNotice() {
  const { notice, dismissNotice } = useFileWorkspace()

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(dismissNotice, DISMISS_AFTER_MS)
    return () => clearTimeout(timer)
  }, [notice, dismissNotice])

  if (!notice) return null

  return (
    <div className="notice" role="status">
      <span>{notice}</span>
      <button type="button" className="notice__dismiss" onClick={dismissNotice}>
        DISMISS
      </button>
    </div>
  )
}
