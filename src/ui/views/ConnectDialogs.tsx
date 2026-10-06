import { useEffect, useRef } from 'react'
import {
  relationshipTypeMeta,
  typeLabel,
  type Element,
  type Relationship,
  type RelationshipType,
  type View,
} from '@/model'
import { useFocusTrap } from '@/ui/common/use-focus-trap'
import { nothingAllowed, type ConnectChoice } from './connect'

/**
 * The two dialogs of connecting (#129): the menu a connect gesture ends in, and
 * the confirmation before a relationship leaves the model. Both are modal, as
 * the fact sheet's relation picker is: focus enters, stays, and goes back to the
 * canvas, and Escape cancels.
 */

function useEscape(onCancel: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])
}

function Ends({ source, target }: { source: Element; target: Element }) {
  return (
    <p className="connect-menu__ends">
      <span>{source.name || typeLabel(source.type)}</span>
      <span className="connect-menu__arrow" aria-hidden="true">
        →
      </span>
      <span>{target.name || typeLabel(target.type)}</span>
    </p>
  )
}

function TypeName({ type }: { type: RelationshipType }) {
  return (
    <>
      <span className="connect-menu__abbr">{relationshipTypeMeta(type).abbr}</span>
      <span className="connect-menu__type">{type}</span>
    </>
  )
}

export interface ConnectMenuProps {
  choice: Extract<ConnectChoice, { kind: 'relationship' | 'refused' }>
  onCreate: (type: RelationshipType) => void
  onReuse: (relationship: Relationship) => void
  onCancel: () => void
}

/**
 * What to draw between two element shapes: only the types ArchiMate allows
 * from the one to the other, and any relationship of the model between them
 * that this view does not draw yet. With nothing allowed, it says so and offers
 * nothing to choose.
 */
export function ConnectMenu({ choice, onCreate, onReuse, onCancel }: ConnectMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref)
  useEscape(onCancel)
  const label =
    choice.kind === 'relationship'
      ? `Connect ${choice.source.name || typeLabel(choice.source.type)} to ${choice.target.name || typeLabel(choice.target.type)}`
      : 'Connect'
  return (
    <div
      className="dialog-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        className="dialog connect-menu"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        ref={ref}
      >
        <div className="dialog__title section-label">Connect</div>
        {choice.kind === 'refused' ? (
          <p className="dialog__problem" role="alert">
            {choice.reason}
          </p>
        ) : (
          <>
            <Ends source={choice.source} target={choice.target} />
            {choice.existing.length > 0 && (
              <section className="connect-menu__group" aria-label="Already in the model">
                <div className="dialog__label">Already in the model</div>
                {choice.existing.map((relationship) => (
                  <button
                    key={relationship.id}
                    type="button"
                    className="connect-menu__item"
                    onClick={() => onReuse(relationship)}
                  >
                    <TypeName type={relationship.type} />
                    <span className="connect-menu__note">
                      {relationship.name ? `“${relationship.name}”, ` : ''}draw it here
                    </span>
                  </button>
                ))}
              </section>
            )}
            {choice.types.length > 0 ? (
              <section className="connect-menu__group" aria-label="New relationship">
                <div className="dialog__label">New relationship</div>
                {choice.types.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="connect-menu__item"
                    onClick={() => onCreate(type)}
                  >
                    <TypeName type={type} />
                  </button>
                ))}
              </section>
            ) : (
              <p className="dialog__problem" role="alert">
                {nothingAllowed(choice.source, choice.target)} Nothing was created.
              </p>
            )}
          </>
        )}
        <div className="dialog__actions">
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export interface DeleteRelationshipDialogProps {
  relationship: Relationship
  /** The views drawing it other than this one. */
  elsewhere: readonly View[]
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Archi's "Delete from Model" for a connection: the relationship goes, and with
 * it every drawing of it, so the dialog names the other views that lose one.
 */
export function DeleteRelationshipDialog({
  relationship,
  elsewhere,
  onConfirm,
  onCancel,
}: DeleteRelationshipDialogProps) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref)
  useEscape(onCancel)
  return (
    <div
      className="dialog-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Delete relationship from the model"
        ref={ref}
      >
        <div className="dialog__title section-label">Delete from model</div>
        <p className="connect-menu__text">
          The <span className="connect-menu__type">{relationship.type}</span> relationship
          {relationship.name ? ` “${relationship.name}”` : ''} leaves the model, and every view that
          draws it.
        </p>
        {elsewhere.length > 0 ? (
          <div className="dialog__field">
            <div className="dialog__label">Also drawn in</div>
            <ul className="connect-menu__views">
              {elsewhere.map((view) => (
                <li key={view.id}>{view.name}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="connect-menu__text">No other view draws it.</p>
        )}
        <div className="dialog__actions">
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="button button--primary" onClick={onConfirm}>
            Delete from model
          </button>
        </div>
      </div>
    </div>
  )
}
