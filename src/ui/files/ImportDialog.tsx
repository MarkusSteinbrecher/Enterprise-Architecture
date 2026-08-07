import { useEffect, useRef, useState } from 'react'
import { summariseProblems, type ImportProblem } from '@/io'
import { useFileWorkspace } from './context'

/**
 * The import dialog (issue #11), wrapped around the structured problems from #5.
 *
 * A model file is usually mostly right, so the dialog shows what came in *and*
 * what did not: an unknown element type, a relationship whose target was
 * deleted, the diagrams we do not read yet. Silently dropping any of those would
 * leave an architect wondering why their counts are wrong.
 */

export function ImportDialog() {
  const { importing, lastImport, importFile, openFile, cancelImport, canPickFiles } =
    useFileWorkspace()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!importing) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelImport()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [importing, cancelImport])

  if (!importing) return null

  const problems = lastImport?.problems ?? []
  const errors = problems.filter((p) => p.severity === 'error')
  const rest = problems.filter((p) => p.severity !== 'error')

  return (
    <div
      className="dialog-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancelImport()
      }}
    >
      <div className="dialog dialog--wide" role="dialog" aria-modal="true" aria-label="Import">
        <div className="dialog__title section-label">Import a model</div>

        <p className="dialog__help">
          Canonical JSON from Archipelago, or ArchiMate Model Exchange Format XML from Archi and
          other certified tools. Diagrams and folder structure are not imported.
        </p>

        <div className="dialog__actions dialog__actions--start">
          <input
            ref={inputRef}
            type="file"
            accept=".json,.xml,.archimate,application/json,application/xml"
            className="visually-hidden"
            aria-label="Choose a file to import"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              setBusy(true)
              await importFile(file)
              setBusy(false)
              event.target.value = ''
            }}
          />
          <button
            type="button"
            className="button button--primary"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Choose a file…
          </button>
          {canPickFiles && (
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => void openFile()}
              title="Open through the file picker so later saves write back to the same file"
            >
              Open and keep linked
            </button>
          )}
        </div>

        {lastImport && (
          <div className="import-report">
            <div className="import-report__head">
              {lastImport.workspace ? (
                <span>
                  {lastImport.workspace.elements.length} elements ·{' '}
                  {lastImport.workspace.relationships.length} relationships
                </span>
              ) : (
                <span>Nothing could be read from that file.</span>
              )}
              <span className="sheet__note">{summariseProblems(problems)}</span>
            </div>
            {[...errors, ...rest].length > 0 && (
              <ul className="import-report__list">
                {[...errors, ...rest].slice(0, 40).map((problem, index) => (
                  <ProblemRow key={`${problem.code}-${index}`} problem={problem} />
                ))}
                {problems.length > 40 && (
                  <li className="import-report__more">
                    …and {problems.length - 40} more of the same kind.
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        <div className="dialog__actions">
          <button type="button" className="button" onClick={cancelImport}>
            {lastImport?.workspace ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProblemRow({ problem }: { problem: ImportProblem }) {
  return (
    <li className={`import-report__row import-report__row--${problem.severity}`}>
      <span className="import-report__severity">{problem.severity}</span>
      <span>
        {problem.message}
        {problem.line !== undefined && <span className="sheet__note"> line {problem.line}</span>}
      </span>
    </li>
  )
}
