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

/** Options need ids for `aria-activedescendant`; focus never leaves the input. */
const rowId = (index: number) => `palette-row-${index}`

export function CommandPalette({ onClose, onOpenElement, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const pointer = useRef<{ x: number; y: number } | undefined>(undefined)

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

  // Take focus on open and give it back on close. Escape used to unmount the
  // input and drop focus to `<body>`, which strands a keyboard user mid-page.
  useEffect(() => {
    const opener = document.activeElement
    inputRef.current?.focus()
    return () => {
      if (opener instanceof HTMLElement && opener !== document.body) opener.focus()
    }
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

  // Bound to the panel rather than the input: a key press has to do the same
  // thing wherever it happens inside the dialog, including after a click on the
  // footer or the empty-state message, which are not focusable and used to leave
  // the palette inert until the user reached for the mouse again.
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
    } else if (event.key === 'Tab') {
      // The dialog says `aria-modal`, so it has to mean it. Rows are not tab
      // stops, which leaves the input as the only thing to hold: Tab used to
      // walk out onto the chrome behind the overlay, where Enter downloaded a
      // file the user never asked for.
      event.preventDefault()
      inputRef.current?.focus()
    }
  }

  /**
   * `scrollIntoView` moves rows under a stationary cursor, and the mousemove
   * that produces would otherwise hand the selection to whatever row landed
   * under it — so arrowing down jumped the highlight and Enter opened the wrong
   * element. Only a pointer that actually moved gets to choose.
   *
   * "Actually moved" needs a *previous* position to compare against, so the
   * first mousemove only records one. Without that, a palette opened with ⌘K
   * under a resting cursor has no history for the first scroll artefact to
   * differ from, and the bug survives the guard meant to fix it. A real pointer
   * emits a move every few pixels, so the row still lights up as it travels.
   */
  const onRowMouseMove = (index: number) => (event: React.MouseEvent) => {
    const last = pointer.current
    pointer.current = { x: event.clientX, y: event.clientY }
    if (!last || (last.x === event.clientX && last.y === event.clientY)) return
    setActive(index)
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
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        onMouseDown={(event) => {
          // Clicking the footer, the empty state or the gap between rows used to
          // drop focus on `<body>`. Refusing the focus change keeps it in the
          // input — except on the input itself, where preventing it would break
          // drag-selecting the query.
          if (event.target !== inputRef.current) event.preventDefault()
        }}
      >
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
            // Focus stays in the input, so the highlighted row can only be
            // announced by pointing at it. Without this a screen-reader user
            // arrows through 54 results in silence and presses Enter blind.
            role="combobox"
            aria-expanded
            aria-autocomplete="list"
            aria-label="Jump to element, run an action"
            aria-controls="palette-results"
            aria-activedescendant={hits.length > 0 ? rowId(active) : undefined}
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
                  id={rowId(index)}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === active}
                  className={`palette__row${index === active ? ' palette__row--active' : ''}`}
                  onMouseMove={onRowMouseMove(index)}
                  onClick={() => run(hit)}
                >
                  {/* The badge's `title` is announced, so the row would read
                      "BP Business Process Claim handling Business Process". */}
                  <span aria-hidden="true" className="palette__badge">
                    <TypeCodeBadge type={hit.element.type} size={19} />
                  </span>
                  <span className="palette__name">{hit.element.name}</span>
                  <span className="palette__type">{typeLabel(hit.element.type)}</span>
                </button>
              ) : (
                <button
                  key={`action:${hit.action.id}`}
                  id={rowId(index)}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === active}
                  className={`palette__row${index === active ? ' palette__row--active' : ''}`}
                  onMouseMove={onRowMouseMove(index)}
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
