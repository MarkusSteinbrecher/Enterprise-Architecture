import { describe, expect, it } from 'vitest'
import { drawnWorkspace } from '@/test/fixtures'
import {
  appearanceFields,
  canPaint,
  colourFromInput,
  fontNameFromInput,
  fontSizeFromInput,
  lineWidthFromInput,
  paintFormat,
  pickUpFormat,
  resetAppearance,
  setAppearanceField,
  setFontStyle,
  sharedFields,
  sharedFontStyle,
  sharedValue,
  withField,
  type Drawing,
} from './appearance'
import type { View } from './workspace'

/** Appearance editing (#135), as pure operations on a view. */

const landscape = (): View => drawnWorkspace().views.find((v) => v.id === 'view-landscape')!
const noJunctions = () => false
const drawing = (view: View, id: string): Drawing =>
  view.nodes.find((n) => n.id === id) ?? view.connections.find((c) => c.id === id)!

describe('the guards between a form and the model (#135)', () => {
  it('takes a colour as the model holds one: lower-case hex, the # optional', () => {
    expect(colourFromInput('#FFAA00')).toBe('#ffaa00')
    expect(colourFromInput('  ffaa00 ')).toBe('#ffaa00')
    expect(colourFromInput('#FFAA0080')).toBe('#ffaa0080')
  })

  it('yields undefined, never "" or "#", for an empty or invalid colour', () => {
    for (const raw of [
      '',
      '   ',
      '#',
      '#ffa',
      '#ffaa0',
      '#ffaa001',
      'red',
      '#ggaa00',
      '##ffaa00',
    ]) {
      expect(colourFromInput(raw), raw).toBeUndefined()
    }
  })

  it('takes a font size in whole points, and a line width in whole pixels, above zero', () => {
    expect(fontSizeFromInput('12')).toBe(12)
    expect(lineWidthFromInput('3')).toBe(3)
    for (const raw of ['', '0', '-2', '10.5', '1e2', 'x', '12pt']) {
      expect(fontSizeFromInput(raw), raw).toBeUndefined()
      expect(lineWidthFromInput(raw), raw).toBeUndefined()
    }
  })

  it('takes a font name trimmed, and an empty one as none', () => {
    expect(fontNameFromInput('  Inter ')).toBe('Inter')
    expect(fontNameFromInput('   ')).toBeUndefined()
  })
})

describe('the fields each drawing has (#135)', () => {
  it('gives a shape a fill and a text box, a line a label position, and a junction neither', () => {
    const view = landscape()
    expect(appearanceFields(drawing(view, 'n-app'), noJunctions)).toContain('fillColor')
    expect(appearanceFields(drawing(view, 'n-app'), noJunctions)).toContain('textPosition')
    expect(appearanceFields(drawing(view, 'c-k8s'), noJunctions)).not.toContain('fillColor')
    expect(appearanceFields(drawing(view, 'c-k8s'), noJunctions)).toContain('labelPosition')
    const junction = (id: string) => id === 'app-claims'
    expect(appearanceFields(drawing(view, 'n-app'), junction)).toEqual([
      'fillColor',
      'lineColor',
      'lineWidth',
    ])
  })

  it('offers a mixed selection only the fields every drawing in it has', () => {
    const view = landscape()
    const fields = sharedFields([drawing(view, 'n-app'), drawing(view, 'c-k8s')], noJunctions)
    expect(fields).toEqual([
      'lineColor',
      'lineWidth',
      'fontName',
      'fontSize',
      'fontColor',
      'fontStyle',
    ])
  })
})

describe('mixed values (#135)', () => {
  it('reads one value, an absence as one value, and a difference as mixed', () => {
    const view = landscape()
    const [group, proc, app] = ['g-claims', 'n-proc', 'n-app'].map((id) => drawing(view, id))
    expect(sharedValue([group!], 'fillColor')).toEqual({ mixed: false, value: '#f5f0e6' })
    expect(sharedValue([proc!, app!], 'fillColor')).toEqual({ mixed: false, value: undefined })
    expect(sharedValue([group!, proc!], 'fillColor')).toEqual({ mixed: true })
  })

  it('reads font styles in any order as one value, and each style as on, off or mixed', () => {
    const a = { ...drawing(landscape(), 'n-app'), appearance: { fontStyle: ['italic', 'bold'] } }
    const b = { ...drawing(landscape(), 'n-proc'), appearance: { fontStyle: ['bold', 'italic'] } }
    expect(sharedValue([a, b] as Drawing[], 'fontStyle')).toEqual({
      mixed: false,
      value: ['bold', 'italic'],
    })
    const c = drawing(landscape(), 'n-k8s')
    expect(sharedFontStyle([a, b] as Drawing[], 'bold')).toBe(true)
    expect(sharedFontStyle([a, c] as Drawing[], 'bold')).toBe('mixed')
    expect(sharedFontStyle([c], 'bold')).toBe(false)
  })
})

