/**
 * Validates our exchange-format output against the Open Group's published XSDs.
 *
 * `xmllint` does the validating, so this needs libxml2 — which is why it is a
 * script you run rather than a CI step. `exchange-format.test.ts` covers the
 * structural rules offline.
 *
 * The XSD is **not vendored**: it is The Open Group's, and this repo is MIT —
 * the same reason their ArchiSurance model is not in here either. It is fetched
 * once and cached under `node_modules/.cache/`, so only the first run of a fresh
 * checkout needs the network and nobody's bad day takes the check down (#37).
 * Use `--refresh` to re-fetch, or point `ARCHIMATE_XSD` at your own copy.
 *
 * Usage: npm run validate:xsd [-- --refresh]
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { exportExchange, importExchangeXml } from '../src/io/exchange-format'

const XSD_URL = 'https://www.opengroup.org/xsd/archimate/3.1/archimate3_Model.xsd'
const CACHE = join('node_modules', '.cache', 'archipelago', 'archimate3_Model.xsd')

const work = mkdtempSync(join(tmpdir(), 'archipelago-xsd-'))

/** The XSD on disk: whichever of the override, the cache or the network answers. */
async function schemaPath(): Promise<string> {
  const override = process.env.ARCHIMATE_XSD
  if (override) {
    if (!existsSync(override)) {
      console.error(`ARCHIMATE_XSD points at ${override}, which does not exist.`)
      process.exit(1)
    }
    console.log(`Using ${override} (ARCHIMATE_XSD)`)
    return override
  }

  const refresh = process.argv.includes('--refresh')
  if (!refresh && existsSync(CACHE)) {
    const age = Math.round((Date.now() - statSync(CACHE).mtimeMs) / 86_400_000)
    console.log(`Using the cached XSD (${age} day${age === 1 ? '' : 's'} old; --refresh to re-fetch)`)
    return CACHE
  }

  console.log(`Fetching ${XSD_URL}`)
  try {
    const response = await fetch(XSD_URL)
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    mkdirSync(dirname(CACHE), { recursive: true })
    writeFileSync(CACHE, await response.text())
    return CACHE
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error)
    if (existsSync(CACHE)) {
      console.warn(`Could not fetch the XSD (${why}); falling back to the cached copy.`)
      return CACHE
    }
    console.error(
      `Could not fetch the XSD (${why}), and there is no cached copy.\n` +
        `The schema is The Open Group's and is not redistributed in this MIT repo. Either\n` +
        `get online for one run, or download it from ${XSD_URL} and set ARCHIMATE_XSD to it.`,
    )
    process.exit(1)
  }
}

const xsdPath = await schemaPath()

/**
 * Every file is validated as it is checked in **and** as it comes back out of a
 * round trip, so what gets validated is what the app actually writes. The
 * junction fixture is here because junctions are the one place where our
 * catalogue and the schema disagree on shape: one `Junction` with a kind here,
 * `AndJunction`/`OrJunction` there (#36).
 */
const sources = [
  { label: 'bundled demo', path: 'src/io/demo/archisurance.xml' },
  { label: 'junction fixture', path: 'src/io/fixtures/junction-flow.xml' },
]

const targets: { label: string; path: string }[] = []
for (const source of sources) {
  targets.push(source)
  const imported = importExchangeXml(readFileSync(source.path, 'utf8'), source.path)
  if (!imported.workspace) {
    console.error(`${source.path} did not import.`)
    process.exit(1)
  }
  const { xml, problems } = exportExchange(imported.workspace)
  for (const problem of problems) {
    console.log(`  ${problem.severity}: ${problem.message}`)
  }
  const exportedPath = join(work, `${basename(source.path, '.xml')}-round-tripped.xml`)
  writeFileSync(exportedPath, xml)
  targets.push({ label: `${source.label}, round-tripped`, path: exportedPath })
}

// A workspace whose ids are not XML names — legal in canonical JSON, illegal as
// xs:ID. The writer rewrites them; the schema is the judge of whether it did so
// well enough (#36).
const demo = importExchangeXml(readFileSync(sources[0]!.path, 'utf8')).workspace
if (demo) {
  const original = demo.elements[0]!.id
  const rename = (id: string) => (id === original ? '9 odd:id' : id)
  const { xml } = exportExchange({
    ...demo,
    id: '9 workspace',
    elements: demo.elements.map((element) => ({ ...element, id: rename(element.id) })),
    relationships: demo.relationships.map((relationship) => ({
      ...relationship,
      source: rename(relationship.source),
      target: rename(relationship.target),
    })),
  })
  const rewrittenPath = join(work, 'rewritten-ids.xml')
  writeFileSync(rewrittenPath, xml)
  targets.push({ label: 'ids that are not XML names, rewritten on export', path: rewrittenPath })
}

// The declared property types the model now carries (#37, finding 6): the XSD is
// the judge of whether `currency`, `date` and `time` are spellings it accepts on
// a propertyDefinition, and it is the only thing that can say so.
const typed = importExchangeXml(
  `<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" identifier="m-typed">
  <name xml:lang="en">Declared types</name>
  <elements>
    <element identifier="e1" xsi:type="ApplicationComponent">
      <name xml:lang="en">Portal</name>
      <properties>
        <property propertyDefinitionRef="p1"><value xml:lang="en">1.50</value></property>
        <property propertyDefinitionRef="p2"><value xml:lang="en">2024-01-01</value></property>
        <property propertyDefinitionRef="p3"><value xml:lang="en">09:30:00</value></property>
        <property propertyDefinitionRef="p4"><value xml:lang="en">0912345678</value></property>
      </properties>
    </element>
  </elements>
  <propertyDefinitions>
    <propertyDefinition identifier="p1" type="currency"><name xml:lang="en">licenceFee</name></propertyDefinition>
    <propertyDefinition identifier="p2" type="date"><name xml:lang="en">validUntil</name></propertyDefinition>
    <propertyDefinition identifier="p3" type="time"><name xml:lang="en">cutOff</name></propertyDefinition>
    <propertyDefinition identifier="p4" type="number"><name xml:lang="en">assetNo</name></propertyDefinition>
  </propertyDefinitions>
</model>`,
).workspace
if (typed) {
  const typedPath = join(work, 'declared-property-types.xml')
  writeFileSync(typedPath, exportExchange(typed).xml)
  targets.push({ label: 'declared currency/date/time/number types, re-exported', path: typedPath })
}

let failures = 0
for (const target of targets) {
  try {
    execFileSync('xmllint', ['--noout', '--schema', xsdPath, target.path], { stdio: 'pipe' })
    console.log(`✓ ${target.label} validates against the ArchiMate 3.1 exchange XSD`)
  } catch (error) {
    failures += 1
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr) : ''
    console.error(`✗ ${target.label} failed validation\n${stderr}`)
  }
}

process.exit(failures === 0 ? 0 : 1)
