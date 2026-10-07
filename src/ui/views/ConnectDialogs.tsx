import { useEffect, useRef, useState } from 'react'
import {
  relationshipTypeMeta,
  typeLabel,
  type Element,
  type Relationship,
  type RelationshipType,
  type View,
} from '@/model'
import { useFocusTrap } from '@/ui/common/use-focus-trap'
import type { ConnectChoice } from './connect'
import type { Nesting, NestingChoices, NestingOption } from './nesting'

/**
 * The dialogs of connecting (#129): the menu a connect gesture ends in, the
 * confirmation before a relationship leaves the model, and the question a
 * nesting asks (#131). All are modal, as the fact sheet's relation picker is:
 * focus enters, stays, and goes back to the canvas, and Escape cancels.
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
                {choice.why} Nothing was created.
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

export interface DeleteElementDialogProps {
  element: Element
  /** How many relationships go with it. */
  relations: number
  /** The views drawing it other than this one. */
  elsewhere: readonly View[]
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Archi's "Delete from Model" for a shape (#130): the element goes, with every
 * relationship it has and every drawing of it, so the dialog says how many
 * relationships and names the other views that lose a drawing.
 */
export function DeleteElementDialog({
  element,
  relations,
  elsewhere,
  onConfirm,
  onCancel,
}: DeleteElementDialogProps) {
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
        aria-label="Delete element from the model"
        ref={ref}
      >
        <div className="dialog__title section-label">Delete from model</div>
        <p className="connect-menu__text">
          {typeLabel(element.type)} “{element.name}” leaves the model
          {relations > 0
            ? `, with its ${relations} relationship${relations === 1 ? '' : 's'},`
            : ''}{' '}
          and every view that draws it.
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

function named(element: Element): string {
  return element.name || typeLabel(element.type)
}

/** One option, as the nesting prompt lists it: the type, and the relationship's two ends. */
function OptionText({ option }: { option: NestingOption }) {
  return (
    <>
      <TypeName type={option.type} />
      <span className="connect-menu__note">
        {named(option.source)} → {named(option.target)}
      </span>
    </>
  )
}

export interface NestingDialogProps {
  nesting: Nesting
  /** Every child asked about, with its answer; `null` is none. */
  onDone: (choices: NestingChoices) => void
}

/**
 * Archi's "Nested Elements Relationship" (#131): which relationship nesting a
 * shape in an element's shape means. One child is asked with a list, first
 * option first in line, as Archi preselects it; several children are asked
 * with a row each, every row set to its first option. "None", Escape or a
 * press outside nests the shapes and makes nothing, as Archi's None does.
 */
export function NestingDialog({ nesting, onDone }: NestingDialogProps) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref)
  const none = () => onDone(new Map(nesting.ask.map((child) => [child.node, null])))
  useEscape(none)
  const [rows, setRows] = useState<ReadonlyMap<string, number>>(
    () => new Map(nesting.ask.map((child) => [child.node, 0])),
  )
  const single = nesting.ask.length === 1 ? nesting.ask[0] : undefined
  const parent = named(nesting.element)
  return (
    <div
      className="dialog-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return
        // The press's own default would focus what is under it once the
        // overlay is gone: nothing, so `<body>`, after the answer has put focus
        // on the canvas or the new element's name (#156 review).
        event.preventDefault()
        none()
      }}
    >
      <div
        className="dialog connect-menu"
        role="dialog"
        aria-modal="true"
        aria-label={`Nested in ${parent}`}
        ref={ref}
      >
        <div className="dialog__title section-label">Nested relationship</div>
        {single ? (
          <>
            <p className="connect-menu__text">
              “{named(single.element)}” is now inside “{parent}”. Choose the relationship this
              nesting means, or none.
            </p>
            <section className="connect-menu__group" aria-label="New relationship">
              {single.options.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  className="connect-menu__item"
                  onClick={() => onDone(new Map([[single.node, option]]))}
                >
                  <OptionText option={option} />
                </button>
              ))}
            </section>
          </>
        ) : (
          <>
            <p className="connect-menu__text">
              These are now inside “{parent}”. Choose the relationship each nesting means, or none.
            </p>
            <div className="connect-menu__group">
              {nesting.ask.map((child) => (
                <label key={child.node} className="dialog__field">
                  <span className="dialog__label">{named(child.element)}</span>
                  <select
                    className="dialog__control"
                    value={rows.get(child.node) ?? -1}
                    onChange={(event) =>
                      setRows((current) =>
                        new Map(current).set(child.node, Number(event.target.value)),
                      )
                    }
                  >
                    <option value={-1}>(none)</option>
                    {child.options.map((option, index) => (
                      <option key={option.type} value={index}>
                        {option.type}: {named(option.source)} → {named(option.target)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </>
        )}
        <div className="dialog__actions">
          <button type="button" className="button" onClick={none}>
            None
          </button>
          {!single && (
            <button
              type="button"
              className="button button--primary"
              onClick={() =>
                onDone(
                  new Map(
                    nesting.ask.map((child) => [
                      child.node,
                      child.options[rows.get(child.node) ?? -1] ?? null,
                    ]),
                  ),
                )
              }
            >
              Create
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
