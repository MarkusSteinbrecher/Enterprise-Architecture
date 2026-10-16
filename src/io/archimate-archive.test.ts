import { deflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { fixtureBytes } from '@/test/fixture-bytes'
import { importArchimateArchive } from './archimate-archive'
import { importArchimate } from './archimate-native'
import { toCanonicalJson } from './canonical-json'
import { readWorkspaceFile } from './file-system'
import { crc32, readZipDirectory, readZipEntry } from './zip'

/**
 * An Archi model saved with images (#97). The fixture is Archi 5.10's own save
 * (`scripts/fixtures/archive-with-archi.sh`): a zip of `model.xml` and two
 * images, holding an image in each place Archi lets a model show one.
 */

const ARCHIVE = fixtureBytes('archi-images.archimate')
const asFile = (bytes: Uint8Array, name = 'archi-images.archimate') =>
  new File([bytes as BlobPart], name)

/** A stored-entry zip, for archives Archi would not write. */
function zipOf(entries: [string, Uint8Array][]): Uint8Array {
  const parts: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const [entryName, data] of entries) {
    const name = new TextEncoder().encode(entryName)
    const stored = new Uint8Array(deflateRawSync(data))
    const local = new Uint8Array(30 + name.length + stored.length)
    const l = new DataView(local.buffer)
    l.setUint32(0, 0x04034b50, true)
    l.setUint16(8, 8, true)
    l.setUint16(26, name.length, true)
    local.set(name, 30)
    local.set(stored, 30 + name.length)
    const central = new Uint8Array(46 + name.length)
    const c = new DataView(central.buffer)
    c.setUint32(0, 0x02014b50, true)
    c.setUint16(10, 8, true)
    c.setUint32(16, crc32(data), true)
    c.setUint32(20, stored.length, true)
    c.setUint32(24, data.length, true)
    c.setUint16(28, name.length, true)
    c.setUint32(42, offset, true)
    central.set(name, 46)
    parts.push(local)
    centrals.push(central)
    offset += local.length
  }
  const size = centrals.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true)
  e.setUint16(8, entries.length, true)
  e.setUint16(10, entries.length, true)
  e.setUint32(12, size, true)
  e.setUint32(16, offset, true)
  const out = new Uint8Array(offset + size + 22)
  let at = 0
  for (const part of [...parts, ...centrals, end]) {
    out.set(part, at)
    at += part.length
  }
  return out
}

async function modelXml(): Promise<string> {
  const entry = readZipDirectory(ARCHIVE).find((e) => e.name === 'model.xml')!
  return new TextDecoder().decode(await readZipEntry(ARCHIVE, entry))
}

describe('an Archi model saved with images, as Archi 5.10 saved it (#97)', () => {
  it('imports its model, folders and views', async () => {
    const result = await readWorkspaceFile(asFile(ARCHIVE))
    expect(result.ok).toBe(true)
    const workspace = result.workspace!
    expect(workspace.elements.map((e) => e.id).sort()).toEqual([
      'ac-engine',
      'ba-customer',
      'bp-handle',
    ])
    expect(workspace.relationships.map((r) => r.id).sort()).toEqual([
      'r-customer-handle',
      'r-engine-handle',
    ])
    const customers = workspace.folders.find((f) => f.name === 'Customers')
    expect(customers).toMatchObject({ root: 'business' })
    expect(workspace.elements.find((e) => e.id === 'ba-customer')?.folder).toBe(customers?.id)
    expect(workspace.views.map((v) => v.id)).toEqual(['v-images', 'v-plain'])
    const illustrated = workspace.views.find((v) => v.id === 'v-images')!
    // The two image boxes are skipped; every other shape is kept, nesting and all.
    expect(illustrated.nodes.map((n) => [n.id, n.parent])).toEqual([
      ['o-group', undefined],
      ['o-handle', 'o-group'],
      ['o-engine', 'o-group'],
      ['o-customer', undefined],
      ['o-note', undefined],
    ])
    // The specialization is kept, as for any Archi model.
    expect(workspace.elements.find((e) => e.id === 'ba-customer')?.properties).toEqual({
      Specialization: 'Person',
    })
  })

  it('reads model.xml exactly as the same model unzipped is read', async () => {
    const zipped = await importArchimateArchive(ARCHIVE, 'm.archimate')
    const plain = importArchimate(await modelXml(), 'm.archimate')
    expect(plain.ok).toBe(true)
    expect(toCanonicalJson(zipped.workspace!)).toBe(toCanonicalJson(plain.workspace!))
    // The archive adds what only it holds: the image files.
    expect(zipped.problems.slice(0, plain.problems.length)).toEqual(plain.problems)
    expect(zipped.problems.slice(plain.problems.length).map((p) => p.code)).toEqual([
      'archimate.archive-images-skipped',
    ])
  })

  it('reports every image reference, each where it was', async () => {
    const result = await importArchimateArchive(ARCHIVE, 'archi-images.archimate')
    const images = result.problems
      .filter((p) => /image/i.test(p.message))
      .map((p) => `${p.code}: ${p.message}`)
    expect(images).toEqual([
      'archimate.node-type-unsupported: View "Claims, illustrated": shape "o-logo" is a DiagramModelImage showing the image “images/logo.png”, which Archipelago does not draw yet. It was skipped; anything nested in it was kept.',
      'archimate.image-not-drawn: View "Claims, illustrated": shape "o-group" shows the image “images/logo.png”, which Archipelago does not draw yet. The shape was imported without it.',
      'archimate.image-not-drawn: View "Claims, illustrated": shape "o-engine" shows the image “images/actor.png”, which Archipelago does not draw yet. The shape was imported without it.',
      'archimate.image-not-drawn: View "Claims, illustrated": shape "o-note" shows the image “images/actor.png”, which Archipelago does not draw yet. The shape was imported without it.',
      'archimate.node-type-unsupported: View "Claims, illustrated": shape "o-frame" is a DiagramModelImage with no image in it, which Archipelago does not draw yet. It was skipped; anything nested in it was kept.',
      'archimate.specialization-image-dropped: The specialization “Person” has the image “images/actor.png”, which Archi draws on the shapes of what it specializes. Archipelago keeps the specialization as a property and does not draw the image yet.',
      'archimate.appearance-unsupported: Some shapes and lines use Archi display settings Archipelago does not support yet (imagePosition); they are drawn without them.',
      'archimate.archive-images-skipped: The archive holds 2 images (images/logo.png, images/actor.png), which Archipelago does not carry yet, so they were not imported. Each shape and specialization that showed one is listed.',
    ])
  })

  it('reports nothing else, and nothing left unread', async () => {
    const result = await importArchimateArchive(ARCHIVE)
    // Present first: a refused archive would also report no unread content.
    expect(result.ok).toBe(true)
    expect([...new Set(result.problems.map((p) => p.code))].sort()).toEqual([
      'archimate.appearance-unsupported',
      'archimate.archive-images-skipped',
      'archimate.image-not-drawn',
      'archimate.node-type-unsupported',
      'archimate.specialization-as-property',
      'archimate.specialization-image-dropped',
    ])
  })
})

