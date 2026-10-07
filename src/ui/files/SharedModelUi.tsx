import { useRef, useState } from 'react'
import { DialogOverlay } from '@/ui/common/DialogOverlay'
import { useFocusTrap } from '@/ui/common/use-focus-trap'
import { useModelSelector } from '@/store'
import { useFileWorkspace } from './context'
import type { Refusal, SharedModelState } from './use-shared-model'
import './shared-folder.css'

/**
 * What a model in a shared folder shows (#147, spec §6.2, §8, §9): the strip
 * that says who may edit it, the dialog a refused save opens, and the notice
 * that the file changed under this tab's lock. The decisions are the session's;
 * these only say them and offer what the spec offers.
 */

/** Above the screen, while a model from a shared folder is open. */
export function SharedModelBanner() {
  const { shared: model } = useFileWorkspace()
  const dirty = useModelSelector((store) => store.dirty)
  const [confirm, setConfirm] = useState<'takeover' | 'unlock' | undefined>(undefined)
  const shared = model.shared
  if (!shared) return null

  return (
    <section className="shared-banner" aria-label="Shared model">
      <div className="shared-banner__line">
        <span className="shared-banner__text" role="status">
          <Status shared={shared} dirty={dirty} />
        </span>
        <span className="shared-banner__actions">
          {shared.phase === 'reader' && shared.reader?.kind === 'free' && (
            <button
              type="button"
              className="button button--primary"
              onClick={() => void model.edit()}
            >
              Edit
            </button>
          )}
          {shared.phase === 'reader' && dirty > 0 && (
            <button type="button" className="button" onClick={() => void model.saveAsCopy()}>
              Save as copy
            </button>
          )}
          {shared.phase === 'reader' && shared.reader?.kind === 'held' && (
            <>
              {shared.reader.stale && (
                <button type="button" className="button" onClick={() => setConfirm('takeover')}>
                  Take over…
                </button>
              )}
              <button type="button" className="button" onClick={() => setConfirm('unlock')}>
                Unlock…
              </button>
            </>
          )}
          <button type="button" className="button" onClick={() => void model.close()}>
            Close
          </button>
        </span>
      </div>

      {confirm && (
        <div className="shared-banner__confirm" role="group" aria-label="Confirm">
          <p className="shared-folder__note">
            {confirm === 'takeover'
              ? 'Take this model over? Whoever held it may only be offline and still editing; their work would then come back as a conflict copy. This is logged in the folder.'
              : 'Remove the lock? Whoever holds it can no longer save to this model, only a copy. This is logged in the folder.'}
          </p>
          <span className="shared-banner__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                setConfirm(undefined)
                void (confirm === 'takeover' ? model.takeOver() : model.unlock())
              }}
            >
              {confirm === 'takeover' ? 'Take over' : 'Unlock'}
            </button>
            <button type="button" className="button" onClick={() => setConfirm(undefined)}>
              Cancel
            </button>
          </span>
        </div>
      )}

      {shared.conflicts.length > 0 && (
        <div className="shared-banner__conflicts" aria-label="Possible conflict copies">
          <p className="shared-folder__note">
            {shared.conflicts.length === 1 ? '1 file' : `${shared.conflicts.length} files`} may be a
            conflicting copy of {shared.model} kept by the sync client. Open it to compare.
          </p>
          <ul className="shared-folder__list">
            {shared.conflicts.map((copy) => (
              <li key={copy.name} className="shared-folder__row">
                <span className="shared-folder__file">{copy.name}</span>
                <button
                  type="button"
                  className="button"
                  aria-label={`Dismiss ${copy.name}`}
                  onClick={() => void model.dismissConflict(copy.name)}
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function Status({ shared, dirty }: { shared: SharedModelState; dirty: number }) {
  const name = <span className="shared-folder__file">{shared.model}</span>
  if (shared.phase === 'acquiring') return <>Taking {name} for editing…</>
  if (shared.phase === 'writer') {
    return (
      <>
        Editing {name} in {shared.folder.name}. Others see it read-only.
      </>
    )
  }
  const reader = shared.reader
  if (reader?.kind === 'lost' || reader?.kind === 'fenced') {
    return (
      <>
        You no longer hold {name}
        {reader.kind === 'lost' && reader.by ? `: ${reader.by.displayName} took it over` : ''}.
        {dirty > 0 ? ' Your edits are kept here; save them as a copy.' : ''}
      </>
    )
  }
  if (reader?.kind === 'free') return <>{name} is free to edit.</>
  if (reader?.kind === 'unknown')
    return (
      <>
        {name} is read-only: {reader.message}
      </>
    )
  if (reader?.kind === 'held') {
    const owner = reader.owner?.displayName
    const quiet = Math.floor(reader.quietForMs / 60_000)
    const who =
      owner === undefined
        ? 'locked, owner unknown'
        : owner === shared.displayName
          ? `locked by you (${owner}) in another browser or on another machine`
          : `${owner} is editing it`
    return (
      <>
        {name} is read-only: {who}.
        {reader.stale ? ` No sign of life for ${quiet} minutes: the lock looks abandoned.` : ''}
      </>
    )
  }
  return <>{name} is read-only.</>
}

const REFUSALS: Record<Refusal['reason'], { title: string; text: string }> = {
  'file-changed': {
    title: 'The file changed on disk',
    text: 'Someone saved it since you opened it, or the sync client replaced it. Saving now would overwrite their version.',
  },
  'file-missing': {
    title: 'The file is gone from the folder',
    text: 'It was moved, renamed or deleted since you opened it.',
  },
  'file-unreadable': {
    title: 'The file could not be read',
    text: 'The sync client may be holding it. Try again in a moment, or keep your work in a copy.',
  },
  'lock-lost': {
    title: 'You no longer hold this model',
    text: 'Someone else holds its lock now. Your edits are kept here.',
  },
  'lock-unreadable': {
    title: 'The lock could not be read',
    text: 'Without it, this save cannot be shown to be yours to make.',
  },
  reader: {
    title: 'This model is read-only here',
    text: 'You do not hold its lock, so it cannot be saved over. Your work can go into a copy.',
  },
}

/** A refused save (spec §6.2): save as copy, reload, or overwrite after a second confirmation. */
export function SharedSaveDialog() {
  const { shared: model } = useFileWorkspace()
  const refusal = model.refusal
  if (!refusal || !model.shared) return null
  return <RefusalBody refusal={refusal} name={model.shared.model} />
}

function RefusalBody({ refusal, name }: { refusal: Refusal; name: string }) {
  const { shared: model } = useFileWorkspace()
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref)
  const [sure, setSure] = useState(false)
  const { title, text } = REFUSALS[refusal.reason]
  return (
    <DialogOverlay onDismiss={model.dismissRefusal}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={sure ? `Overwrite ${name}` : title}
        ref={ref}
        onKeyDown={(event) => {
          if (event.key === 'Escape') model.dismissRefusal()
        }}
      >
        <div className="dialog__title section-label">{sure ? `Overwrite ${name}` : title}</div>
        {sure ? (
          <p className="dialog__help">
            The version on disk will be replaced by yours, and whatever it holds that yours does not
            is lost from {name}. This is logged in the folder.
          </p>
        ) : (
          <p className="dialog__help">
            <span className="shared-folder__file">{name}</span>: {text} Nothing was saved.
          </p>
        )}
        <div className="dialog__actions">
          {sure ? (
            <>
              <button type="button" className="button" onClick={() => setSure(false)}>
                Back
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => void model.overwrite()}
              >
                Overwrite
              </button>
            </>
          ) : (
            <>
              <button type="button" className="button" onClick={model.dismissRefusal}>
                Cancel
              </button>
              {refusal.canOverwrite && (
                <button type="button" className="button" onClick={() => setSure(true)}>
                  Overwrite anyway…
                </button>
              )}
              <button type="button" className="button" onClick={() => void model.reload()}>
                Discard my changes and reload
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => void model.saveAsCopy()}
              >
                Save as copy
              </button>
            </>
          )}
        </div>
      </div>
    </DialogOverlay>
  )
}

/** The file changed under this tab's lock (spec §8.2): blocking, until the user chooses. */
export function DivergedNotice() {
  const { shared: model } = useFileWorkspace()
  if (!model.divergedNotice || !model.shared) return null
  return <DivergedBody shared={model.shared} />
}

function DivergedBody({ shared }: { shared: SharedModelState }) {
  const { shared: model } = useFileWorkspace()
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref)
  return (
    <DialogOverlay onDismiss={model.dismissDivergedNotice}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${shared.model} changed on disk`}
        ref={ref}
        onKeyDown={(event) => {
          if (event.key === 'Escape') model.dismissDivergedNotice()
        }}
      >
        <div className="dialog__title section-label">{shared.model} changed on disk</div>
        <p className="dialog__help">
          {shared.model} changed on disk while you held it for editing. Your last save may have been
          moved to a conflicting copy by the sync client. Your work is still open here, and is not
          saved to the file until you choose.
        </p>
        {shared.conflicts.length > 0 && (
          <ul className="shared-folder__list">
            {shared.conflicts.map((copy) => (
              <li key={copy.name} className="shared-folder__row">
                <span className="shared-folder__file">{copy.name}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="dialog__actions">
          <button type="button" className="button" onClick={model.dismissDivergedNotice}>
            Keep editing
          </button>
          <button type="button" className="button" onClick={() => void model.reload()}>
            Discard my changes and reload
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => void model.saveAsCopy()}
          >
            Save as copy
          </button>
        </div>
      </div>
    </DialogOverlay>
  )
}
