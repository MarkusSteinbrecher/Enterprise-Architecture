import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  colourFromInput,
  canPaint,
  fontNameFromInput,
  fontSizeFromInput,
  isTextAlignment,
  isTextPosition,
  lineWidthFromInput,
  pickUpFormat,
  resetAppearance,
  setAppearanceField,
  setFontStyle,
  sharedFields,
  sharedFontStyle,
  sharedValue,
  type Appearance,
  type AppearanceField,
  type Drawing,
  type FontStyle,
  type Format,
  type Shared,
  type View,
} from '@/model'
import type { ModelStore } from '@/store'
import './appearance.css'

/**
 * The appearance of the selection (#135): one drawing, or several, whose
 * values are shown where they agree and as mixed where they do not. Every
 * change is one command over the whole selection, so one undo restores each
 * drawing's own previous override, none included. Each form value passes its
 * guard on the way in (CLAUDE.md): an empty field resets, and an invalid one
 * stores nothing.
 */
export function DrawingAppearance({
  store,
  view,
  ids,
  editable,
  isJunction,
  painting,
  onPainter,
  onDone,
}: {
  store: ModelStore
  view: View
  /** The selected drawings: node ids, or one connection's. */
  ids: readonly string[]
  editable: boolean
  isJunction: (elementId: string) => boolean
  /** The format painter holds a format. */
  painting: boolean
  /** Pick up a format, or put the painter down with `null`. */
  onPainter: (format: Format | null) => void
  /** An action ended that removed the control holding focus: focus goes back to the canvas. */
  onDone: () => void
}) {
  const wanted = new Set(ids)
  const drawings: Drawing[] = [
    ...view.nodes.filter((n) => wanted.has(n.id)),
    ...view.connections.filter((c) => wanted.has(c.id)),
  ]
  const [only] = drawings
  if (!only) return null
  const edit = (change: (v: View) => View) => store.updateView(view.id, change)
  const source = drawings.length === 1 && canPaint(only, isJunction) ? only : undefined
  return (
    <AppearanceSection
      drawings={drawings}
      fields={sharedFields(drawings, isJunction)}
      editable={editable}
      onSet={(field, value) => edit((v) => setAppearanceField(v, wanted, field, value, isJunction))}
      onFontStyle={(style, on) => edit((v) => setFontStyle(v, wanted, style, on, isJunction))}
      onReset={() => {
        edit((v) => resetAppearance(v, wanted))
        // Every reset control is now disabled, the one pressed included.
        onDone()
      }}
      painter={
        source && {
          painting,
          toggle: () => onPainter(painting ? null : (pickUpFormat(source, isJunction) ?? null)),
        }
      }
    />
  )
}

const FIELD_LABELS: Record<AppearanceField, string> = {
  fillColor: 'Fill',
  lineColor: 'Line colour',
  lineWidth: 'Line width',
  fontName: 'Font',
  fontSize: 'Font size',
  fontColor: 'Font colour',
  fontStyle: 'Style',
  textAlignment: 'Alignment',
  textPosition: 'Position',
  labelPosition: 'Label',
}

const STYLE_BUTTONS: readonly { style: FontStyle; label: string; glyph: string }[] = [
  { style: 'bold', label: 'Bold', glyph: 'B' },
  { style: 'italic', label: 'Italic', glyph: 'I' },
  { style: 'underline', label: 'Underline', glyph: 'U' },
  { style: 'strikethrough', label: 'Strikethrough', glyph: 'S' },
]

/** The value a `<select>` shows for a mix: an option nothing else uses, and nobody can choose. */
const MIXED = 'mixed'

