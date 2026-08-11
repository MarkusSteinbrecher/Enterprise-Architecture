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
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exportExchangeXml, importExchangeXml } from '../src/io/exchange-format'
import { DEMO_WORKSPACE_XML } from '../src/io/demo'

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

// Round-trip the bundled demo through import and export, so what gets validated
// is what the app actually writes rather than the checked-in file.
const imported = importExchangeXml(DEMO_WORKSPACE_XML, 'archisurance.xml')
if (!imported.workspace) {
  console.error('The bundled demo did not import.')
  process.exit(1)
}
const exportedPath = join(work, 'exported.xml')
writeFileSync(exportedPath, exportExchangeXml(imported.workspace))

const targets = [
  { label: 'bundled demo', path: 'src/io/demo/archisurance.xml' },
  { label: 'round-tripped export', path: exportedPath },
]

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
