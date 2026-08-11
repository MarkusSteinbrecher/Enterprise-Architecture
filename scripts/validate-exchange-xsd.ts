/**
 * Validates our exchange-format output against the Open Group's published XSDs.
 *
 * The XSDs are fetched rather than vendored (they are The Open Group's, and a
 * stale copy would be worse than none) and `xmllint` does the validating, so this
 * needs network access and libxml2 — which is why it is a script you run rather
 * than a CI step. `exchange-format.test.ts` covers the structural rules offline.
 *
 * Usage: npm run validate:xsd
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { exportExchange, importExchangeXml } from '../src/io/exchange-format'

const XSD_URL = 'https://www.opengroup.org/xsd/archimate/3.1/archimate3_Model.xsd'

const work = mkdtempSync(join(tmpdir(), 'archipelago-xsd-'))

console.log(`Fetching ${XSD_URL}`)
const xsd = await fetch(XSD_URL)
if (!xsd.ok) {
  console.error(`Could not fetch the XSD: ${xsd.status} ${xsd.statusText}`)
  process.exit(1)
}
const xsdPath = join(work, 'archimate3_Model.xsd')
writeFileSync(xsdPath, await xsd.text())

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
