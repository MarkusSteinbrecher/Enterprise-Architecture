import {
  LIFECYCLE_PHASE_LABELS,
  LIFECYCLE_PHASE_TOKENS,
  TIME_TOKENS,
  completenessToken,
  deriveLifecyclePhase,
  elementTypeMeta,
  relationshipTypeMeta,
  typeLabel,
  type Element,
} from '@/model'
import { TypeCodeBadge } from '@/ui/common/TypeCodeBadge'
import type { TracedDependency } from './trace'

/**
 * The 288px side panel that opens on focus (handoff "Screen 3 — side panel").
 *
 * The stat grid answers the questions a trace raises — how healthy is this, what
 * does it cost, when does it go — without leaving the graph, and each traced
 * dependency re-focuses rather than navigating away, so following a chain never
 * loses the picture.
 */

export interface TracePanelProps {
  element: Element
  completeness: number
  year: number
  dependencies: TracedDependency[]
  elementById: (id: string) => Element | undefined
  onRefocus: (id: string) => void
  onOpenFactSheet: (id: string) => void
  onClose: () => void
}

export function TracePanel({
  element,
  completeness,
  year,
  dependencies,
  elementById,
  onRefocus,
  onOpenFactSheet,
  onClose,
}: TracePanelProps) {
  const phase = deriveLifecyclePhase(element.profile?.lifecycle, Date.UTC(year, 0, 1))
  const time = element.profile?.timeClassification
  const cost = element.properties['annual.cost']

  return (
    <aside className="trace-panel" aria-label={`Traced dependencies of ${element.name}`}>
      <div className="trace-panel__head">
        <TypeCodeBadge type={element.type} size={22} />
        <div style={{ minWidth: 0 }}>
          <div className="trace-panel__name">{element.name}</div>
          <div className="trace-panel__type">{typeLabel(element.type)}</div>
        </div>
      </div>

      <div className="trace-panel__actions">
        <button
          type="button"
          className="button button--primary"
          onClick={() => onOpenFactSheet(element.id)}
        >
          Fact sheet
        </button>
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="trace-panel__stats">
        <Stat
          label="Lifecycle"
          value={LIFECYCLE_PHASE_LABELS[phase]}
          colour={LIFECYCLE_PHASE_TOKENS[phase]}
        />
        <Stat
          label="Time"
          value={time ?? 'Not classified'}
          colour={time ? TIME_TOKENS[time] : 'var(--ink3)'}
        />
        <Stat label="Annual cost" value={cost ? String(cost) : '—'} />
        <Stat
          label="Completeness"
          value={`${completeness}%`}
          colour={completenessToken(completeness)}
        />
      </div>

      <div className="section-label trace-panel__label">Traced dependencies</div>
      <div className="trace-panel__rows">
        {dependencies.length === 0 && (
          <p className="trace-panel__empty">Nothing is connected to this element.</p>
        )}
        {dependencies.map(({ relationship, otherId, direction }) => {
          const other = elementById(otherId)
          if (!other) return null
          const meta = elementTypeMeta(other.type)
          return (
            <button
              key={relationship.id}
              type="button"
              className="trace-panel__row"
              onClick={() => onRefocus(otherId)}
            >
              <span className="trace-panel__direction" aria-hidden="true">
                {direction === 'outgoing' ? '→' : '←'}
              </span>
              <span
                className="trace-panel__dot"
                style={{ background: `var(--${meta.colourGroup})` }}
                aria-hidden="true"
              />
              <span className="trace-panel__row-name">{other.name}</span>
              <span className="trace-panel__abbr">
                {relationshipTypeMeta(relationship.type).abbr}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function Stat({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div className="trace-panel__stat">
      <div className="trace-panel__stat-key">{label}</div>
      <div className="trace-panel__stat-value" style={colour ? { color: colour } : undefined}>
        {value}
      </div>
    </div>
  )
}
