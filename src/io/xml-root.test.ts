import { describe, expect, it } from 'vitest'
import { xmlRoot } from './xml-root'

describe('the root element’s namespace (#99)', () => {
  it('resolves a prefixed root through its own declaration', () => {
    expect(xmlRoot('<a:model xmlns="urn:default" xmlns:a="urn:a"/>')).toEqual({
      local: 'model',
      namespace: 'urn:a',
    })
  })

  it('resolves an unprefixed root through the default namespace, in either quote style', () => {
    expect(xmlRoot(`<model xmlns:a="urn:a" xmlns='urn:default'>`)).toEqual({
      local: 'model',
      namespace: 'urn:default',
    })
  })

  it('reports no namespace when the root declares none, or an empty one', () => {
    expect(xmlRoot('<model name="m">')).toEqual({ local: 'model' })
    expect(xmlRoot('<model xmlns="">')).toEqual({ local: 'model' })
    // A declaration for some other prefix is not the root's.
    expect(xmlRoot('<a:model xmlns:b="urn:b">')).toEqual({ local: 'model' })
  })

  it('skips a byte-order mark, the declaration, comments, instructions and a doctype', () => {
    const prolog =
      '﻿<?xml version="1.0"?>\n<!-- <model xmlns="urn:comment"> -->\n<?pi <model?>\n' +
      '<!DOCTYPE model [ <!ENTITY e "a > b <model xmlns=\'urn:doctype\'>"> ]>\n'
    expect(xmlRoot(`${prolog}<model xmlns="urn:real">`)).toEqual({
      local: 'model',
      namespace: 'urn:real',
    })
  })

  it('reads past a > inside an attribute value', () => {
    expect(xmlRoot('<model name="A > B" xmlns="urn:after">')).toEqual({
      local: 'model',
      namespace: 'urn:after',
    })
  })

  it('decodes entities in the namespace, and leaves an impossible one as written', () => {
    expect(xmlRoot('<model xmlns="urn:a&amp;b&#x2F;c&#47;">')?.namespace).toBe('urn:a&b/c/')
    expect(xmlRoot('<model xmlns="urn:&#x110000;">')?.namespace).toBe('urn:&#x110000;')
  })

  it('finds no root in text that has none', () => {
    expect(xmlRoot('')).toBeUndefined()
    expect(xmlRoot('just text')).toBeUndefined()
    expect(xmlRoot('<!-- unterminated')).toBeUndefined()
  })
})