export function AppearanceSection({
  drawings,
  fields,
  editable,
  onSet,
  onFontStyle,
  onReset,
  painter,
}: {
  drawings: readonly Drawing[]
  fields: readonly AppearanceField[]
  editable: boolean
  onSet: <K extends AppearanceField>(field: K, value: Appearance[K] | undefined) => void
  onFontStyle: (style: FontStyle, on: boolean) => void
  onReset: () => void
  /** Present when the selection is one drawing the painter can pick up from. */
  painter?: { painting: boolean; toggle: () => void } | undefined
}) {
  const has = (field: AppearanceField) => fields.includes(field)
  const overridden = drawings.some((d) => d.appearance !== undefined)
  return (
    <section className="appearance" aria-label="Appearance">
      <div className="view-panel__kind">Appearance</div>
      {has('fillColor') && (
        <ColourField
          label={FIELD_LABELS.fillColor}
          shared={sharedValue(drawings, 'fillColor')}
          editable={editable}
          onCommit={(value) => onSet('fillColor', value)}
        />
      )}
      {has('lineColor') && (
        <ColourField
          label={FIELD_LABELS.lineColor}
          shared={sharedValue(drawings, 'lineColor')}
          editable={editable}
          onCommit={(value) => onSet('lineColor', value)}
        />
      )}
      {has('lineWidth') && (
        <ChoiceField
          label={FIELD_LABELS.lineWidth}
          shared={sharedValue(drawings, 'lineWidth')}
          editable={editable}
          // Archi's three widths. One is the default, so it is not offered as an
          // override: Archi does not save a width of one, and it would come back as none.
          options={[
            ['', 'Default (1 px)'],
            ['2', '2 px'],
            ['3', '3 px'],
          ]}
          unit=" px"
          onCommit={(raw) => onSet('lineWidth', lineWidthFromInput(raw))}
        />
      )}
      {has('fontName') && (
        <TextField<string>
          label={FIELD_LABELS.fontName}
          shared={sharedValue(drawings, 'fontName')}
          editable={editable}
          parse={fontNameFromInput}
          invalid="Type a font name."
          onCommit={(value) => onSet('fontName', value)}
        />
      )}
      {has('fontSize') && (
        <TextField<number>
          label={FIELD_LABELS.fontSize}
          shared={sharedValue(drawings, 'fontSize')}
          editable={editable}
          parse={fontSizeFromInput}
          numeric
          invalid="A size in whole points, such as 10."
          onCommit={(value) => onSet('fontSize', value)}
        />
      )}
      {has('fontColor') && (
        <ColourField
          label={FIELD_LABELS.fontColor}
          shared={sharedValue(drawings, 'fontColor')}
          editable={editable}
          onCommit={(value) => onSet('fontColor', value)}
        />
      )}
      {has('fontStyle') && (
        <div className="appearance__field">
          <span className="view-panel__stat-key">{FIELD_LABELS.fontStyle}</span>
          <div className="appearance__styles" role="group" aria-label="Font style">
            {STYLE_BUTTONS.map(({ style, label, glyph }) => {
              const state = sharedFontStyle(drawings, style)
              return (
                <button
                  key={style}
                  type="button"
                  className={`appearance__style appearance__style--${style}`}
                  aria-label={label}
                  aria-pressed={state === 'mixed' ? 'mixed' : state}
                  disabled={!editable}
                  // A mix is turned on everywhere, as a mixed checkbox is.
                  onClick={() => onFontStyle(style, state !== true)}
                >
                  {glyph}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {has('textAlignment') && (
        <ChoiceField
          label={FIELD_LABELS.textAlignment}
          shared={sharedValue(drawings, 'textAlignment')}
          editable={editable}
          options={[
            ['', 'Default'],
            ['left', 'Left'],
            ['center', 'Centre'],
            ['right', 'Right'],
          ]}
          // Through the guard: the empty option, or anything unknown, is no override.
          onCommit={(raw) => onSet('textAlignment', isTextAlignment(raw) ? raw : undefined)}
        />
      )}
      {has('textPosition') && (
        <ChoiceField
          label={FIELD_LABELS.textPosition}
          shared={sharedValue(drawings, 'textPosition')}
          editable={editable}
          options={[
            ['', 'Default'],
            ['top', 'Top'],
            ['middle', 'Middle'],
            ['bottom', 'Bottom'],
          ]}
          onCommit={(raw) => onSet('textPosition', isTextPosition(raw) ? raw : undefined)}
        />
      )}
      {editable && (
        <div className="view-panel__actions view-panel__actions--wrap">
          {painter && (
            <button
              type="button"
              className="button"
              aria-pressed={painter.painting}
              title="Pick up this drawing’s appearance, then click shapes and lines to paint it onto them"
              onClick={painter.toggle}
            >
              Format painter
            </button>
          )}
          <button type="button" className="button" disabled={!overridden} onClick={onReset}>
            Reset all
          </button>
        </div>
      )}
    </section>
  )
}

/** A field's label, its control, and the button that resets it to the notation's default. */
function Field({
  label,
  set,
  editable,
  onReset,
  children,
  error,
}: {
  label: string
  /** Something to reset: an override, or a mix of them. */
  set: boolean
  editable: boolean
  onReset: () => void
  children: (id: string) => ReactNode
  error?: { id: string; message: string } | undefined
}) {
  const id = useId()
  return (
    <div className="appearance__field">
      <label className="view-panel__stat-key" htmlFor={id}>
        {label}
      </label>
      <div className="appearance__row">
        {children(id)}
        {editable && (
          <button
            type="button"
            className="appearance__reset"
            aria-label={`Reset ${label.toLowerCase()} to default`}
            title="Reset to default"
            disabled={!set}
            onClick={onReset}
          >
            Reset
          </button>
        )}
      </div>
      {error && (
        <span id={error.id} className="appearance__error">
          {error.message}
        </span>
      )}
    </div>
  )
}

/**
 * A typed value, committed on Enter or on leaving the field. It never moves
 * focus on blur (CLAUDE.md). A field left empty resets; a value its guard
 * rejects stores nothing and says why; Escape puts the stored value back.
 */
function TextField<T extends string | number>({
  label,
  shared,
  editable,
  parse,
  invalid,
  numeric,
  onCommit,
  before,
}: {
  label: string
  shared: Shared<T>
  editable: boolean
  parse: (raw: string) => T | undefined
  invalid: string
  numeric?: boolean
  onCommit: (value: T | undefined) => void
  /** Drawn left of the field, such as a colour picker, which commits through the same guard. */
  before?: (commit: (raw: string) => void) => ReactNode
}) {
  const stored = shared.mixed || shared.value === undefined ? '' : String(shared.value)
  const [draft, setDraft] = useState(stored)
  const [wrong, setWrong] = useState(false)
  // An undo, or an edit elsewhere, shows through; the field keeps its focus.
  useEffect(() => {
    setDraft(stored)
    setWrong(false)
  }, [stored])
  const input = useRef<HTMLInputElement>(null)
  const errorId = useId()
  const set = shared.mixed || shared.value !== undefined

  const commit = (raw: string) => {
    if (raw === stored) {
      setWrong(false)
      return
    }
    const value = parse(raw)
    if (value !== undefined) {
      setWrong(false)
      onCommit(value)
    } else if (raw.trim() === '') {
      // Emptied: as the notation draws it.
      setWrong(false)
      onCommit(undefined)
    } else {
      setWrong(true)
    }
  }

  return (
    <Field
      label={label}
      set={set}
      editable={editable}
      onReset={() => {
        onCommit(undefined)
        // The button is disabled now; the field it reset takes focus.
        input.current?.focus()
      }}
      error={wrong ? { id: errorId, message: invalid } : undefined}
    >
      {(id) => (
        <>
          {before?.(commit)}
          <input
            ref={input}
            id={id}
            className="appearance__input"
            value={draft}
            placeholder={shared.mixed ? 'Mixed' : 'Default'}
            inputMode={numeric ? 'numeric' : undefined}
            disabled={!editable}
            aria-invalid={wrong || undefined}
            aria-describedby={wrong ? errorId : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commit(event.currentTarget.value)
              } else if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                setDraft(stored)
                setWrong(false)
              }
            }}
            onBlur={(event) => commit(event.currentTarget.value)}
          />
        </>
      )}
    </Field>
  )
}

/**
 * A colour: typed as hex, or picked. Both pass `colourFromInput`, the guard
 * between a form and the model, so nothing but `#rrggbb` or `#rrggbbaa` is
 * ever stored.
 */
function ColourField({
  label,
  shared,
  editable,
  onCommit,
}: {
  label: string
  shared: Shared<string>
  editable: boolean
  onCommit: (value: string | undefined) => void
}) {
  const one = shared.mixed ? undefined : shared.value
  // The picker has no alpha, so a picked colour keeps the one the override had.
  const alpha = one?.length === 9 ? one.slice(7) : ''
  return (
    <TextField<string>
      label={label}
      shared={shared}
      editable={editable}
      parse={colourFromInput}
      invalid="A colour as hex, such as #1f6feb."
      onCommit={onCommit}
      before={(commit) => (
        <Swatch
          label={label}
          value={one?.slice(0, 7) ?? '#000000'}
          unset={one === undefined}
          editable={editable}
          onPick={(raw) => commit(raw + alpha)}
        />
      )}
    />
  )
}

/**
 * The browser's colour picker. It commits on the input's native `change`,
 * which fires once, as the picker closes; React's `onChange` is the `input`
 * event, which fires on every move inside it and would make each one a command.
 */
function Swatch({
  label,
  value,
  unset,
  editable,
  onPick,
}: {
  label: string
  value: string
  unset: boolean
  editable: boolean
  onPick: (raw: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const latest = useRef(onPick)
  useEffect(() => {
    latest.current = onPick
  })
  useEffect(() => {
    if (input.current) input.current.value = value
  }, [value])
  useEffect(() => {
    const el = input.current
    if (!el) return
    const picked = () => latest.current(el.value)
    el.addEventListener('change', picked)
    return () => el.removeEventListener('change', picked)
  }, [])
  return (
    <input
      ref={input}
      type="color"
      className={`appearance__swatch${unset ? ' appearance__swatch--unset' : ''}`}
      aria-label={`Pick ${label.toLowerCase()}`}
      defaultValue={value}
      disabled={!editable}
    />
  )
}

/**
 * A choice from a list. The empty option is the notation's default, and the
 * caller's guard turns it, and anything else it does not know, into no
 * override. A mix shows as an option nobody can choose; an override no option
 * names, such as a width another tool wrote, shows as itself.
 */
function ChoiceField({
  label,
  shared,
  editable,
  options,
  unit = '',
  onCommit,
}: {
  label: string
  shared: Shared<string | number>
  editable: boolean
  options: readonly (readonly [string, string])[]
  unit?: string
  onCommit: (raw: string) => void
}) {
  const value = shared.mixed ? MIXED : shared.value === undefined ? '' : String(shared.value)
  const named = shared.mixed || options.some(([option]) => option === value)
  const select = useRef<HTMLSelectElement>(null)
  return (
    <Field
      label={label}
      set={value !== ''}
      editable={editable}
      onReset={() => {
        onCommit('')
        select.current?.focus()
      }}
    >
      {(id) => (
        <select
          ref={select}
          id={id}
          className="view-screen__select appearance__select"
          value={value}
          disabled={!editable}
          onChange={(event) => onCommit(event.target.value)}
        >
          {shared.mixed && (
            <option value={MIXED} disabled>
              Mixed
            </option>
          )}
          {!named && <option value={value}>{`${value}${unit}`}</option>}
          {options.map(([option, text]) => (
            <option key={option} value={option}>
              {text}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

/** Several shapes selected: how many, and their appearance (#135). */
export function MultiSelectionPanel({
  count,
  onClose,
  children,
}: {
  count: number
  onClose: () => void
  children: ReactNode
}) {
  return (
    <aside className="view-panel" aria-label={`Selected: ${count} shapes`}>
      <div className="view-panel__kind">Selection</div>
      <div className="view-panel__name">{count} shapes</div>
      <div className="view-panel__actions">
        <button type="button" className="button" onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </aside>
  )
}

/**
 * The format painter holds a format (#135): each press on a shape or a line
 * paints it, as Archi's does, until Done or Escape puts the painter down.
 */
export function PainterBanner({ onDone }: { onDone: () => void }) {
  return (
    <div className="view-painter" role="status">
      <span>Format painter: click shapes and lines to paint them. Escape stops.</span>
      <button type="button" className="button" onClick={onDone}>
        Done
      </button>
    </div>
  )
}
