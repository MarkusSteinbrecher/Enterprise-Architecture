import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readZipDirectory, readZipEntry } from '@/io/zip'

/**
 * A checked-in fixture's bytes. `?raw` decodes a file as UTF-8 text, which a
 * zip does not survive, so an Archi model saved with images (#97) is read here.
 */
export function fixtureBytes(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(process.cwd(), 'src', 'io', 'fixtures', name)))
}

/** The zip signature, as `?raw` text: how a glob over the fixtures tells an archive. */
const ZIP_TEXT_SIGNATURE = 'PK\u0003\u0004'

/**
 * The model XML of a fixture found by `import.meta.glob` under `./fixtures/`:
 * its text, or, for Archi's zip archive, the `model.xml` inside it, so a scan
 * of every fixture covers the archive's model too.
 */
export async function fixtureModelXml(globPath: string, raw: string): Promise<string> {
  if (!raw.startsWith(ZIP_TEXT_SIGNATURE)) return raw
  const bytes = fixtureBytes(globPath.replace(/^\.\/fixtures\//, ''))
  const model = readZipDirectory(bytes).find((entry) => entry.name === 'model.xml')
  if (!model) throw new Error(`${globPath} is a zip with no model.xml`)
  return new TextDecoder().decode(await readZipEntry(bytes, model))
}
