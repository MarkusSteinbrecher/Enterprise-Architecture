import { LIFECYCLE_PHASE_LABELS, typeLabel, type Element } from '@/model'
import { TypeCodeBadge } from '@/ui/common/TypeCodeBadge'
import { CompletenessBar, LifecycleDot, TimeChip } from '@/ui/common/meters'
import { lifecycleOf } from './facets'
import { LIST_WINDOW } from './list-window'

/**
 * Cards view (handoff "Screen 1 — Cards view").
 *
 * `repeat(auto-fill, minmax(258px, 1fr))`. It carries less signal per element
 * than the table by design — code, name, type, phase, TIME, completeness — and is
 * the right shape when scanning a small filtered set rather than a landscape.
 * Whether it earns its place next to the table is UI spec open question 1.
 *
 * Above `LIST_WINDOW` it shows the first window and says how many it is showing,
 * pointing at the table for the rest. It used to render whatever it was given,
 * so `?view=cards` on a 5,000-element workspace mounted 5,000 buttons and froze
 * the tab — the table's virtualiser never covered this view.
 */

export interface InventoryCardsProps {
  elements: Element[]
  at: number
  completenessOf: (id: string) => number
  onOpen: (id: string) => void
  /** Switch to the table, offered when the window hides some. */
  onShowTable?: () => void
}

export function InventoryCards({
  elements,
  at,
  completenessOf,
  onOpen,
  onShowTable,
}: InventoryCardsProps) {
  if (elements.length === 0) {
    return (
      <p className="table__empty">
        No elements match this filter.
        <br />
        Loosen a facet or switch the combinator to OR.
      </p>
    )
  }

  const shown = elements.length > LIST_WINDOW ? elements.slice(0, LIST_WINDOW) : elements

  return (
    <>
      {shown.length < elements.length && (
        <p className="list-window">
          Showing {shown.length} of {elements.length} matches.{' '}
          {onShowTable ? (
            <button type="button" className="list-window__action" onClick={onShowTable}>
              Switch to the table
            </button>
          ) : (
            'Switch to the table'
          )}{' '}
          to scan them all, or narrow the filter.
        </p>
      )}
      <div className="cards">
        {shown.map((element) => {
          const phase = lifecycleOf(element, at)
          const completeness = completenessOf(element.id)
          return (
            <button
              key={element.id}
              type="button"
              className="card"
              onClick={() => onOpen(element.id)}
            >
              <span className="card__head">
                <TypeCodeBadge type={element.type} size={22} />
                <span className="card__percent">{completeness}%</span>
              </span>
              <span className="card__name">{element.name}</span>
              <span className="card__type">{typeLabel(element.type)}</span>
              <span className="card__meta">
                <LifecycleDot phase={phase} />
                <span className="card__phase">{LIFECYCLE_PHASE_LABELS[phase]}</span>
                <TimeChip value={element.profile?.timeClassification} />
              </span>
              <CompletenessBar score={completeness} />
            </button>
          )
        })}
      </div>
    </>
  )
}
