import { useEffect, useMemo, useState } from 'react'
import {
  RELATIONSHIP_TYPE_NAMES,
  typeLabel,
  validateRelationship,
  type Element,
  type RelationshipType,
} from '@/model'

/**
 * The relation picker (handoff: `+ add` on a relations block).
 *
 * It enforces the ArchiMate validity matrix *and explains itself*. Silently
 * hiding invalid targets would leave an architect wondering why the element they
 * want is missing; showing the rule is how the tool teaches the notation instead
 * of just policing it.
 */

export interface AddRelationDialogProps {
  source: Element
  candidates: Element[]
  /** Pre-selected relationship type, from the block the user clicked. */
  initialType: RelationshipType
  onCancel: () => void
  onAdd: (type: RelationshipType, targetId: string, direction: 'outgoing' | 'incoming') => void
}

export function AddRelationDialog({
  source,
  candidates,
  initialType,
  onCancel,
  onAdd,
}: AddRelationDialogProps) {
  const [type, setType] = useState<RelationshipType>(initialType)
  const [direction, setDirection] = useState<'outgoing' | 'incoming'>('outgoing')
  const [targetId, setTargetId] = useState('')

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  /** Every candidate, each with the verdict for the current type and direction. */
  const checked = useMemo(
    () =>
      candidates.map((candidate) => ({
        element: candidate,
        result:
          direction === 'outgoing'
            ? validateRelationship(source.type, type, candidate.type)
            : validateRelationship(candidate.type, type, source.type),
      })),
    [candidates, source.type, type, direction],
  )

  const selected = checked.find((entry) => entry.element.id === targetId)
  const canAdd = Boolean(selected?.result.valid)

  return (
    <div
      className="dialog-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Add relation">
        <div className="dialog__title section-label">Add relation</div>

        <label className="dialog__field">
          <span className="dialog__label">Relationship</span>
          <select
            className="dialog__control"
            value={type}
            onChange={(event) => setType(event.target.value as RelationshipType)}
          >
            {RELATIONSHIP_TYPE_NAMES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="dialog__field">
          <span className="dialog__label">Direction</span>
          <select
            className="dialog__control"
            value={direction}
            onChange={(event) => setDirection(event.target.value as 'outgoing' | 'incoming')}
          >
            <option value="outgoing">{`${source.name} → target`}</option>
            <option value="incoming">{`target → ${source.name}`}</option>
          </select>
        </label>

        <label className="dialog__field">
          <span className="dialog__label">Element</span>
          <select
            className="dialog__control"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          >
            <option value="">Choose an element…</option>
            {checked.map(({ element, result }) => (
              <option key={element.id} value={element.id}>
                {`${element.name} · ${typeLabel(element.type)}${result.valid ? '' : ' (not permitted)'}`}
              </option>
            ))}
          </select>
        </label>

        {selected && !selected.result.valid && (
          <p className="dialog__problem" role="alert">
            {selected.result.reason}
          </p>
        )}

        <div className="dialog__actions">
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!canAdd}
            onClick={() => targetId && onAdd(type, targetId, direction)}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
