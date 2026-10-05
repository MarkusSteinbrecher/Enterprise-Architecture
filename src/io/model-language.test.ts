import { describe, expect, it } from 'vitest'
import type { Workspace } from '@/model'
import { drawnWorkspace } from '@/test/fixtures'
import { fromCanonicalJson, toCanonicalJson } from './canonical-json'
import { Ledger } from './consumption'
import { exportExchange, importExchangeXml } from './exchange-format'
import type { ImportResult } from './problems'
import claimsDe from './fixtures/claims-platform.de.xml?raw'
import claimsEn from './fixtures/claims-platform.xml?raw'

/**
 * A model keeps the language its texts were written in (#111). The exchange
 * reader took each text and ignored its `xml:lang`; the writer labelled every
 * text `en`. A model authored in German came back out claiming English, and
 * nothing said so.
 */

function workspaceOf(result: ImportResult): Workspace {
  if (!result.workspace) throw new Error(JSON.stringify(result.problems))
  return result.workspace
}

const codes = (result: { problems: readonly { code: string }[] }) =>
  result.problems.map((p) => p.code)

/** Every `xml:lang` in the file, by tag. */
function languages(xml: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [, tag] of xml.matchAll(/xml:lang="([^"]*)"/g)) out[tag!] = (out[tag!] ?? 0) + 1
  return out
}

const relabelled = (result: ImportResult) =>
  result.problems.filter((p) => p.code === 'exchange.language-relabelled')

/** A model whose texts each carry the language given, or none for `null`. */
function model(texts: {
  model?: string | null
  element?: string | null
  relationship?: string | null
  value?: string | null
  extra?: string
}): string {
  const lang = (tag: string | null | undefined) =>
    tag === null ? '' : ` xml:lang="${tag ?? 'de'}"`
  return `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="m">
  <name${lang(texts.model)}>Schadenplattform</name>
  <elements>
    <element identifier="e1" xsi:type="ApplicationComponent">
      <name${lang(texts.element)}>Schadenportal</name>
      <properties>
        <property propertyDefinitionRef="p1"><value${lang(texts.value)}>Team Schaden</value></property>
      </properties>
    </element>
    <element identifier="e2" xsi:type="ApplicationComponent"><name xml:lang="de">Kernsystem</name></element>
  </elements>
  <relationships>
    <relationship identifier="r1" source="e1" target="e2" xsi:type="Flow">
      <name${lang(texts.relationship)}>Schadenmeldung</name>${texts.extra ?? ''}
    </relationship>
  </relationships>
  <propertyDefinitions>
    <propertyDefinition identifier="p1" type="string"><name xml:lang="de">Verantwortlich</name></propertyDefinition>
  </propertyDefinitions>
</model>`
}

