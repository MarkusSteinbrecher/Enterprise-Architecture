import { FACET_GROUP_LABELS, parseFacet } from './facets'

/**
 * The chip bar above the list (handoff "Active-filter chip bar").
 * Only rendered when facets are active; each chip removes exactly its own facet.
 */

export interface ActiveFilterChipsProps {
  facets: string[]
  onRemove: (facet: string) => void
}

export function ActiveFilterChips({ facets, onRemove }: ActiveFilterChipsProps) {
  if (facets.length === 0) return null

  return (
    <div className="chips">
      {facets.map((facet) => {
        const parsed = parseFacet(facet)
        if (!parsed) return null
        return (
          <button
            key={facet}
            type="button"
            className="chip"
            onClick={() => onRemove(facet)}
            aria-label={`Remove filter ${FACET_GROUP_LABELS[parsed.group]} ${parsed.value}`}
          >
            <span className="chip__group">{parsed.group}</span>
            <span className="chip__value">{parsed.value}</span>
            <span className="chip__remove" aria-hidden="true">
              ×
            </span>
          </button>
        )
      })}
    </div>
  )
}
