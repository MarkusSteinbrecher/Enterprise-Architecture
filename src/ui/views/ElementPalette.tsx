import { forwardRef, memo, useMemo, useState } from 'react'
import { ElementShape, GroupShape, NoteShape } from '@/ui/notation'
import { paletteFor, toolKey, toolLabel, toolMatches, type Tool } from './create'

/**
 * The editor's palette (#130): every element type, grouped by layer and drawn
 * in its ArchiMate notation (#77), then note, group and the two junctions. A
 * view with a viewpoint offers only the types the viewpoint allows.
 *
 * A click arms a tool, and the next click on the canvas places it there, as
 * in Archi. From the keyboard, Enter or Space on a tool places it at once in
 * the middle of the visible canvas, since a keyboard cannot point; so does
 * Enter in the filter, with its first match. "New element in view…" in the
 * command palette lands in that filter.
 */
export interface ElementPaletteProps {
  viewpoint: string | undefined
  /** The tool the next canvas click places, if one is armed. */
  armed: Tool | null
  onArm: (tool: Tool | null) => void
  /** Place `tool` in the middle of the visible canvas. */
  onPlace: (tool: Tool) => void
}

/**
 * Memoised, with stable callbacks from the canvas: the canvas re-renders on
 * every pointer move of a drag, and sixty-odd notation glyphs must not redraw
 * with it (ADR 0006, Consequences; `render-count.test.tsx` counts them).
 */
export const ElementPalette = memo(
  forwardRef<HTMLInputElement, ElementPaletteProps>(function ElementPalette(
    { viewpoint, armed, onArm, onPlace },
    filterRef,
  ) {
    const [query, setQuery] = useState('')
    const groups = useMemo(() => paletteFor(viewpoint), [viewpoint])
    const needle = query.trim().toLowerCase()
    const shown = needle
      ? groups
          .map((group) => ({
            ...group,
            tools: group.tools.filter((tool) => toolMatches(tool, needle)),
          }))
          .filter((group) => group.tools.length > 0)
      : groups
    const first = shown[0]?.tools[0]
    const armedKey = armed ? toolKey(armed) : null

    return (
      <section className="view-palette" aria-label="Palette">
        <input
          ref={filterRef}
          className="view-palette__filter"
          type="search"
          placeholder="Find a type…"
          aria-label="Find an element type to place"
          aria-description="Enter places the first match in the middle of the view."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && first) {
              event.preventDefault()
              setQuery('')
              onPlace(first)
            } else if (event.key === 'Escape' && query) {
              event.stopPropagation()
              setQuery('')
            }
          }}
        />
        {viewpoint && (
          <p className="view-palette__viewpoint">
            Viewpoint: <span className="view-palette__viewpoint-name">{viewpoint}</span>
          </p>
        )}
        <div className="view-palette__scroll">
          {shown.length === 0 && <p className="view-palette__empty">No type matches “{query}”.</p>}
          {shown.map((group) => (
            <section key={group.id} className="view-palette__group" aria-label={group.label}>
              <h2 className="view-palette__heading">{group.label}</h2>
              <div className="view-palette__tools">
                {group.tools.map((tool) => {
                  const key = toolKey(tool)
                  const label = toolLabel(tool)
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`view-palette__tool${armedKey === key ? ' view-palette__tool--armed' : ''}`}
                      data-tool={key}
                      aria-pressed={armedKey === key}
                      title={label}
                      onClick={() => onArm(armedKey === key ? null : tool)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onPlace(tool)
                        }
                      }}
                    >
                      <ToolGlyph tool={tool} />
                      <span className="view-palette__label">{label}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    )
  }),
)

/** The tool in its notation, at palette size. */
function ToolGlyph({ tool }: { tool: Tool }) {
  const w = 34
  const h = 20
  let shape
  if (tool.kind === 'note') shape = <NoteShape width={w} height={h} text="" />
  else if (tool.kind === 'group') shape = <GroupShape width={w} height={h} name="" />
  else if (tool.type === 'Junction') {
    shape = (
      <g transform={`translate(${w / 2 - 6} ${h / 2 - 6})`}>
        <ElementShape
          type="Junction"
          name=""
          width={12}
          height={12}
          junctionKind={tool.junctionKind ?? 'and'}
        />
      </g>
    )
  } else shape = <ElementShape type={tool.type} name="" width={w} height={h} />
  return (
    <svg
      className="view-palette__glyph"
      width={w + 2}
      height={h + 2}
      viewBox={`-1 -1 ${w + 2} ${h + 2}`}
      aria-hidden="true"
    >
      {shape}
    </svg>
  )
}
