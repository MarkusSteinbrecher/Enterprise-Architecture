import { useEffect, useMemo, useRef, useState } from 'react'
import { typeLabel, type Element } from '@/model'
import { useModelSelector } from '@/store'
import { TypeCodeBadge } from '@/ui/common/TypeCodeBadge'
import './palette.css'

/**
 * The command palette (handoff "Global chrome" → Command palette).
 *
 * One search surface for the whole app (ADR UI-7): the header field is a button
 * that opens this, so there is never a second place to type a query.
 *
 * Results are element hits first, then actions in mono — the same distinction the
 * rest of the UI makes between authored content and machine-readable labels.
 */

export interface PaletteAction {
  id: string
  label: string
  /** Two-letter glyph in the badge column, standing in for an icon. */
  glyph: string
  run: () => void
}

export interface CommandPaletteProps {
  onClose: () => void
  onOpenElement: (id: string) => void
  actions: PaletteAction[]
}

/** How many element hits to render. Anything beyond this is reported, not hidden. */
const MAX_ELEMENT_HITS = 50

interface ElementHit {
  kind: 'element'
  element: Element
}

interface ActionHit {
  kind: 'action'
  action: PaletteAction
}

type Hit = ElementHit | ActionHit

export function CommandPalette({ onClose, onOpenElement, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const elements = useModelSelector((store) => store.elementList())

  const { hits, matchedElements } = useMemo(() => {
    const needle = query.trim().toLowerCase()
    // Same match rule as the inventory's name filter: substring over name + type.
    const matched = needle
      ? elements.filter((element) =>
          `${element.name} ${typeLabel(element.type)}`.toLowerCase().includes(needle),
        )
      : elements
    const matchedActions = needle
      ? actions.filter((action) => action.label.toLowerCase().includes(needle))
      : actions
    return {
      matchedElements: matched.length,
      hits: [
        ...matched.slice(0, MAX_ELEMENT_HITS).map((element): Hit => ({ kind: 'element', element })),
        ...matchedActions.map((action): Hit => ({ kind: 'action', action })),
      ],
    }
  }, [elements, actions, query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setActive(0)
  }, [query])

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector('.palette__row--active')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (hit: Hit | undefined) => {
    if (!hit) return
    if (hit.kind === 'element') onOpenElement(hit.element.id)
    else hit.action.run()
    onClose()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (hits.length ? (index + 1) % hits.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (hits.length ? (index - 1 + hits.length) % hits.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      run(hits[active])
    }
  }

  const hidden = Math.max(0, matchedElements - MAX_ELEMENT_HITS)

  return (
    <div
      className="palette-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="palette__input-row">
          <span className="palette__chevron" aria-hidden="true">
            ›
          </span>
          <input
            ref={inputRef}
            className="palette__input"
            placeholder="Jump to element, run an action…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Jump to element, run an action"
            aria-controls="palette-results"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="palette__esc">ESC</span>
        </div>

        <div className="palette__results" id="palette-results" role="listbox" ref={listRef}>
          {hits.length === 0 ? (
            <div className="palette__empty">Nothing matches “{query}”</div>
          ) : (
            hits.map((hit, index) =>
              hit.kind === 'element' ? (
                <button
                  key={`element:${hit.element.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={`palette__row${index === active ? ' palette__row--active' : ''}`}
                  onMouseMove={() => setActive(index)}
                  onClick={() => run(hit)}
                >
                  <TypeCodeBadge type={hit.element.type} size={19} />
                  <span className="palette__name">{hit.element.name}</span>
                  <span className="palette__type">{typeLabel(hit.element.type)}</span>
                </button>
              ) : (
                <button
                  key={`action:${hit.action.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={`palette__row${index === active ? ' palette__row--active' : ''}`}
                  onMouseMove={() => setActive(index)}
                  onClick={() => run(hit)}
                >
                  <span className="palette__action-glyph" aria-hidden="true">
                    {hit.action.glyph}
                  </span>
                  <span className="palette__name palette__action-name">{hit.action.label}</span>
                  <span className="palette__type">ACTION</span>
                </button>
              ),
            )
          )}
        </div>

        <div className="palette__footer">
          <span>
            <span className="palette__hint-key">↵</span> open
          </span>
          <span>
            <span className="palette__hint-key">G</span> graph
          </span>
          <span>
            <span className="palette__hint-key">I</span> inventory
          </span>
          <span className="palette__indexed">
            {hidden > 0
              ? `showing ${MAX_ELEMENT_HITS} of ${matchedElements} matches · ${elements.length} elements indexed`
              : `${elements.length} elements indexed`}
          </span>
        </div>
      </div>
    </div>
  )
}
