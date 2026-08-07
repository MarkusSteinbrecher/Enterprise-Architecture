import type { FacetGroup } from './facets'
import {
  COMBINATORS,
  COMBINATOR_HINTS,
  SAVED_SEARCHES,
  toggleFacet,
  type Combinator,
} from './filters'

/**
 * The 238px filter rail (handoff "Screen 1 — Filter rail").
 *
 * Counts are global, not co-filtered (ADR UI-5), so they do not move under the
 * cursor while the user clicks through a group.
 */

export interface FilterRailProps {
  groups: FacetGroup[]
  counts: Map<string, number>
  /** How many elements each saved search returns, keyed by its id. */
  savedCounts: Map<string, number>
  facets: string[]
  mode: Combinator
  onFacetsChange: (facets: string[]) => void
  onModeChange: (mode: Combinator) => void
  onApplySaved: (facets: string[], mode: Combinator) => void
  onClear: () => void
}

export function FilterRail({
  groups,
  counts,
  savedCounts,
  facets,
  mode,
  onFacetsChange,
  onModeChange,
  onApplySaved,
  onClear,
}: FilterRailProps) {
  return (
    <aside className="rail" aria-label="Filters">
      <div className="rail__head">
        <span className="section-label">Saved searches</span>
      </div>
      {SAVED_SEARCHES.map((saved) => (
        <button
          key={saved.id}
          type="button"
          className="rail__saved"
          onClick={() => onApplySaved(saved.facets, saved.mode)}
          title={`${saved.facets.join(', ')} · ${saved.mode}`}
        >
          <span className="rail__saved-label">{saved.label}</span>
          <span className="rail__saved-count">{savedCounts.get(saved.id) ?? 0}</span>
        </button>
      ))}

      <div className="rail__divider" />

      <div className="rail__head">
        <span className="section-label">Filters</span>
        <button type="button" className="rail__clear" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="rail__combinator" role="group" aria-label="Facet combinator">
        {COMBINATORS.map((option) => (
          <button
            key={option}
            type="button"
            className={`rail__mode${option === mode ? ' rail__mode--active' : ''}`}
            title={COMBINATOR_HINTS[option]}
            aria-pressed={option === mode}
            onClick={() => onModeChange(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {groups.map((group) => (
        <div key={group.key} className="rail__group">
          <div className="section-label rail__group-label">{group.label}</div>
          {group.options.map((option) => {
            const on = facets.includes(option.key)
            return (
              <button
                key={option.key}
                type="button"
                className={`rail__option${on ? ' rail__option--on' : ''}`}
                aria-pressed={on}
                onClick={() => onFacetsChange(toggleFacet(facets, option.key))}
              >
                <span className={`rail__check${on ? ' rail__check--on' : ''}`} aria-hidden="true" />
                <span className="rail__option-label">{option.label}</span>
                <span className="rail__option-count">{counts.get(option.key) ?? 0}</span>
              </button>
            )
          })}
        </div>
      ))}
    </aside>
  )
}
