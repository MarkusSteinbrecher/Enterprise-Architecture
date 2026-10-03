import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ACCESS_TYPES,
  ELEMENT_TYPES,
  RELATIONSHIP_TYPES,
  type Appearance,
  type ElementType,
  type Point,
  type RelationshipType,
} from '@/model'
import { ElementShape } from './ElementShape'
import { RelationshipLine, type RelationshipLineProps } from './RelationshipLine'
import { ELEMENT_NOTATION } from './element-notation'
import './notation-gallery.css'

/**
 * Dev-only gallery (#77): every element shape in both figures and every
 * relationship style with its variants, in the light and dark themes side by
 * side, for review against the ArchiMate 3.2 specification's figures.
 *
 * `?stress=500` instead draws that many shapes in one SVG, for the rendering
 * measurement the issue asks for.
 */
export default function NotationGallery() {
  const [params] = useSearchParams()
  const stress = Number(params.get('stress') ?? 0)
  useLightRoot()
  if (stress > 0) return <Stress count={stress} />
  return (
    <div className="notation-gallery">
      <Panel theme="light" />
      <Panel theme="dark" />
    </div>
  )
}

/**
 * The light tokens live on `:root` only, so a light panel needs a light root; the
 * dark panel then sets `data-theme` on itself. The previous theme is put back on
 * unmount without touching the stored preference.
 */
function useLightRoot() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    return () => {
      if (previous === null) root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', previous)
    }
  }, [])
}

function Panel({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <section
      className="notation-gallery__panel"
      data-theme={theme}
      data-testid={`gallery-${theme}`}
    >
      <h2 className="notation-gallery__title">{theme}</h2>
      <h3 className="notation-gallery__heading">Elements</h3>
      <div className="notation-gallery__grid">
        {ELEMENT_TYPES.map((meta) => (
          <ElementCell key={meta.type} type={meta.type} label={meta.label} code={meta.code} />
        ))}
      </div>
      <h3 className="notation-gallery__heading">Relationships</h3>
      <div className="notation-gallery__lines">
        {RELATIONSHIP_TYPES.map((meta) => (
          <LineCell key={meta.type} caption={meta.label} type={meta.type} />
        ))}
        {ACCESS_TYPES.map((accessType) => (
          <LineCell
            key={accessType}
            caption={`Access · ${accessType}`}
            type="Access"
            accessType={accessType}
          />
        ))}
        <LineCell caption="Association · directed" type="Association" directed />
        <LineCell caption="Influence · modifier" type="Influence" label="++" />
        <LineCell caption="Serving · bent, named" type="Serving" label="serves" bent />
      </div>
      <h3 className="notation-gallery__heading">Appearance overrides</h3>
      <div className="notation-gallery__grid">
        {APPEARANCES.map(([caption, appearance]) => (
          <Cell key={caption} caption={caption} width={140} height={70}>
            <ElementShape
              type="ApplicationComponent"
              name="Claims Engine with a long name that wraps"
              width={140}
              height={70}
              appearance={appearance}
            />
          </Cell>
        ))}
      </div>
    </section>
  )
}

const APPEARANCES: [string, Appearance][] = [
  ['left · bottom', { textAlignment: 'left', textPosition: 'bottom' }],
  ['right · middle', { textAlignment: 'right', textPosition: 'middle' }],
  ['bold italic 14px', { fontStyle: ['bold', 'italic'], fontSize: 14 }],
  ['underline, strike', { fontStyle: ['underline', 'strikethrough'] }],
]

function ElementCell({ type, label, code }: { type: ElementType; label: string; code: string }) {
  const junction = type === 'Junction'
  const w = junction ? 18 : 120
  const h = junction ? 18 : 55
  const alternative = ELEMENT_NOTATION[type].alternative
  return (
    <figure className="notation-gallery__cell" data-type={type}>
      <div className="notation-gallery__figures">
        <svg width={junction ? 60 : w + 2} height={h + 2}>
          <g transform="translate(1 1)">
            {junction ? (
              <>
                <ElementShape type={type} name="" width={w} height={h} />
                <g transform="translate(30 0)">
                  <ElementShape type={type} name="" width={w} height={h} junctionKind="or" />
                </g>
              </>
            ) : (
              <ElementShape type={type} name={label} width={w} height={h} />
            )}
          </g>
        </svg>
        {alternative && (
          <svg width={82} height={82}>
            <g transform="translate(1 1)">
              <ElementShape type={type} name={label} width={80} height={80} figure="alternative" />
            </g>
          </svg>
        )}
      </div>
      <figcaption className="notation-gallery__caption">
        {label} <span className="notation-gallery__code">{code}</span>
      </figcaption>
    </figure>
  )
}

function LineCell({
  caption,
  bent,
  ...props
}: Omit<RelationshipLineProps, 'points'> & { caption: string; bent?: boolean }) {
  const points: Point[] = bent
    ? [
        { x: 10, y: 10 },
        { x: 110, y: 10 },
        { x: 110, y: 34 },
        { x: 210, y: 34 },
      ]
    : [
        { x: 10, y: 22 },
        { x: 210, y: 22 },
      ]
  return (
    <figure
      className="notation-gallery__line"
      data-relationship-cell={props.type as RelationshipType}
    >
      <svg width={220} height={44}>
        <RelationshipLine {...props} points={points} />
      </svg>
      <figcaption className="notation-gallery__caption">{caption}</figcaption>
    </figure>
  )
}

function Cell({
  caption,
  width,
  height,
  children,
}: {
  caption: string
  width: number
  height: number
  children: ReactNode
}) {
  return (
    <figure className="notation-gallery__cell">
      <svg width={width + 2} height={height + 2}>
        <g transform="translate(1 1)">{children}</g>
      </svg>
      <figcaption className="notation-gallery__caption">{caption}</figcaption>
    </figure>
  )
}

/** `count` shapes in one SVG, cycling through every type and both figures. */
function Stress({ count }: { count: number }) {
  const [types] = useState(() => ELEMENT_TYPES.filter((m) => m.type !== 'Junction'))
  // Render start to the frame after the shapes are painted: the measurement script reads it.
  const [started] = useState(() => performance.now())
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        ref.current?.setAttribute(
          'data-render-ms',
          String(Math.round(performance.now() - started)),
        ),
      ),
    )
  }, [started])
  const cols = 20
  const cellW = 140
  const cellH = 75
  const rows = Math.ceil(count / cols)
  return (
    <svg
      ref={ref}
      className="notation-gallery__stress"
      data-testid="stress"
      width={cols * cellW}
      height={rows * cellH}
    >
      {Array.from({ length: count }, (_, i) => {
        const meta = types[i % types.length]!
        const figure = Math.floor(i / types.length) % 2 === 1 ? 'alternative' : 'rectangle'
        return (
          <g
            key={i}
            transform={`translate(${(i % cols) * cellW + 5} ${Math.floor(i / cols) * cellH + 5})`}
          >
            <ElementShape
              type={meta.type}
              name={`${meta.label} ${i}`}
              width={120}
              height={60}
              figure={figure}
            />
          </g>
        )
      })}
    </svg>
  )
}
