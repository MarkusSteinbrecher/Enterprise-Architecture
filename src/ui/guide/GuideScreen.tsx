import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ELEMENT_TYPES,
  isElementType,
  LAYER_LABELS,
  LAYERS,
  PROFILED_TYPES,
  RELATIONSHIP_TYPES,
  VIEWPOINTS,
  viewpointAllows,
  type Aspect,
  type ElementType,
  type Layer,
  type RelationshipType,
} from '@/model'
import { TypeCodeBadge } from '@/ui/common/TypeCodeBadge'
import { ElementShape, RelationshipLine } from '@/ui/notation'
import {
  ARCHIMATE_VERSION,
  ASPECT_GUIDE,
  CATEGORY_LABELS,
  ELEMENT_GUIDE,
  FURTHER_READING,
  LAYER_GUIDE,
  RELATIONSHIP_GUIDE,
  SOURCES,
  type ReadingItem,
} from './content'
import { CONVENTIONS, PATTERNS, type Pattern } from './patterns'
import { ADRS, citationParts, type Citation, type Guidance } from './sources'
import { connectionsBetween, LOOKUP_TYPES } from './connections'
import './guide.css'

/**
 * The ArchiMate guide (#149): a reference generated from `src/model`, so it
 * cannot drift from what the app enforces, and hand-written patterns for how
 * Archipelago wants things modelled.
 *
 * Every element type has an anchor named after its type (`/guide#DataObject`);
 * the fact sheet's type label and the view editor's palette link there.
 * Arriving on an anchor scrolls to it and moves focus to it, because the user
 * just followed a link to that entry and the link that held focus is gone.
 *
 * Every definition, pattern and convention shows where it comes from (#153):
 * see `sources.ts` for what a citation may claim.
 */

/** The three framework columns; the other aspects sit in a full-width cell. */
const COLUMNS: readonly Aspect[] = ['active-structure', 'behaviour', 'passive-structure']

const SECTIONS = [
  { id: 'start', label: 'Start here' },
  { id: 'framework', label: 'The framework' },
  { id: 'elements', label: 'Elements' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'connections', label: 'What can connect' },
  { id: 'viewpoints', label: 'Viewpoints' },
  { id: 'modelling', label: 'How we model' },
  { id: 'reading', label: 'Sources' },
] as const

const CATEGORIES = ['structural', 'dependency', 'dynamic', 'other'] as const

type ElementMeta = (typeof ELEMENT_TYPES)[number]
type RelationshipMeta = (typeof RELATIONSHIP_TYPES)[number]

function typesIn(layer: Layer): readonly ElementMeta[] {
  return ELEMENT_TYPES.filter((meta) => meta.layer === layer)
}

function labelOf(type: ElementType): string {
  return ELEMENT_TYPES.find((meta) => meta.type === type)?.label ?? type
}

export function GuideScreen() {
  const { hash } = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1))
    if (!id) return
    const target = document.getElementById(id)
    if (!target || !scrollRef.current?.contains(target)) return
    target.scrollIntoView({ block: 'start' })
    target.focus({ preventScroll: true })
  }, [hash])

  return (
    <div className="guide" ref={scrollRef}>
      <div className="guide__inner">
        <header className="guide__header">
          <div className="section-label">Reference</div>
          <h1 className="guide__title">ArchiMate guide</h1>
          <p className="guide__lead">
            ArchiMate is The Open Group&rsquo;s language for describing an enterprise: what it does,
            who does it, which systems and technology support it, why, and how it changes. It gives
            each concept a name, a meaning and a symbol, and says which concepts may be related and
            how. This page explains the language as Archipelago uses it.
          </p>
          <p className="guide__version">
            Archipelago implements <span className="mono">ArchiMate {ARCHIMATE_VERSION}</span>.
            ArchiMate 4, published in April 2026, is not supported yet (
            <a href={ADRS['0011'].href} target="_blank" rel="noreferrer">
              ADR 0011
            </a>
            ).
          </p>
          <nav className="guide__toc" aria-label="Guide sections">
            {SECTIONS.map((section) => (
              <Link key={section.id} to={{ hash: section.id }} className="guide__toc-link">
                {section.label}
              </Link>
            ))}
          </nav>
        </header>

        <StartHere />
        <Framework />
        <Elements />
        <Relationships />
        <ConnectionLookup />
        <Viewpoints />
        <Modelling />
        <Reading />

        <footer className="guide__footer">
          ArchiMate® is a registered trademark of The Open Group. This guide is written for
          Archipelago and describes the language in its own words; the specification is the
          normative text. Archipelago is not affiliated with or endorsed by The Open Group.
        </footer>
      </div>
    </div>
  )
}

