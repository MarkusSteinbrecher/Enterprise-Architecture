/**
 * Writes the input for `src/io/fixtures/archi-images.archimate` (#97): an
 * original Archi model (ours, MIT) that holds images, and the two images, into
 * the directory given as the first argument:
 *
 *   <dir>/model.xml
 *   <dir>/images/logo.png
 *   <dir>/images/actor.png
 *
 * The checked-in fixture is not this. `export-with-archi.sh` zips the directory
 * the way Archi lays out an archive, has Archi 5.10 open it and save it, and
 * checks in Archi's save: Archi writes a model that holds images as a zip archive
 * of its own (`ArchiveManager`), so the fixture is Archi's output, byte for byte.
 *
 * Each place Archi lets a model show an image is used once, and one image twice:
 * an image box, an element shape, a group and a note with an image of their own,
 * an image box with no image, and a specialization's image, which Archi draws on
 * every shape of a concept with that specialization.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

const dir = process.argv[2]
if (!dir) {
  console.error('usage: build-images-model.ts <dir>')
  process.exit(2)
}

// ── PNG ──────────────────────────────────────────────────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes: Buffer): number {
  let c = 0xffffffff
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** A square of one colour, `size` pixels a side, as an 8-bit RGB PNG. */
function png(size: number, [r, g, b]: [number, number, number]): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 2, 0, 0, 0], 8)
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(size).fill([r, g, b]).flat())])
  const pixels = Buffer.concat(Array(size).fill(row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Model ────────────────────────────────────────────────────────────────────

const LOGO = 'images/logo.png'
const ACTOR = 'images/actor.png'

const model = `<?xml version="1.0" encoding="UTF-8"?>
<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="http://www.archimatetool.com/archimate" name="Claims with images" id="m-images" version="5.0.0">
  <folder name="Strategy" id="f-top-strategy" type="strategy"/>
  <folder name="Business" id="f-top-business" type="business">
    <folder name="Customers" id="f-customers">
      <element xsi:type="archimate:BusinessActor" name="Customer" id="ba-customer" profiles="p-person"/>
    </folder>
    <element xsi:type="archimate:BusinessProcess" name="Handle Claim" id="bp-handle"/>
  </folder>
  <folder name="Application" id="f-top-application" type="application">
    <element xsi:type="archimate:ApplicationComponent" name="Claims Engine" id="ac-engine"/>
  </folder>
  <folder name="Technology &amp; Physical" id="f-top-technology" type="technology"/>
  <folder name="Motivation" id="f-top-motivation" type="motivation"/>
  <folder name="Implementation &amp; Migration" id="f-top-implementation_migration" type="implementation_migration"/>
  <folder name="Other" id="f-top-other" type="other"/>
  <folder name="Relations" id="f-top-relations" type="relations">
    <element xsi:type="archimate:ServingRelationship" id="r-engine-handle" source="ac-engine" target="bp-handle"/>
    <element xsi:type="archimate:AssignmentRelationship" id="r-customer-handle" source="ba-customer" target="bp-handle"/>
  </folder>
  <folder name="Views" id="f-top-diagrams" type="diagrams">
    <element xsi:type="archimate:ArchimateDiagramModel" name="Claims, illustrated" id="v-images">
      <child xsi:type="archimate:DiagramModelImage" id="o-logo" imagePath="${LOGO}">
        <bounds x="20" y="20" width="64" height="64"/>
      </child>
      <child xsi:type="archimate:Group" id="o-group" name="Claims" imagePath="${LOGO}">
        <bounds x="120" y="20" width="400" height="200"/>
        <child xsi:type="archimate:DiagramObject" id="o-handle" archimateElement="bp-handle">
          <bounds x="20" y="40" width="120" height="55"/>
        </child>
        <child xsi:type="archimate:DiagramObject" id="o-engine" archimateElement="ac-engine" imagePath="${ACTOR}" imagePosition="0">
          <bounds x="220" y="40" width="120" height="55"/>
        </child>
      </child>
      <child xsi:type="archimate:DiagramObject" id="o-customer" archimateElement="ba-customer">
        <bounds x="140" y="260" width="120" height="55"/>
      </child>
      <child xsi:type="archimate:Note" id="o-note" imagePath="${ACTOR}">
        <bounds x="560" y="20" width="185" height="80"/>
        <content>A note with an image of its own.</content>
      </child>
      <child xsi:type="archimate:DiagramModelImage" id="o-frame">
        <bounds x="560" y="140" width="80" height="80"/>
      </child>
    </element>
    <element xsi:type="archimate:ArchimateDiagramModel" name="Plain" id="v-plain">
      <child xsi:type="archimate:DiagramObject" id="o-plain-engine" archimateElement="ac-engine">
        <bounds x="20" y="20" width="120" height="55"/>
      </child>
    </element>
  </folder>
  <profile name="Person" id="p-person" imagePath="${ACTOR}" conceptType="BusinessActor"/>
</archimate:model>
`

mkdirSync(join(dir, 'images'), { recursive: true })
writeFileSync(join(dir, 'model.xml'), model)
writeFileSync(join(dir, LOGO), png(16, [29, 92, 140]))
writeFileSync(join(dir, ACTOR), png(12, [140, 30, 90]))
console.log(`Wrote ${dir}/model.xml and two images`)
