import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import {
  ACCESS_TYPES,
  ELEMENT_TYPE_NAMES,
  RELATIONSHIP_TYPE_NAMES,
  type ElementType,
  type RelationshipType,
} from '@/model'
import { ElementShape } from './ElementShape'
import { RelationshipLine } from './RelationshipLine'
import { ELEMENT_NOTATION, notationColourGroup } from './element-notation'
import { DASH, RELATIONSHIP_NOTATION, relationshipHeads } from './relationship-notation'
import { quoteFamily, wrapText, type Measure } from './text'

function svg(node: ReactElement): SVGSVGElement {
  const { container } = render(<svg>{node}</svg>)
  return container.querySelector('svg')!
}

const shape = (type: ElementType, extra: Partial<Parameters<typeof ElementShape>[0]> = {}) =>
  svg(<ElementShape type={type} name="Name" width={120} height={55} {...extra} />)

const LINE = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
]

describe('element shapes', () => {
  // The catalogue is the list of record: a type added there without a shape fails here.
  it.each(ELEMENT_TYPE_NAMES)('%s has a shape that draws something', (type) => {
    expect(ELEMENT_NOTATION[type]).toBeDefined()
    const group = shape(type).querySelector(`[data-shape="${type}"]`)
    expect(group).not.toBeNull()
    expect(group!.querySelectorAll('rect, path, circle, ellipse').length).toBeGreaterThan(0)
  })

  it('draws every type differently', () => {
    // Same name, same size: whatever differs is the notation. Two types sharing an
    // outline, a glyph and a colour group would be indistinguishable on a diagram.
    const markup = new Map<string, ElementType>()
    for (const type of ELEMENT_TYPE_NAMES) {
      const group = shape(type).querySelector('[data-shape]')!
      group.removeAttribute('data-shape')
      const html = group.outerHTML
      expect(markup.get(html), `${type} draws the same as ${markup.get(html)}`).toBeUndefined()
      markup.set(html, type)
    }
    expect(markup.size).toBe(ELEMENT_TYPE_NAMES.length)
  })

  it('draws the alternative figure where ArchiMate defines one, and the rectangle elsewhere', () => {
    const withAlternative = ELEMENT_TYPE_NAMES.filter((t) => ELEMENT_NOTATION[t].alternative)
    expect(withAlternative).toContain('BusinessActor')
    expect(withAlternative).not.toContain('BusinessObject')
    for (const type of ELEMENT_TYPE_NAMES) {
      const group = shape(type, { figure: 'alternative' }).querySelector('[data-shape]')!
      const expected = ELEMENT_NOTATION[type].alternative ? 'alternative' : 'rectangle'
      expect(group.getAttribute('data-figure'), type).toBe(expected)
    }
  })

  it('colours passive structure by its layer, so a business object and a data object differ', () => {
    expect(notationColourGroup('BusinessObject')).toBe('biz')
    expect(notationColourGroup('DataObject')).toBe('app')
    expect(notationColourGroup('Artifact')).toBe('tec')
    expect(notationColourGroup('Material')).toBe('tec')
    // Everything else keeps its catalogue group.
    expect(notationColourGroup('ApplicationComponent')).toBe('app')
    expect(notationColourGroup('Grouping')).toBe('pas')
  })

  it('distinguishes the and-junction from the or-junction', () => {
    const and = shape('Junction', { junctionKind: 'and' }).querySelector('circle')!
    const or = shape('Junction', { junctionKind: 'or' }).querySelector('circle')!
    expect(and.getAttribute('fill')).toBe(and.getAttribute('stroke'))
    expect(or.getAttribute('fill')).not.toBe(or.getAttribute('stroke'))
  })

  it('takes every default colour from the design tokens', () => {
    for (const type of ELEMENT_TYPE_NAMES) {
      const root = shape(type, { junctionKind: 'or' })
      for (const el of root.querySelectorAll('[fill], [stroke]')) {
        for (const attr of ['fill', 'stroke']) {
          const value = el.getAttribute(attr)
          if (value === null) continue
          expect(value, `${type} ${el.tagName} ${attr}`).toMatch(
            /^(var\(--[a-z0-9-]+\)|none|transparent)$/,
          )
        }
      }
    }
  })

  it('lets an appearance override win over the layer colours', () => {
    const root = shape('ApplicationComponent', {
      appearance: { fillColor: '#ff0000', lineColor: '#00ff00', fontColor: '#0000ff' },
    })
    const body = root.querySelector('[data-shape] > rect')!
    expect(body.getAttribute('fill')).toBe('#ff0000')
    expect(body.getAttribute('stroke')).toBe('#00ff00')
    expect(root.querySelector('text')!.getAttribute('fill')).toBe('#0000ff')
  })

  it('honours text alignment and position overrides', () => {
    const defaults = shape('BusinessActor').querySelector('text')!
    expect(defaults.getAttribute('text-anchor')).toBe('middle')
    const left = shape('BusinessActor', {
      appearance: { textAlignment: 'left', textPosition: 'bottom' },
    }).querySelector('text')!
    expect(left.getAttribute('text-anchor')).toBe('start')
    const top = Number(defaults.querySelector('tspan')!.getAttribute('y'))
    const bottom = Number(left.querySelector('tspan')!.getAttribute('y'))
    expect(bottom).toBeGreaterThan(top + 20)
    expect(bottom).toBeLessThanOrEqual(55)
  })

  it('maps font styles onto SVG text attributes', () => {
    const text = shape('Node', {
      appearance: { fontStyle: ['bold', 'italic', 'underline', 'strikethrough'], fontSize: 14 },
    }).querySelector('text')!
    expect(text.getAttribute('font-weight')).toBe('600')
    expect(text.getAttribute('font-style')).toBe('italic')
    expect(text.getAttribute('text-decoration')).toBe('underline line-through')
    expect(text.getAttribute('font-size')).toBe('14')
  })
})

