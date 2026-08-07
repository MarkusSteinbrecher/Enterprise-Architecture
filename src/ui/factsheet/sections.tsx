import {
  BUSINESS_CRITICALITY_LABELS,
  FUNCTIONAL_FIT_LABELS,
  LIFECYCLE_PHASES,
  LIFECYCLE_PHASE_LABELS,
  LIFECYCLE_PHASE_TOKENS,
  RELATION_BLOCK_ORDER,
  TECHNICAL_FIT_LABELS,
  TIME_CLASSIFICATIONS,
  TIME_TOKENS,
  criticalityLabel,
  formatLifecycleDate,
  functionalFitLabel,
  hasLifecycle,
  technicalFitLabel,
  timeIndex,
  typeLabel,
  type Element,
  type LifecyclePhase,
  type PortfolioProfile,
  type Relationship,
  type RelationshipType,
  type TimeClassification,
} from '@/model'
import { TypeCodeBadge } from '@/ui/common/TypeCodeBadge'
import { FitMeter } from '@/ui/common/meters'

/**
 * The fact sheet's main-column sections (handoff "Screen 2 — main column").
 *
 * They are grouped in one module because they share one shape: a section label,
 * a read view, and an edit view that differs only in which control renders. Every
 * one of them has to hold up for an element with **no** portfolio profile — a
 * capability, an actor, a data object — which is the case that breaks fact-sheet
 * layouts built only against applications (UI spec §4).
 */

export function SectionHeading({ label, note }: { label: string; note?: string }) {
  return (
    <div className="sheet__section-head">
      <span className="section-label">{label}</span>
      {note && <span className="sheet__note">{note}</span>}
    </div>
  )
}

// ── Documentation ────────────────────────────────────────────────────────────

