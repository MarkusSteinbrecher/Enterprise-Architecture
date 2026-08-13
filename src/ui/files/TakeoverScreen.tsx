import { useState } from 'react'
import { useModelStoreContext } from '@/store'
import './files.css'

/**
 * The screen a second tab shows (issue #11, concept §5.2).
 *
 * Two tabs autosaving the same workspace would interleave writes and lose edits
 * silently, so only one tab is the writer. The other one says so plainly and
 * offers to take over — polite, full-screen, and never a data race. Read-only is
 * a state worth naming rather than a set of mysteriously disabled buttons.
 */

export function TakeoverScreen() {
  const { takeOver } = useModelStoreContext()
  const [taking, setTaking] = useState(false)

  return (
    <div className="takeover">
      <div className="takeover__inner">
        <span className="section-label">Read-only</span>
        <h1 className="takeover__title">This model is open in another tab</h1>
        <p className="takeover__lead">
          Only one tab may write to a workspace at a time — otherwise two tabs would save over each
          other and the losing edits would vanish without a word. This tab can show the model, but
          it will not save changes.
        </p>
        <button
          type="button"
          className="button button--primary"
          disabled={taking}
          onClick={async () => {
            setTaking(true)
            await takeOver()
            setTaking(false)
          }}
        >
          {taking ? 'Taking over…' : 'Take over here'}
        </button>
        <p className="takeover__note">
          The other tab keeps its unsaved changes in memory; it just stops saving them. Save from
          whichever tab you end up working in.
        </p>
      </div>
    </div>
  )
}