describe('relationship styles', () => {
  it.each(RELATIONSHIP_TYPE_NAMES)('%s has a style', (type) => {
    expect(RELATIONSHIP_NOTATION[type]).toBeDefined()
    const root = svg(<RelationshipLine type={type} points={LINE} />)
    const group = root.querySelector(`[data-relationship="${type}"]`)
    expect(group).not.toBeNull()
    expect(group!.querySelector('path')!.getAttribute('d')).toMatch(/^M/)
  })

  // The specification of record: ArchiMate 3.2 §5 figures. Not the `notation`
  // field on RELATIONSHIP_TYPES, which is the dependency graph's simplification.
  // prettier-ignore
  const SPEC: Record<RelationshipType, [pattern: string, source: string | null, target: string | null]> = {
    Composition:    ['solid',  'filled-diamond', null],
    Aggregation:    ['solid',  'hollow-diamond', null],
    Assignment:     ['solid',  'dot',            'filled-arrow'],
    Realization:    ['dotted', null,             'hollow-triangle'],
    Serving:        ['solid',  null,             'open-arrow'],
    Access:         ['dotted', null,             'small-arrow'],
    Influence:      ['dashed', null,             'open-arrow'],
    Triggering:     ['solid',  null,             'filled-arrow'],
    Flow:           ['dashed', null,             'filled-arrow'],
    Specialization: ['solid',  null,             'hollow-triangle'],
    Association:    ['solid',  null,             null],
  }

  it.each(RELATIONSHIP_TYPE_NAMES)('%s is drawn as the specification draws it', (type) => {
    const [pattern, source, target] = SPEC[type]
    const root = svg(<RelationshipLine type={type} points={LINE} />)
    const line = root.querySelector('[data-relationship] > path')!
    expect(line.getAttribute('stroke-dasharray')).toBe(DASH[pattern as keyof typeof DASH] ?? null)
    const head = (end: string) =>
      root.querySelector(`[data-end="${end}"]`)?.getAttribute('data-head') ?? null
    expect(head('source')).toBe(source)
    expect(head('target')).toBe(target)
  })

  it('points access arrows the way the data goes', () => {
    expect(relationshipHeads('Access', { accessType: 'Write' })).toEqual({ target: 'small-arrow' })
    expect(relationshipHeads('Access', { accessType: 'Read' })).toEqual({ source: 'small-arrow' })
    expect(relationshipHeads('Access', { accessType: 'ReadWrite' })).toEqual({
      source: 'small-arrow',
      target: 'small-arrow',
    })
    expect(relationshipHeads('Access', { accessType: 'Access' })).toEqual({})
    // Every access type is covered by the table above.
    expect(ACCESS_TYPES).toEqual(['Access', 'Read', 'Write', 'ReadWrite'])
  })

  it('draws a half arrow on a directed association only', () => {
    const plain = svg(<RelationshipLine type="Association" points={LINE} />)
    expect(plain.querySelector('[data-head]')).toBeNull()
    const directed = svg(<RelationshipLine type="Association" points={LINE} directed />)
    expect(directed.querySelector('[data-end="target"]')!.getAttribute('data-head')).toBe(
      'half-arrow',
    )
  })

  it('shows an influence modifier as a label', () => {
    const root = svg(<RelationshipLine type="Influence" points={LINE} label="++" />)
    expect(root.querySelector('text')!.textContent).toBe('++')
  })

  it('stops the line short of a closed head, so it does not show through', () => {
    const root = svg(<RelationshipLine type="Specialization" points={LINE} />)
    expect(root.querySelector('[data-relationship] > path')!.getAttribute('d')).toBe('M0,0L88,0')
  })

  it('aims each head along its own end segment of a bent route', () => {
    const bent = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 80 },
    ]
    const root = svg(<RelationshipLine type="Triggering" points={bent} />)
    const head = root.querySelector('[data-end="target"]')!.getAttribute('d')!
    // The arrow arrives travelling down: its base lies 10 above the tip at (50, 80).
    expect(head).toBe('M45.5,70L50,80L54.5,70Z')
  })
})