describe('an archive that is not quite Archi’s (#97)', () => {
  const model = async () => new TextEncoder().encode(await modelXml())

  it('refuses a zip with no model.xml, and names what it holds', async () => {
    const bytes = zipOf([['word/document.xml', new TextEncoder().encode('<w/>')]])
    const result = await readWorkspaceFile(asFile(bytes, 'renamed.archimate'))
    expect(result.ok).toBe(false)
    expect(result.problems.map((p) => p.code)).toEqual(['archimate.archive-no-model'])
    expect(result.problems[0]!.message).toMatch(/no model\.xml.*1 file \(word\/document\.xml\)/)
  })

  it('says an empty archive is empty', async () => {
    const result = await importArchimateArchive(zipOf([]), 'empty.archimate')
    expect(result.problems[0]!.message).toMatch(/no model\.xml in it.*It is empty\.$/)
  })

  it('reads the model, and reports a file Archi does not write', async () => {
    const bytes = zipOf([
      ['model.xml', await model()],
      ['images/', new Uint8Array()],
      ['notes.txt', new TextEncoder().encode('hello')],
    ])
    const result = await importArchimateArchive(bytes, 'extra.archimate')
    expect(result.ok).toBe(true)
    expect(result.workspace!.views).toHaveLength(2)
    // A folder entry holds nothing, so only the file is reported.
    const extra = result.problems.filter((p) => p.code.startsWith('archimate.archive-'))
    expect(extra.map((p) => `${p.code}: ${p.message}`)).toEqual([
      'archimate.archive-entry-unread: The archive holds 1 file besides the model and its images (notes.txt), which Archi does not write and Archipelago did not read.',
    ])
  })

  it('passes on what the model reader refuses, as it refuses an unzipped file', async () => {
    const bytes = zipOf([['model.xml', new TextEncoder().encode('<model xmlns="urn:x"/>')]])
    const result = await importArchimateArchive(bytes, 'odd.archimate')
    expect(result.ok).toBe(false)
    expect(result.problems.map((p) => p.code)).toEqual(['archimate.wrong-namespace'])
  })

  it('names the fault of a damaged archive, and what to do', async () => {
    const result = await importArchimateArchive(
      ARCHIVE.slice(0, ARCHIVE.length - 30),
      'cut.archimate',
    )
    expect(result.ok).toBe(false)
    expect(result.problems).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'archimate.archive-truncated',
        file: 'cut.archimate',
        message: expect.stringMatching(
          /^“cut\.archimate” is a zip archive, which is how Archi saves a model with images\. The archive is cut short or damaged \(there is no end-of-archive record\), so it was not opened\./,
        ),
      }),
    ])
  })

  it('lets an error that is not the archive’s propagate', async () => {
    // Not a ZipError: the reader does not dress up its own bug as a damaged file.
    const poisoned = new Proxy(ARCHIVE, {
      get(target, key) {
        if (key === 'buffer') throw new RangeError('boom')
        return Reflect.get(target, key) as unknown
      },
    })
    await expect(importArchimateArchive(poisoned)).rejects.toThrow('boom')
  })
})
