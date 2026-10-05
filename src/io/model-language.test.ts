import { describe, expect, it } from 'vitest'
import type { Workspace } from '@/model'
import { drawnWorkspace } from '@/test/fixtures'
import { fromCanonicalJson, toCanonicalJson } from './canonical-json'
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
    expect(report?.message).toContain('2 texts are labelled with a language other than de')
    expect(report?.message).toContain('en (1)')
    expect(report?.message).toContain('fr (1)')
    expect(report?.message).toContain('an export labels them de')

    const { xml } = exportExchange(workspaceOf(result))
    expect(Object.keys(languages(xml))).toEqual(['de'])
  })

  it('reports a tag the schema does not allow, and never holds it', () => {
    // Most of the texts carry it, and still it cannot be the model's language:
    // written back, every text would fail the schema.
    const result = importExchangeXml(
      model({ model: 'de de', element: 'de de', relationship: 'de de', value: 'de de' }),
    )
    expect(workspaceOf(result).language).toBe('de')
    const [report] = relabelled(result)
    expect(report?.message).toContain('“de de” (4)')
  })

  it('leaves the model in English when no tag can be held', () => {
    const xml = model({}).replaceAll('xml:lang="de"', 'xml:lang="x_y"')
    const result = importExchangeXml(xml)
    expect('language' in workspaceOf(result)).toBe(false)
    expect(relabelled(result)[0]?.message).toContain('other than en: “x_y” (6)')
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
