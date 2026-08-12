import { FACET_GROUP_LABELS, parseFacet, type FacetGroup } from './facets'

/**
 * The chip bar above the list (handoff "Active-filter chip bar").
 * Only rendered when facets are active; each chip removes exactly its own facet.
 *
 * Chips read the rail's own labels rather than the values behind them. Ticking
 * "Application" and "End of Life" used to produce `LAYER app` and `LIFECYCLE
 * endOfLife` — enum identifiers, set in Space Grotesk, which is the inverse of
 * the rule that monospace marks machine-readable content — and a screen reader
 * announcing "Remove filter Layer app". The prototype maps these through its
 * label tables for exactly this reason, and `FacetOption.label` already holds
 * the same strings the rail shows.
 */

export interface ActiveFilterChipsProps {
  facets: string[]
  /** The rail's groups, for the label behind each facet key. */
  groups: FacetGroup[]
  onRemove: (facet: string) => void
}

export function ActiveFilterChips({ facets, groups, onRemove }: ActiveFilterChipsProps) {
  if (facets.length === 0) return null

  const labels = new Map(
    groups.flatMap((group) => group.options.map((option) => [option.key, option.label] as const)),
  )

  return (
    <div className="chips">
      {facets.map((facet) => {
        const parsed = parseFacet(facet)
        if (!parsed) return null
        const groupLabel = FACET_GROUP_LABELS[parsed.group]
        // A tag the rail has no row for (imported, not in any tag group) still
        // gets a chip: its own name is the honest label.
        const valueLabel = labels.get(facet) ?? parsed.value
        return (
          <button
            key={facet}
            type="button"
            className="chip"
            onClick={() => onRemove(facet)}
            aria-label={`Remove filter ${groupLabel} ${valueLabel}`}
          >
            <span className="chip__group">{groupLabel}</span>
            <span className="chip__value">{valueLabel}</span>
            <span className="chip__remove" aria-hidden="true">
              ×
            </span>
          </button>
        )
      })}
    </div>
  )
}