describe('wrapText', () => {
  // One unit per character, so the expectations are readable.
  const measure: Measure = (text) => text.length

  it('breaks at spaces within the budget', () => {
    expect(wrapText('Claims Registration Service', 12, 'f', { measure })).toEqual([
      'Claims',
      'Registration',
      'Service',
    ])
  })

  it('keeps explicit line breaks, in every spelling', () => {
    expect(wrapText('a\nb\r\nc\rd', 20, 'f', { measure })).toEqual(['a', 'b', 'c', 'd'])
  })

  it('gives lines their own budgets, and keeps a word whole within the hard width', () => {
    // Line 0 is beside the icon: 6 wide. Later lines are 14 wide.
    const width = (i: number) => (i === 0 ? 6 : 14)
    expect(wrapText('Business Collaboration', width, 'f', { hardWidth: 14, measure })).toEqual([
      'Business',
      'Collaboration',
    ])
    expect(wrapText('Go to market', width, 'f', { hardWidth: 14, measure })).toEqual([
      'Go to',
      'market',
    ])
  })

  it('splits a word only when it is wider than the box itself', () => {
    expect(wrapText('Supercalifragilistic', 8, 'f', { measure })).toEqual([
      'Supercal',
      'ifragili',
      'stic',
    ])
  })

  it('ends a cut text in an ellipsis that fits', () => {
    const lines = wrapText('one two three four five', 9, 'f', { maxLines: 2, measure })
    expect(lines).toHaveLength(2)
    expect(lines[1]!.endsWith('…')).toBe(true)
    expect(lines[1]!.length).toBeLessThanOrEqual(9)
  })
})

describe('quoteFamily', () => {
  it('escapes everything that would end or break a CSS string', () => {
    expect(quoteFamily('Plain')).toBe('"Plain"')
    expect(quoteFamily('My "Font"')).toBe('"My \\"Font\\""')
    expect(quoteFamily('back\\slash')).toBe('"back\\\\slash"')
    expect(quoteFamily('two\nlines')).toBe('"two\\a lines"')
    // A name that already looks escaped is escaped again, not passed through.
    expect(quoteFamily('\\a ')).toBe('"\\\\a "')
  })
})
