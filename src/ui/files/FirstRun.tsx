import { useFileWorkspace } from './context'
import './files.css'

/**
 * The first-run screen: **exactly three actions** (design brief, "Global UI
 * elements").
 *
 * Three is the point. An empty repository is the moment a tool either earns a
 * few more minutes or gets closed, and the answer to "what now?" has to fit on
 * one screen without a tour.
 */

export interface FirstRunProps {
  onStartEmpty: () => void
}

export function FirstRun({ onStartEmpty }: FirstRunProps) {
  const { startImport, loadDemo, canPickFiles } = useFileWorkspace()

  return (
    <div className="first-run">
      <div className="first-run__inner">
        <span className="first-run__mark" aria-hidden="true" />
        <h1 className="first-run__title">Archipelago</h1>
        <p className="first-run__lead">
          An Enterprise Architecture repository that runs entirely in this browser. Nothing is
          uploaded anywhere; your model lives here and in the files you export.
        </p>

        <div className="first-run__actions">
          <button type="button" className="first-run__action" onClick={onStartEmpty}>
            <span className="first-run__action-title">Start empty</span>
            <span className="first-run__action-help">
              Begin with a blank workspace and add elements as you go.
            </span>
          </button>

          <button type="button" className="first-run__action" onClick={startImport}>
            <span className="first-run__action-title">Import a file</span>
            <span className="first-run__action-help">
              Canonical JSON, or ArchiMate exchange XML from Archi.
              {canPickFiles && ' Saves write back to the same file.'}
            </span>
          </button>

          <button
            type="button"
            className="first-run__action first-run__action--primary"
            onClick={loadDemo}
          >
            <span className="first-run__action-title">Explore the demo</span>
            <span className="first-run__action-help">
              An insurance landscape with 29 elements, assessed and dated, to look around in.
            </span>
          </button>
        </div>

        <p className="first-run__note">
          {canPickFiles
            ? 'This browser can save straight into a folder on your machine — a git working copy, for instance.'
            : 'This browser saves by downloading a file. Chromium browsers can write back into a folder directly.'}
        </p>
      </div>
    </div>
  )
}