// ── Sections ──────────────────────────────────────────────────────────────────

function Section({
  id,
  title,
  lead,
  cite,
  children,
}: {
  id: string
  title: string
  lead?: string
  /** Where the section as a whole comes from. */
  cite?: readonly Citation[]
  children: React.ReactNode
}) {
  return (
    <section className="guide__section" aria-labelledby={id}>
      <h2 className="guide__h2" id={id} tabIndex={-1}>
        {title}
      </h2>
      {lead && <p className="guide__text">{lead}</p>}
      {children}
      {cite && <Citations citations={cite} />}
    </section>
  )
}

/** One citation as a link: the work, then the place in it. */
function CitationLink({ citation }: { citation: Citation }) {
  const { label, at, href } = citationParts(citation)
  return (
    <>
      <a href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
      {at && <>, {at}</>}
    </>
  )
}

function Citations({
  citations,
  prefix = 'Source',
}: {
  citations: readonly Citation[]
  prefix?: string
}) {
  return (
    <p className="guide__cite" data-cite>
      <span className="guide__cite-label">{prefix}:</span>{' '}
      {citations.map((citation, index) => (
        <span key={JSON.stringify(citation)}>
          {index > 0 && '; '}
          <CitationLink citation={citation} />
        </span>
      ))}
    </p>
  )
}

/** Archipelago's own advice, kept visibly apart from the definition above it. */
function GuidanceNote({ guidance }: { guidance: Guidance }) {
  return (
    <p className="guide__guidance" data-guidance>
      <span className="guide__cite-label">Archipelago:</span> {guidance.text}
      {guidance.see && (
        <>
          {' '}
          (see <CitationLink citation={guidance.see} />)
        </>
      )}
    </p>
  )
}

function TypeLink({ type }: { type: ElementType }) {
  return (
    <Link to={{ hash: type }} className="guide__type-link">
      <TypeCodeBadge type={type} size={17} />
      <span>{labelOf(type)}</span>
    </Link>
  )
}

