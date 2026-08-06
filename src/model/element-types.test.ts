import { describe, expect, it } from 'vitest'
import {
  ELEMENT_TYPES,
  ELEMENT_TYPE_LIST,
  ELEMENT_TYPE_NAMES,
  elementTypeMeta,
  elementTypesInLayer,
  findElementType,
  isElementType,
  typeCode,
  typeLabel,
} from './element-types'
import { LAYERS, ASPECTS, COLOUR_GROUPS } from './layers'

describe('element catalogue', () => {
  it('covers every ArchiMate 3.2 layer', () => {
    const layers = new Set(ELEMENT_TYPES.map((m) => m.layer))
    for (const layer of LAYERS) {
      expect(layers, `no element types in layer ${layer}`).toContain(layer)
    }
  })

  it('carries the element counts the specification defines per layer', () => {
    // Strategy 4, Business 13, Application 9, Technology 13, Physical 4,
    // Motivation 10, Implementation & Migration 5, composite/other 3.
    expect(elementTypesInLayer('strategy')).toHaveLength(4)
    expect(elementTypesInLayer('business')).toHaveLength(13)
    expect(elementTypesInLayer('application')).toHaveLength(9)
    expect(elementTypesInLayer('technology')).toHaveLength(13)
    expect(elementTypesInLayer('physical')).toHaveLength(4)
    expect(elementTypesInLayer('motivation')).toHaveLength(10)
    expect(elementTypesInLayer('implementation')).toHaveLength(5)
    expect(elementTypesInLayer('other')).toHaveLength(3)
    expect(ELEMENT_TYPES).toHaveLength(61)
  })

  it('gives every element type unique, well-formed metadata', () => {
    const types = new Set<string>()
    const codes = new Set<string>()
    for (const meta of ELEMENT_TYPES) {
      expect(types.has(meta.type), `duplicate type ${meta.type}`).toBe(false)
      expect(codes.has(meta.code), `duplicate code ${meta.code} on ${meta.type}`).toBe(false)
      types.add(meta.type)
      codes.add(meta.code)

      expect(meta.code, `${meta.type} code`).toMatch(/^[A-Z]{2}$/)
      expect(meta.label.length, `${meta.type} label`).toBeGreaterThan(0)
      expect(LAYERS).toContain(meta.layer)
      expect(ASPECTS).toContain(meta.aspect)
      expect(COLOUR_GROUPS).toContain(meta.colourGroup)
    }
  })

  it('marks exactly the services and interfaces as external', () => {
    const external = ELEMENT_TYPE_LIST.filter((m) => m.external).map((m) => m.type)
    expect(external.toSorted()).toEqual(
      [
        'ApplicationInterface',
        'ApplicationService',
        'BusinessInterface',
        'BusinessService',
        'TechnologyInterface',
        'TechnologyService',
      ].toSorted(),
    )
  })

  it('renders passive structure elements in the slate ramp regardless of layer', () => {
    expect(elementTypeMeta('DataObject').colourGroup).toBe('pas')
    expect(elementTypeMeta('BusinessObject').colourGroup).toBe('pas')
    expect(elementTypeMeta('Artifact').colourGroup).toBe('pas')
    // Strategy renders with Business, Physical with Technology.
    expect(elementTypeMeta('Capability').colourGroup).toBe('biz')
    expect(elementTypeMeta('Facility').colourGroup).toBe('tec')
  })

  it('uses the codes the UI spec names', () => {
    expect(typeCode('ApplicationComponent')).toBe('AC')
    expect(typeCode('Capability')).toBe('CP')
    expect(typeCode('BusinessProcess')).toBe('BP')
    expect(typeCode('DataObject')).toBe('DO')
    expect(typeCode('SystemSoftware')).toBe('SS')
    expect(typeCode('Node')).toBe('NO')
    expect(typeCode('TechnologyService')).toBe('TS')
    expect(typeCode('BusinessActor')).toBe('BA')
    expect(typeCode('Goal')).toBe('GO')
    expect(typeCode('WorkPackage')).toBe('WP')
  })

  it('looks types up by name', () => {
    expect(isElementType('ApplicationComponent')).toBe(true)
    expect(isElementType('MicroserviceMesh')).toBe(false)
    expect(findElementType('MicroserviceMesh')).toBeUndefined()
    expect(typeLabel('ApplicationComponent')).toBe('Application Component')
    expect(() => elementTypeMeta('Nonsense' as never)).toThrow(/Unknown ArchiMate element type/)
    expect(ELEMENT_TYPE_NAMES).toHaveLength(ELEMENT_TYPES.length)
  })
})