describe('a model keeps its language through the exchange format (#111)', () => {
  it('reads Archi’s German export as a German model, and writes it back in German', () => {
    // Archi 5.10 labels every text with the one language its export is given
    // (scripts/fixtures/export-with-archi.sh, --xmlexchange.exportLang de).
    expect(Object.keys(languages(claimsDe))).toEqual(['de'])
    const result = importExchangeXml(claimsDe)
    const workspace = workspaceOf(result)
    expect(workspace.language).toBe('de')
    expect(relabelled(result)).toEqual([])

    const { xml } = exportExchange(workspace)
    expect(languages(xml)).toEqual({ de: languages(xml).de })
    expect(languages(xml).de).toBeGreaterThan(0)
  })

  it('reads the German export as the same model as the English one, but for its language', () => {
    const de = workspaceOf(importExchangeXml(claimsDe))
    const en = workspaceOf(importExchangeXml(claimsEn))
    expect(en.elements.length).toBeGreaterThan(0)
    expect(en.views.length).toBeGreaterThan(0)
    expect(de).toEqual({ ...en, language: 'de' })
  })

  it('labels every text it writes, folders and views included, in the model’s language', () => {
    const { xml, problems } = exportExchange({ ...drawnWorkspace(), language: 'de-CH' })
    expect(xml).toContain('<organizations>')
    expect(xml).toContain('<views>')
    expect(xml).toContain('<value xml:lang="de-CH">')
    expect(Object.keys(languages(xml))).toEqual(['de-CH'])
    expect(problems.map((p) => p.code)).not.toContain('exchange.language-invalid')
  })

  it('survives a second round trip unchanged', () => {
    const once = workspaceOf(
      importExchangeXml(exportExchange(workspaceOf(importExchangeXml(claimsDe))).xml),
    )
    const twice = workspaceOf(importExchangeXml(exportExchange(once).xml))
    expect(once.language).toBe('de')
    expect(toCanonicalJson(twice)).toBe(toCanonicalJson(once))
  })

  it('holds an English model with no language at all, as before', () => {
    const result = importExchangeXml(claimsEn)
    expect(Object.keys(languages(claimsEn))).toEqual(['en'])
    expect('language' in workspaceOf(result)).toBe(false)
    expect(relabelled(result)).toEqual([])
  })

  it('takes no language from untagged texts, and says nothing', () => {
    // `xml:lang=""` says outright that a text has no language.
    const untagged = model({}).replaceAll(' xml:lang="de"', '')
    const unlabelled = model({}).replaceAll('xml:lang="de"', 'xml:lang=""')
    expect(languages(untagged)).toEqual({})
    expect(languages(unlabelled)).toEqual({ '': 6 })
    for (const xml of [untagged, unlabelled]) {
      const result = importExchangeXml(xml)
      expect(workspaceOf(result).elements).toHaveLength(2)
      expect('language' in workspaceOf(result)).toBe(false)
      expect(relabelled(result)).toEqual([])
      expect(codes(result)).not.toContain('import.content-unread')
    }
  })
})

describe('a text in another language than the model’s (#111)', () => {
  it('is reported, because the export relabels it', () => {
    const result = importExchangeXml(model({ element: 'en', value: 'fr' }))
    expect(workspaceOf(result).language).toBe('de')
    const [report, ...more] = relabelled(result)
    expect(more).toEqual([])
    expect(report?.severity).toBe('info')
    expect(report?.message).toContain('2 texts are not labelled de')
    expect(report?.message).toContain('en (1)')
    expect(report?.message).toContain('fr (1)')
    expect(report?.message).toContain('an export labels them de')

    const { xml } = exportExchange(workspaceOf(result))
    expect(Object.keys(languages(xml))).toEqual(['de'])
  })

  it('stays en when the tag most texts carry is one the schema does not allow', () => {
    // Written back, every text would fail the schema, so it cannot be held. A
    // minority tag is no better a guess for the texts that carry it (#114 review).
    const result = importExchangeXml(
      model({ model: 'en_GB', element: 'en_GB', relationship: 'en_GB', value: 'en_GB' }),
    )
    expect(
      languages(model({ model: 'en_GB', element: 'en_GB', relationship: 'en_GB', value: 'en_GB' })),
    ).toEqual({ en_GB: 4, de: 2 })
    expect('language' in workspaceOf(result)).toBe(false)
    const [report] = relabelled(result)
    expect(report?.message).toContain('6 texts are not labelled en: “en_GB” (4), de (2)')
  })

  it('leaves the model in English when no tag can be held', () => {
    const xml = model({}).replaceAll('xml:lang="de"', 'xml:lang="x_y"')
    const result = importExchangeXml(xml)
    expect('language' in workspaceOf(result)).toBe(false)
    expect(relabelled(result)[0]?.message).toContain('not labelled en: “x_y” (6)')
  })

  it('settles a tie the same way whatever order the file is in', () => {
    // Three texts in each language, swapped between the two files.
    const one = model({ model: 'fr', element: 'fr', relationship: 'fr', value: 'de' })
    const other = one
      .replaceAll('xml:lang="fr"', 'xml:lang="§"')
      .replaceAll('xml:lang="de"', 'xml:lang="fr"')
      .replaceAll('xml:lang="§"', 'xml:lang="de"')
    expect(languages(one)).toEqual({ de: 3, fr: 3 })
    expect(languages(other)).toEqual({ de: 3, fr: 3 })
    expect(workspaceOf(importExchangeXml(one)).language).toBe('de')
    expect(workspaceOf(importExchangeXml(other)).language).toBe('de')
  })

  it('does not count a text the model does not keep', () => {
    // Relationship documentation is reported as not imported (#95), so the
    // export does not relabel it: it does not write it at all.
    const result = importExchangeXml(
      model({ extra: '\n      <documentation xml:lang="fr">Meldung</documentation>' }),
    )
    expect(codes(result)).toContain('import.relationship-documentation-skipped')
    expect(relabelled(result)).toEqual([])
  })

  it('does not count a second language, which is reported on its own', () => {
    const result = importExchangeXml(
      model({}).replace(
        '<name xml:lang="de">Kernsystem</name>',
        '<name xml:lang="de">Kernsystem</name><name xml:lang="en">Core system</name>',
      ),
    )
    expect(codes(result)).toContain('import.content-unread')
    expect(relabelled(result)).toEqual([])
  })
})