function StartHere() {
  const starters = ELEMENT_TYPES.filter((meta) => ELEMENT_GUIDE[meta.type].starter)
  return (
    <Section
      id="start"
      title="Start here"
      lead={`ArchiMate ${ARCHIMATE_VERSION} has ${ELEMENT_TYPES.length} element types and ${RELATIONSHIP_TYPES.length} relationship types. Most models need far fewer. These ${starters.length} cover an application portfolio, the business it supports, the infrastructure under it and the reasons for change. Add others when a question needs them.`}
    >
      <ul className="guide__chips" aria-label="Element types to start with">
        {starters.map((meta) => (
          <li key={meta.type}>
            <TypeLink type={meta.type} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Framework() {
  return (
    <Section
      id="framework"
      title="The framework"
      lead="ArchiMate sorts its elements along two dimensions. Layers say which part of the enterprise an element belongs to. Aspects say what kind of thing it is: something that acts, something that happens, or something that is acted on. The same three aspects repeat in each core layer, which is what makes the language regular."
      cite={[{ work: 'spec' }]}
    >
      <div className="guide__framework" role="table" aria-label="ArchiMate framework">
        <div className="guide__fw-row guide__fw-row--head" role="row">
          <div className="guide__fw-corner" role="columnheader">
            Layer
          </div>
          {COLUMNS.map((aspect) => (
            <div key={aspect} className="guide__fw-head" role="columnheader">
              <span className="guide__fw-aspect">{ASPECT_GUIDE[aspect].label}</span>
              <span className="guide__fw-aspect-note">{ASPECT_GUIDE[aspect].summary}</span>
            </div>
          ))}
        </div>
        {LAYERS.map((layer) => {
          const types = typesIn(layer)
          const spanning = types.filter((meta) => !COLUMNS.includes(meta.aspect))
          return (
            <div key={layer} className="guide__fw-row" role="row">
              <div className="guide__fw-layer" role="rowheader">
                <Link to={{ hash: `layer-${layer}` }}>{LAYER_LABELS[layer]}</Link>
                <span className="guide__fw-layer-note">{LAYER_GUIDE[layer]}</span>
              </div>
              {spanning.length === types.length ? (
                <FrameworkCell types={types} wide />
              ) : (
                <>
                  {COLUMNS.map((aspect) => (
                    <FrameworkCell
                      key={aspect}
                      label={ASPECT_GUIDE[aspect].label}
                      types={types.filter((meta) => meta.aspect === aspect)}
                    />
                  ))}
                  {spanning.length > 0 && <FrameworkCell types={spanning} wide />}
                </>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function FrameworkCell({
  types,
  wide = false,
  label,
}: {
  types: readonly ElementMeta[]
  wide?: boolean
  label?: string
}) {
  return (
    <div className={`guide__fw-cell${wide ? ' guide__fw-cell--wide' : ''}`} role="cell">
      {/* Shown only when the grid collapses to one column and the headings are gone. */}
      {label && types.length > 0 && <span className="guide__fw-cell-label">{label}</span>}
      {types.map((meta) => (
        <TypeLink key={meta.type} type={meta.type} />
      ))}
    </div>
  )
}

function Elements() {
  return (
    <Section
      id="elements"
      title="Elements"
      lead="Every element type, by layer. Each shows the two-letter code that lists, cards and the graph use, and the symbol views draw. Each definition paraphrases the specification's section on that concept; advice marked Archipelago is our own."
    >
      {LAYERS.map((layer) => (
        <div key={layer} className="guide__group">
          <h3 className="guide__h3" id={`layer-${layer}`} tabIndex={-1}>
            {LAYER_LABELS[layer]}
          </h3>
          <p className="guide__text guide__text--muted">{LAYER_GUIDE[layer]}</p>
          <div className="guide__entries">
            {typesIn(layer).map((meta) => (
              <ElementEntry key={meta.type} meta={meta} />
            ))}
          </div>
        </div>
      ))}
    </Section>
  )
}

function ElementEntry({ meta }: { meta: ElementMeta }) {
  const type = meta.type
  const guide = ELEMENT_GUIDE[type]
  return (
    <article
      className="guide__entry"
      id={type}
      tabIndex={-1}
      aria-labelledby={`${type}-label`}
      data-type={type}
    >
      <div className="guide__entry-symbols" aria-hidden="true">
        <TypeCodeBadge type={type} size={26} />
        <ElementGlyph type={type} />
      </div>
      <div className="guide__entry-body">
        <h4 className="guide__h4" id={`${type}-label`}>
          {meta.label}
        </h4>
        <div className="guide__entry-meta">
          <span>{meta.code}</span>
          <span>{type}</span>
          <span>{ASPECT_GUIDE[meta.aspect].label.toLowerCase()}</span>
        </div>
        <p className="guide__entry-summary">{guide.summary}</p>
        {guide.guidance && <GuidanceNote guidance={guide.guidance} />}
        <p className="guide__entry-example">
          <span className="guide__entry-example-label">e.g.</span> {guide.example}
        </p>
        <Citations citations={[{ work: 'spec', at: meta.label }]} />
      </div>
    </article>
  )
}

function ElementGlyph({ type }: { type: ElementType }) {
  const w = 56
  const h = 32
  return (
    <svg className="guide__glyph" width={w + 2} height={h + 2} viewBox={`-1 -1 ${w + 2} ${h + 2}`}>
      {type === 'Junction' ? (
        <g transform={`translate(${w / 2 - 7} ${h / 2 - 7})`}>
          <ElementShape type="Junction" name="" width={14} height={14} junctionKind="and" />
        </g>
      ) : (
        <ElementShape type={type} name="" width={w} height={h} />
      )}
    </svg>
  )
}

function Relationships() {
  return (
    <Section
      id="relationships"
      title="Relationships"
      lead="Relationships join elements. Each has a direction, from source to target, and a fixed meaning; which ones are allowed between two element types is set by the specification, as Archi enforces it."
    >
      {CATEGORIES.map((category) => (
        <div key={category} className="guide__group">
          <h3 className="guide__h3">{CATEGORY_LABELS[category]}</h3>
          <div className="guide__entries">
            {RELATIONSHIP_TYPES.filter((meta) => meta.category === category).map((meta) => (
              <RelationshipEntry key={meta.type} meta={meta} />
            ))}
          </div>
        </div>
      ))}
    </Section>
  )
}

function RelationshipEntry({ meta }: { meta: RelationshipMeta }) {
  const type = meta.type
  const guide = RELATIONSHIP_GUIDE[type]
  return (
    <article
      className="guide__entry"
      id={`rel-${type}`}
      tabIndex={-1}
      aria-labelledby={`rel-${type}-label`}
      data-relationship={type}
    >
      <div className="guide__entry-symbols" aria-hidden="true">
        <svg className="guide__glyph" width={72} height={20} viewBox="0 0 72 20">
          <RelationshipLine
            type={type}
            points={[
              { x: 2, y: 10 },
              { x: 70, y: 10 },
            ]}
          />
        </svg>
      </div>
      <div className="guide__entry-body">
        <h4 className="guide__h4 mono" id={`rel-${type}-label`}>
          {meta.label}
        </h4>
        <div className="guide__entry-meta">
          <span>{meta.abbr}</span>
          <span>{meta.directed ? 'directed' : 'undirected unless marked'}</span>
        </div>
        <p className="guide__entry-summary">{guide.summary}</p>
        {guide.guidance && <GuidanceNote guidance={guide.guidance} />}
        <p className="guide__entry-example">
          <span className="guide__entry-example-label">e.g.</span> {guide.example}
        </p>
        <Citations citations={[{ work: 'spec', at: `${meta.label} relationship` }]} />
      </div>
    </article>
  )
}

function TypeSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: ElementType
  onChange: (type: ElementType) => void
}) {
  return (
    <label className="guide__lookup-field">
      <span className="section-label">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          // A <select> is untrusted input like any other (CLAUDE.md).
          if (isElementType(event.target.value)) onChange(event.target.value)
        }}
      >
        {LAYERS.map((layer) => {
          const options = LOOKUP_TYPES.filter((meta) => meta.layer === layer)
          if (options.length === 0) return null
          return (
            <optgroup key={layer} label={LAYER_LABELS[layer]}>
              {options.map((meta) => (
                <option key={meta.type} value={meta.type}>
                  {meta.label}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
    </label>
  )
}

function ConnectionLookup() {
  const [source, setSource] = useState<ElementType>('ApplicationComponent')
  const [target, setTarget] = useState<ElementType>('DataObject')
  const { forward, reverse } = connectionsBetween(source, target)
  const sourceLabel = labelOf(source)
  const targetLabel = labelOf(target)

  return (
    <Section
      id="connections"
      title="What can connect to what"
      lead="Pick two element types to see which relationships ArchiMate allows between them. This is the same table the view editor's connect menu and the fact sheet's relation picker use. Junctions are left out: what a junction allows depends on the relationships already on it."
      cite={[
        { work: 'archi', at: 'model/relationships.xml' },
        { work: 'adr', adr: '0009' },
      ]}
    >
      <div className="guide__lookup">
        <div className="guide__lookup-controls">
          <TypeSelect label="From" value={source} onChange={setSource} />
          <button
            type="button"
            className="guide__lookup-swap"
            onClick={() => {
              setSource(target)
              setTarget(source)
            }}
            aria-label="Swap source and target"
            title="Swap source and target"
          >
            ⇄
          </button>
          <TypeSelect label="To" value={target} onChange={setTarget} />
        </div>
        <ConnectionList
          testId="connections-forward"
          heading={`${sourceLabel} → ${targetLabel}`}
          types={forward}
        />
        <ConnectionList
          testId="connections-reverse"
          heading={`${targetLabel} → ${sourceLabel}`}
          types={reverse}
        />
      </div>
    </Section>
  )
}

/**
 * One direction of the lookup. Exported for its test: Archi's matrix allows at
 * least Association between every pair of types, so the empty branch cannot be
 * reached from the selects today, and a newer matrix could change that.
 */
export function ConnectionList({
  heading,
  types,
  testId,
}: {
  heading: string
  types: readonly RelationshipType[]
  testId: string
}) {
  return (
    <div className="guide__lookup-result" data-testid={testId} aria-live="polite">
      <h3 className="guide__lookup-heading">{heading}</h3>
      {types.length === 0 ? (
        <p className="guide__text guide__text--muted">No relationship is allowed this way.</p>
      ) : (
        <ul className="guide__lookup-list">
          {types.map((type) => (
            <li key={type} className="guide__lookup-item" data-relationship={type}>
              <Link to={{ hash: `rel-${type}` }} className="mono">
                {type}
              </Link>
              <span>{RELATIONSHIP_GUIDE[type].summary}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Viewpoints() {
  return (
    <Section
      id="viewpoints"
      title="Viewpoints"
      lead="A viewpoint is a recipe for a view aimed at particular concerns: it limits which element types the view may hold. When a view has a viewpoint, the editor's palette offers only these types. Junction and Grouping are allowed in every viewpoint."
      cite={[{ work: 'spec' }, { work: 'archi', at: 'model/viewpoints.xml' }]}
    >
      <div className="guide__viewpoints">
        {VIEWPOINTS.map((viewpoint) => {
          const all = viewpoint.types === 'all'
          const allowed = all
            ? []
            : ELEMENT_TYPES.filter((meta) => viewpointAllows(viewpoint.name, meta.type))
          return (
            <div
              key={viewpoint.id}
              className="guide__viewpoint"
              id={`viewpoint-${viewpoint.id}`}
              data-viewpoint={viewpoint.name}
            >
              <h3 className="guide__h4">{viewpoint.name}</h3>
              {all ? (
                <p className="guide__text guide__text--muted">Allows every element type.</p>
              ) : (
                <ul className="guide__codes" aria-label={`Types in ${viewpoint.name}`}>
                  {allowed.map((meta) => (
                    <li key={meta.type} data-type={meta.type}>
                      <Link to={{ hash: meta.type }} title={meta.label}>
                        <TypeCodeBadge type={meta.type} size={19} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function Modelling() {
  return (
    <Section
      id="modelling"
      title="How we model in Archipelago"
      lead="Patterns for the questions most EA teams start with. Each relationship below is one the editor accepts. Use the names as a guide to the level of detail, not as a template to copy. Each pattern names the source it is adapted from; the notes under it are Archipelago's guidance."
    >
      {PATTERNS.map((pattern) => (
        <PatternBlock key={pattern.id} pattern={pattern} />
      ))}
      {CONVENTIONS.map((convention) => (
        <div
          key={convention.id}
          className="guide__group"
          id={`convention-${convention.id}`}
          tabIndex={-1}
        >
          <h3 className="guide__h3">{convention.title}</h3>
          {convention.paragraphs.map((paragraph) => (
            <p key={paragraph} className="guide__text">
              {paragraph}
            </p>
          ))}
          {convention.id === 'portfolio-fields' && (
            <ul className="guide__chips" aria-label="Types with portfolio fields">
              {PROFILED_TYPES.map((type) => (
                <li key={type}>
                  <TypeLink type={type} />
                </li>
              ))}
            </ul>
          )}
          <Citations citations={[convention.source]} />
        </div>
      ))}
    </Section>
  )
}

function PatternBlock({ pattern }: { pattern: Pattern }) {
  return (
    <div
      className="guide__group"
      id={`pattern-${pattern.id}`}
      tabIndex={-1}
      data-pattern={pattern.id}
    >
      <h3 className="guide__h3">{pattern.title}</h3>
      <p className="guide__text">{pattern.intro}</p>
      <ol className="guide__steps">
        {pattern.steps.map((step) => (
          <li
            key={JSON.stringify([step.source, step.type, step.target])}
            className="guide__step"
            data-step={JSON.stringify([step.source, step.type, step.target])}
          >
            <span className="guide__step-triple">
              <TypeLink type={step.source} />
              <Link to={{ hash: `rel-${step.type}` }} className="guide__step-rel mono">
                {step.type}
              </Link>
              <TypeLink type={step.target} />
            </span>
            <span className="guide__step-reads">{step.reads}</span>
          </li>
        ))}
      </ol>
      {pattern.notes.map((note) => (
        <p key={note} className="guide__note">
          {note}
        </p>
      ))}
      <Citations
        citations={pattern.sources}
        prefix={
          pattern.sources.some((source) => source.work === 'cookbook') ? 'Adapted from' : 'Source'
        }
      />
    </div>
  )
}

function Reading() {
  return (
    <Section id="reading" title="Sources and further reading">
      <h3 className="guide__h3">Sources</h3>
      <ReadingList items={SOURCES} label="Sources this guide cites" />
      <h3 className="guide__h3">Further reading</h3>
      <ReadingList items={FURTHER_READING} label="Further reading" />
    </Section>
  )
}

function ReadingList({ items, label }: { items: readonly ReadingItem[]; label: string }) {
  return (
    <ul className="guide__reading" aria-label={label}>
      {items.map((item) => (
        <li key={item.title}>
          {item.href ? (
            <a href={item.href} target="_blank" rel="noreferrer" className="guide__reading-title">
              {item.title}
            </a>
          ) : (
            <span className="guide__reading-title">{item.title}</span>
          )}
          <span className="guide__reading-by">
            {item.by}
            {item.edition && ` · ${item.edition}`}
          </span>
          <span className="guide__reading-note">{item.note}</span>
        </li>
      ))}
    </ul>
  )
}
