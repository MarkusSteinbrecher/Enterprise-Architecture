import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { criticalityLabel, typeLabel, type Element } from '@/model'
import { TypeCodeBadge } from '@/ui/common/TypeCodeBadge'
import { CompletenessBar, FitMeter, LifecycleCell, TimeChip } from '@/ui/common/meters'
import { lifecycleOf } from './facets'
import { LIST_WINDOW } from './list-window'

/**
 * The inventory table (handoff "Screen 1 — Table").
 *
 * Seven columns of real signal per row — type, phase, both fits, criticality,
 * TIME, completeness — so scanning a landscape never requires opening anything
 * (UI spec §2, "density is earned").
 *
 * Rows are virtualised: the brief cites 500–5,000 elements, and 5,000 rows × ~40
 * DOM nodes is not something to hand to the browser. Below `LIST_WINDOW` the
 * list renders plainly, which keeps the simple case simple and testable.
 */

export const VIRTUALISE_ABOVE = LIST_WINDOW

/** `grid-template-columns` from the handoff, applied to header and rows alike. */
const COLUMNS = 'minmax(0,1.7fr) 152px 112px 104px 82px 92px 74px'

export interface InventoryTableProps {
  elements: Element[]
  at: number
  selectedId?: string
  completenessOf: (id: string) => number
  onOpen: (id: string) => void
}

export function InventoryTable({
  elements,
  at,
  selectedId,
  completenessOf,
  onOpen,
}: InventoryTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualise = elements.length > VIRTUALISE_ABOVE

  const virtualizer = useVirtualizer({
    count: elements.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 38,
    overscan: 12,
    enabled: virtualise,
  })

  if (elements.length === 0) {
    return (
      <div className="table">
        <TableHeader />
        <p className="table__empty">
          No elements match this filter.
          <br />
          Loosen a facet or switch the combinator to OR.
        </p>
      </div>
    )
  }

  return (
    <div className="table">
      <TableHeader />
      <div className="table__scroll" ref={scrollRef}>
        {virtualise ? (
          <div className="table__virtual" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const element = elements[item.index]
              if (!element) return null
              return (
                <div
                  key={element.id}
                  className="table__virtual-row"
                  style={{ transform: `translateY(${item.start}px)` }}
                  ref={virtualizer.measureElement}
                  data-index={item.index}
                >
                  <Row
                    element={element}
                    at={at}
                    selected={element.id === selectedId}
                    completeness={completenessOf(element.id)}
                    onOpen={onOpen}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          elements.map((element) => (
            <Row
              key={element.id}
              element={element}
              at={at}
              selected={element.id === selectedId}
              completeness={completenessOf(element.id)}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  )
}

function TableHeader() {
  return (
    <div className="table__header" style={{ gridTemplateColumns: COLUMNS }} role="row">
      <span>Element</span>
      <span>Type</span>
      <span>Lifecycle</span>
      <span>Fit F / T</span>
      <span>Crit.</span>
      <span>Time</span>
      <span className="table__right">Complete</span>
    </div>
  )
}

interface RowProps {
  element: Element
  at: number
  selected: boolean
  completeness: number
  onOpen: (id: string) => void
}

function Row({ element, at, selected, completeness, onOpen }: RowProps) {
  const profile = element.profile
  return (
    <button
      type="button"
      className={`table__row${selected ? ' table__row--selected' : ''}`}
      style={{ gridTemplateColumns: COLUMNS }}
      onClick={() => onOpen(element.id)}
    >
      <span className="table__element">
        <TypeCodeBadge type={element.type} size={19} />
        <span className="table__name">{element.name}</span>
      </span>
      <span className="table__secondary">{typeLabel(element.type)}</span>
      <span>
        <LifecycleCell phase={lifecycleOf(element, at)} />
      </span>
      <span className="table__fits">
        <FitMeter value={profile?.functionalFit} token="var(--ink2)" label="Functional fit" />
        <FitMeter value={profile?.technicalFit} token="var(--accent2)" label="Technical fit" />
      </span>
      <span className="table__secondary">
        {profile?.businessCriticality ? criticalityLabel(profile.businessCriticality) : '—'}
      </span>
      <span>
        <TimeChip value={profile?.timeClassification} />
      </span>
      <span className="table__completeness">
        <span className="table__percent">{completeness}%</span>
        <CompletenessBar score={completeness} />
      </span>
    </button>
  )
}
