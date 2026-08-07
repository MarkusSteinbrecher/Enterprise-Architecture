import { LIFECYCLE_PHASE_LABELS, typeLabel, type Element } from '@/model'
import { TypeCodeBadge } from '@/ui/common/TypeCodeBadge'
import { CompletenessBar, LifecycleDot, TimeChip } from '@/ui/common/meters'
import { lifecycleOf } from './facets'

/**
 * Cards view (handoff "Screen 1 — Cards view").
 *
 * `repeat(auto-fill, minmax(258px, 1fr))`. It carries less signal per element
 * than the table by design — code, name, type, phase, TIME, completeness — and is
 * the right shape when scanning a small filtered set rather than a landscape.
 * Whether it earns its place next to the table is UI spec open question 1.
 */

export interface InventoryCardsProps {
  elements: Element[]
  at: number
  completenessOf: (id: string) => number
  onOpen: (id: string) => void
}

export function InventoryCards({ elements, at, completenessOf, onOpen }: InventoryCardsProps) {
  if (elements.length === 0) {
    return (
      <p className="table__empty">
        No elements match this filter.
        <br />
        Loosen a facet or switch the combinator to OR.
      </p>
    )
  }

  return (
    <div className="cards">
      {elements.map((element) => {
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
  )
}