describe('only a text the model keeps decides its language (#114 review)', () => {
  it('does not count the texts of an object skipped after it was read', () => {
    // A duplicate id is found only once the element has been read, by which
    // time its name was marked. The copy is skipped, so nothing relabels it.
    const result = importExchangeXml(
      model({}).replace(
        '<element identifier="e2" xsi:type="ApplicationComponent"><name xml:lang="de">Kernsystem</name></element>',
        '<element identifier="e2" xsi:type="ApplicationComponent"><name xml:lang="de">Kernsystem</name></element>' +
          '<element identifier="e2" xsi:type="ApplicationComponent"><name xml:lang="en">Core</name></element>',
      ),
    )
    expect(codes(result)).toContain('exchange.duplicate-id')
    expect(workspaceOf(result).language).toBe('de')
    expect(relabelled(result)).toEqual([])
  })

  it('still counts what a skipped shape keeps nested inside it', () => {
    const ledger = new Ledger()
    const nested = { label: { '#text': 'Innen', '@lang': 'fr' } }
    const shape = { label: { '#text': 'Außen', '@lang': 'en' }, node: [nested] }
    ledger.text(shape, 'label')
    ledger.text(nested, 'label')
    ledger.skip(shape, ['node'])
    expect(ledger.languages()).toEqual({ tagged: new Map([['fr', 1]]), untagged: 0 })
  })

  it('does not let model properties it drops, or their definitions, outvote what it keeps', () => {
    // Model-level properties from another tool are reported as not imported, so
    // their values and their definitions' names are never written (code-review
    // probe, #114: one kept German name against four dropped English texts).
    const xml = `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m">
  <name xml:lang="de">Modell</name>
  <properties>
    <property propertyDefinitionRef="p1"><value xml:lang="en">a</value></property>
    <property propertyDefinitionRef="p2"><value xml:lang="en">b</value></property>
  </properties>
  <propertyDefinitions>
    <propertyDefinition identifier="p1" type="string"><name xml:lang="en">one</name></propertyDefinition>
    <propertyDefinition identifier="p2" type="string"><name xml:lang="en">two</name></propertyDefinition>
  </propertyDefinitions>
</model>`
    const result = importExchangeXml(xml)
    expect(codes(result)).toContain('exchange.model-properties-skipped')
    expect(workspaceOf(result).language).toBe('de')
    expect(relabelled(result)).toEqual([])
  })

  it('counts a definition’s name once a kept property uses it', () => {
    const result = importExchangeXml(
      model({}).replace(
        '<name xml:lang="de">Verantwortlich</name>',
        '<name xml:lang="fr">Responsable</name>',
      ),
    )
    expect(relabelled(result)[0]?.message).toContain('1 text is not labelled de: fr (1)')
  })

  it('does not count a fixed folder’s label, which Archipelago writes itself', () => {
    const result = importExchangeXml(
      model({}).replace(
        '</relationships>',
        '</relationships>\n  <organizations><item><label xml:lang="en">Application</label><item identifierRef="e1"/></item></organizations>',
      ),
    )
    expect(workspaceOf(result).elements).toHaveLength(2)
    expect(codes(result)).not.toContain('import.content-unread')
    expect(relabelled(result)).toEqual([])
  })

  it('does not count an empty text, which says nothing in any language', () => {
    // Empty documentation is not kept and not written, so it is not relabelled.
    const result = importExchangeXml(
      model({}).replace(
        '<name xml:lang="de">Kernsystem</name>',
        '<name xml:lang="de">Kernsystem</name><documentation xml:lang="fr"></documentation>',
      ),
    )
    expect(workspaceOf(result).elements).toHaveLength(2)
    expect(relabelled(result)).toEqual([])
  })
})