describe('setting and resetting a field (#135)', () => {
  it('sets a field on every selected drawing that has it, and leaves the rest alone', () => {
    const view = landscape()
    const ids = new Set(['g-claims', 'n-proc', 'c-k8s'])
    const after = setAppearanceField(view, ids, 'fillColor', '#123456', noJunctions)
    expect(drawing(after, 'g-claims').appearance?.fillColor).toBe('#123456')
    expect(drawing(after, 'n-proc').appearance).toEqual({ fillColor: '#123456' })
    // A line has no fill.
    expect(drawing(after, 'c-k8s')).toBe(drawing(view, 'c-k8s'))
    // Not selected.
    expect(drawing(after, 'n-app')).toBe(drawing(view, 'n-app'))
  })

  it('removes the field on reset, and the appearance with its last field', () => {
    const view = landscape()
    const after = setAppearanceField(view, new Set(['c-k8s']), 'lineColor', undefined, noJunctions)
    expect('appearance' in drawing(after, 'c-k8s')).toBe(false)
    const group = setAppearanceField(
      view,
      new Set(['g-claims']),
      'lineWidth',
      undefined,
      noJunctions,
    )
    expect(drawing(group, 'g-claims').appearance).toEqual({
      fillColor: '#f5f0e6',
      lineColor: '#333333',
    })
  })

  it('returns the view itself when nothing changes, so nothing is recorded', () => {
    const view = landscape()
    expect(
      setAppearanceField(view, new Set(['g-claims']), 'fillColor', '#f5f0e6', noJunctions),
    ).toBe(view)
    expect(setAppearanceField(view, new Set(['n-proc']), 'fillColor', undefined, noJunctions)).toBe(
      view,
    )
    expect(resetAppearance(view, new Set(['n-proc']))).toBe(view)
    expect(setFontStyle(view, new Set(['n-app']), 'bold', true, noJunctions)).toBe(view)
  })

  it('turns a style on and off in the fixed order, and none as no field', () => {
    const view = landscape()
    const on = setFontStyle(view, new Set(['n-app']), 'underline', true, noJunctions)
    expect(drawing(on, 'n-app').appearance?.fontStyle).toEqual(['bold', 'italic', 'underline'])
    const off = setFontStyle(view, new Set(['c-k8s']), 'bold', true, noJunctions)
    const back = setFontStyle(off, new Set(['c-k8s']), 'bold', false, noJunctions)
    expect(drawing(back, 'c-k8s')).toEqual(drawing(view, 'c-k8s'))
    expect(withField({ fontStyle: ['bold'] }, 'fontStyle', [])).toBeUndefined()
  })

  it('resets every override on every selected drawing', () => {
    const view = landscape()
    const after = resetAppearance(view, new Set(['g-claims', 'n-app', 'c-k8s']))
    for (const id of ['g-claims', 'n-app', 'c-k8s']) {
      expect('appearance' in drawing(after, id), id).toBe(false)
    }
  })
})

describe('the format painter (#135)', () => {
  it('copies exactly the source’s overrides, and an absence as an absence', () => {
    const view = landscape()
    // The source overrides the font and the text box, and not the fill.
    const format = pickUpFormat(drawing(view, 'n-app'), noJunctions)!
    // The target overrides the fill, line colour and width: each one the source
    // does not override is cleared, as the source is drawn.
    const after = paintFormat(view, 'g-claims', format, noJunctions)
    expect(drawing(after, 'g-claims').appearance).toEqual(drawing(view, 'n-app').appearance)
  })

  it('paints a drawing with no overrides as one with none', () => {
    const view = landscape()
    const format = pickUpFormat(drawing(view, 'n-proc'), noJunctions)!
    expect(format.appearance).toBeUndefined()
    const after = paintFormat(view, 'g-claims', format, noJunctions)
    expect('appearance' in drawing(after, 'g-claims')).toBe(false)
  })

  it('leaves a field only one of the two has, as Archi does between a shape and a line', () => {
    const view = landscape()
    // A line onto a shape: the line colour comes across, the shape keeps its fill.
    const fromLine = pickUpFormat(drawing(view, 'c-k8s'), noJunctions)!
    const shape = paintFormat(view, 'g-claims', fromLine, noJunctions)
    expect(drawing(shape, 'g-claims').appearance).toEqual({
      fillColor: '#f5f0e6',
      lineColor: '#aa0000',
    })
    // A shape onto a line: the label position stays where it was.
    const labelled = setAppearanceField(
      view,
      new Set(['c-k8s']),
      'labelPosition',
      'source',
      noJunctions,
    )
    const fromShape = pickUpFormat(drawing(view, 'n-app'), noJunctions)!
    const line = paintFormat(labelled, 'c-k8s', fromShape, noJunctions)
    expect(drawing(line, 'c-k8s').appearance).toEqual({
      fontName: 'Inter',
      fontSize: 11,
      fontColor: '#000000',
      fontStyle: ['bold', 'italic'],
      labelPosition: 'source',
    })
  })

  it('paints what was picked up, not what the source became after', () => {
    const view = landscape()
    const format = pickUpFormat(drawing(view, 'g-claims'), noJunctions)!
    const edited = setAppearanceField(
      view,
      new Set(['g-claims']),
      'fillColor',
      '#000000',
      noJunctions,
    )
    const after = paintFormat(edited, 'n-proc', format, noJunctions)
    expect(drawing(after, 'n-proc').appearance?.fillColor).toBe('#f5f0e6')
  })

  it('neither picks up from nor paints onto a junction, as Archi', () => {
    const view = landscape()
    const junction = (id: string) => id === 'proc-claim'
    expect(canPaint(drawing(view, 'n-proc'), junction)).toBe(false)
    expect(pickUpFormat(drawing(view, 'n-proc'), junction)).toBeUndefined()
    const format = pickUpFormat(drawing(view, 'g-claims'), junction)!
    expect(paintFormat(view, 'n-proc', format, junction)).toBe(view)
  })
})