export function DocumentationSection({
  documentation,
  editing,
  onChange,
}: {
  documentation: string | undefined
  editing: boolean
  onChange: (value: string) => void
}) {
  return (
    <section>
      <SectionHeading label="Documentation" />
      {editing ? (
        <textarea
          className="sheet__textarea"
          defaultValue={documentation ?? ''}
          onBlur={(event) => onChange(event.target.value)}
          aria-label="Documentation"
          placeholder="What is this element, and why does it exist?"
        />
      ) : (
        <p className={`sheet__doc${documentation ? '' : ' sheet__doc--empty'}`}>
          {documentation || 'No documentation yet.'}
        </p>
      )}
    </section>
  )
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

export function LifecycleSection({
  profile,
  phase,
  editing,
  onChange,
}: {
  profile: PortfolioProfile | undefined
  phase: LifecyclePhase
  editing: boolean
  onChange: (phase: LifecyclePhase, value: string) => void
}) {
  const dated = hasLifecycle(profile?.lifecycle)
  const note = dated
    ? `Current phase: ${LIFECYCLE_PHASE_LABELS[phase]} · derived from phase dates`
    : 'No lifecycle dates on this element type'

  return (
    <section>
      <SectionHeading label="Lifecycle" note={note} />
      <div className="lifecycle">
        {LIFECYCLE_PHASES.map((candidate) => {
          const current = dated && candidate === phase
          return (
            <div key={candidate}>
              <div
                className="lifecycle__phase-bar"
                style={current ? { background: LIFECYCLE_PHASE_TOKENS[candidate] } : undefined}
              />
              <div
                className={`lifecycle__phase-name${current ? ' lifecycle__phase-name--current' : ''}`}
              >
                {LIFECYCLE_PHASE_LABELS[candidate]}
              </div>
              {editing ? (
                <input
                  className="lifecycle__input"
                  type="date"
                  aria-label={`${LIFECYCLE_PHASE_LABELS[candidate]} date`}
                  defaultValue={profile?.lifecycle?.[candidate] ?? ''}
                  onChange={(event) => onChange(candidate, event.target.value)}
                />
              ) : (
                <div className="lifecycle__date">
                  {formatLifecycleDate(profile?.lifecycle?.[candidate])}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Portfolio assessment ─────────────────────────────────────────────────────

export function AssessmentSection({
  profile,
  editing,
  onChange,
}: {
  profile: PortfolioProfile | undefined
  editing: boolean
  onChange: (patch: Partial<PortfolioProfile>) => void
}) {
  return (
    <section>
      <SectionHeading label="Portfolio assessment" />
      <div className="assessment">
        <LevelCell
          label="Functional fit"
          value={profile?.functionalFit}
          text={functionalFitLabel(profile?.functionalFit)}
          token="var(--ink2)"
          options={FUNCTIONAL_FIT_LABELS}
          editing={editing}
          onChange={(level) => onChange({ functionalFit: level })}
        />
        <LevelCell
          label="Technical fit"
          value={profile?.technicalFit}
          text={technicalFitLabel(profile?.technicalFit)}
          token="var(--accent2)"
          options={TECHNICAL_FIT_LABELS}
          editing={editing}
          onChange={(level) => onChange({ technicalFit: level })}
        />
        <LevelCell
          label="Business criticality"
          value={profile?.businessCriticality}
          text={criticalityLabel(profile?.businessCriticality)}
          token="var(--lc-out)"
          options={BUSINESS_CRITICALITY_LABELS}
          editing={editing}
          onChange={(level) => onChange({ businessCriticality: level })}
        />
        <TimeCell
          value={profile?.timeClassification}
          editing={editing}
          onChange={(value) => onChange({ timeClassification: value })}
        />
      </div>
    </section>
  )
}

type Level = 1 | 2 | 3 | 4

function LevelCell({
  label,
  value,
  text,
  token,
  options,
  editing,
  onChange,
}: {
  label: string
  value: Level | undefined
  text: string
  token: string
  options: readonly string[]
  editing: boolean
  onChange: (level: Level) => void
}) {
  return (
    <div className="assessment__cell">
      <div className="assessment__key">{label}</div>
      {editing ? (
        <select
          className="assessment__select"
          aria-label={label}
          value={value ?? ''}
          onChange={(event) => onChange(Number(event.target.value) as Level)}
        >
          <option value="">Not assessed</option>
          {options.map((option, index) => (
            <option key={option} value={index + 1}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <div className="assessment__value-row">
          <span className={`assessment__value${value ? '' : ' assessment__value--unset'}`}>
            {text}
          </span>
          <FitMeter value={value} token={token} barWidth={5} />
        </div>
      )}
    </div>
  )
}

function TimeCell({
  value,
  editing,
  onChange,
}: {
  value: TimeClassification | undefined
  editing: boolean
  onChange: (value: TimeClassification) => void
}) {
  return (
    <div className="assessment__cell">
      <div className="assessment__key">Time classification</div>
      {editing ? (
        <select
          className="assessment__select"
          aria-label="Time classification"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value as TimeClassification)}
        >
          <option value="">Not assessed</option>
          {TIME_CLASSIFICATIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <div className="assessment__value-row">
          <span
            className={`assessment__value${value ? '' : ' assessment__value--unset'}`}
            style={value ? { color: TIME_TOKENS[value] } : undefined}
          >
            {value ?? 'Not assessed'}
          </span>
          {/* Ordinal display only — TIME is categorical, not a score. */}
          <FitMeter
            value={value ? timeIndex(value) : undefined}
            token={value ? TIME_TOKENS[value] : 'var(--panel2)'}
            barWidth={5}
          />
        </div>
      )}
    </div>
  )
}

// ── Relations ────────────────────────────────────────────────────────────────

export interface RelationEntry {
  relationship: Relationship
  other: Element
  direction: 'outgoing' | 'incoming'
}

export function RelationsSection({
  entries,
  editing,
  onOpen,
  onAdd,
  onRemove,
}: {
  entries: RelationEntry[]
  editing: boolean
  onOpen: (id: string) => void
  onAdd: (type: RelationshipType) => void
  onRemove: (relationshipId: string) => void
}) {
  const byType = new Map<RelationshipType, RelationEntry[]>()
  for (const entry of entries) {
    const bucket = byType.get(entry.relationship.type)
    if (bucket) bucket.push(entry)
    else byType.set(entry.relationship.type, [entry])
  }

  const blocks = RELATION_BLOCK_ORDER.filter((type) => byType.has(type))
  const note = `${entries.length} relation${entries.length === 1 ? '' : 's'} · ${blocks.length} type${blocks.length === 1 ? '' : 's'}`

  return (
    <section>
      <SectionHeading label="Relations" note={note} />
      <div className="relations">
        {blocks.length === 0 && (
          <p className="sheet__doc sheet__doc--empty">Nothing is connected to this element yet.</p>
        )}
        {blocks.map((type) => {
          const rows = byType.get(type) ?? []
          return (
            <div key={type} className="relation-block">
              <div className="relation-block__head">
                <span className="relation-block__type">{type}</span>
                <span className="relation-block__count">{rows.length}</span>
                {editing && (
                  <button type="button" className="relation-block__add" onClick={() => onAdd(type)}>
                    + add
                  </button>
                )}
              </div>
              {rows.map((entry) => (
                <div key={entry.relationship.id} className="relation-row">
                  <span className="relation-row__direction" aria-hidden="true">
                    {entry.direction === 'outgoing' ? '→' : '←'}
                  </span>
                  <TypeCodeBadge type={entry.other.type} size={17} />
                  <button
                    type="button"
                    className="relation-row__name"
                    onClick={() => onOpen(entry.other.id)}
                  >
                    {entry.other.name}
                  </button>
                  <span className="relation-row__type">{typeLabel(entry.other.type)}</span>
                  {editing && (
                    <button
                      type="button"
                      className="relation-row__remove"
                      aria-label={`Remove ${type} relation to ${entry.other.name}`}
                      onClick={() => onRemove(entry.relationship.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Properties ───────────────────────────────────────────────────────────────

export function PropertiesSection({
  element,
  lastModified,
}: {
  element: Element
  lastModified: string
}) {
  const rows: [string, string][] = [
    ['archimate.type', typeLabel(element.type)],
    ...Object.entries(element.properties).map(
      ([key, value]) => [key, String(value)] as [string, string],
    ),
    ['element.id', element.id],
    ['last.modified', lastModified],
  ]

  return (
    <section>
      <SectionHeading label="Properties" />
      <div className="properties">
        {rows.map(([key, value]) => (
          <div key={key} className="property-row">
            <span className="property-row__key">{key}</span>
            <span className="property-row__value">{value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