describe('texts with no language, and tags in another case (#114 review)', () => {
  it('lets untagged texts vote for en, which is how they were always written', () => {
    // One tagged text among untagged ones does not make them all German.
    const xml = model({ model: null, element: null, relationship: null, value: null })
    expect(languages(xml)).toEqual({ de: 2 })
    const result = importExchangeXml(xml)
    expect('language' in workspaceOf(result)).toBe(false)
    expect(relabelled(result)[0]?.message).toContain('2 texts are not labelled en: de (2)')
  })

  it('reports untagged texts an export will label in the model’s language', () => {
    const result = importExchangeXml(model({ value: null }))
    expect(workspaceOf(result).language).toBe('de')
    expect(relabelled(result)[0]?.message).toContain('1 text is not labelled de: no language (1)')
  })

  it('compares tags ignoring case, as BCP 47 does', () => {
    const upper = importExchangeXml(model({}).replaceAll('xml:lang="de"', 'xml:lang="EN"'))
    expect('language' in workspaceOf(upper)).toBe(false)
    expect(relabelled(upper)).toEqual([])

    const mixed = importExchangeXml(model({ model: 'DE', element: 'De' }))
    expect(workspaceOf(mixed).language).toBe('de')
    expect(relabelled(mixed)).toEqual([])

    // Counted apart, fr would win three to two. Together, de and DE tie it, and
    // the spelling most of them use is kept.
    const split = model({ model: 'DE', element: 'DE', relationship: 'fr', value: 'fr' }).replace(
      '<name xml:lang="de">Kernsystem</name>',
      '<name xml:lang="fr">Kernsystem</name>',
    )
    expect(languages(split)).toEqual({ DE: 2, de: 1, fr: 3 })
    const grouped = importExchangeXml(split)
    expect(workspaceOf(grouped).language).toBe('DE')
    expect(relabelled(grouped)[0]?.message).toContain('3 texts are not labelled DE: fr (3)')
  })

  it('holds EN in canonical JSON as no language, like en', () => {
    const base = drawnWorkspace()
    expect(toCanonicalJson({ ...base, language: 'EN' })).toBe(toCanonicalJson(base))
    const parsed = JSON.parse(toCanonicalJson(base))
    expect(
      fromCanonicalJson(JSON.stringify({ ...parsed, language: 'En' })).workspace,
    ).not.toHaveProperty('language')
  })
})

describe('the model’s language in canonical JSON (#111)', () => {
  const base = drawnWorkspace()

  it('round-trips', () => {
    const json = toCanonicalJson({ ...base, language: 'de' })
    expect(JSON.parse(json).language).toBe('de')
    const back = fromCanonicalJson(json)
    expect(back.problems).toEqual([])
    expect(back.workspace?.language).toBe('de')
    expect(toCanonicalJson(back.workspace!)).toBe(json)
  })

  it('writes en as no language, so one model has one spelling', () => {
    expect(toCanonicalJson({ ...base, language: 'en' })).toBe(toCanonicalJson(base))
    const parsed = JSON.parse(toCanonicalJson(base))
    expect(
      fromCanonicalJson(JSON.stringify({ ...parsed, language: 'en' })).workspace,
    ).not.toHaveProperty('language')
  })

  it('reports and drops a language that is not a tag', () => {
    const parsed = JSON.parse(toCanonicalJson(base))
    for (const language of ['de de', '', 42]) {
      const result = fromCanonicalJson(JSON.stringify({ ...parsed, language }))
      expect(result.workspace).not.toHaveProperty('language')
      expect(codes(result)).toEqual(['json.invalid-language'])
    }
  })
})

describe('a language the writer cannot write (#111)', () => {
  it('labels the texts en and says so, rather than writing a file the schema rejects', () => {
    const { xml, problems } = exportExchange({ ...drawnWorkspace(), language: 'de"de' })
    expect(Object.keys(languages(xml))).toEqual(['en'])
    expect(problems.map((p) => p.code)).toContain('exchange.language-invalid')
  })
})
