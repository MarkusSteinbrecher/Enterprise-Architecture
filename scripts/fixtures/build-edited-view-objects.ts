/**
 * Writes `src/io/fixtures/view-objects-edited.xml`: notes, groups, view
 * references and legends after the edits in `src/test/edited-view-objects.ts`,
 * as Archipelago's exchange writer saves them. Archi then imports, saves and
 * exports it (#134, the #127 oracle):
 *
 *   npx vite-node scripts/fixtures/build-edited-view-objects.ts
 *   scripts/fixtures/archi-roundtrip.sh src/io/fixtures/view-objects-edited.xml \
 *     src/io/fixtures/view-objects-edited.archi.archimate src/io/fixtures/view-objects-edited.archi.xml
 *
 * `export-with-archi.sh` runs both, after re-saving the model they start from.
 * The writer's only problems are its notice that each view's legend opens as an
 * empty note elsewhere; any other fails the build.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { exportExchange } from '@/io/exchange-format'
import { editedViewObjects } from '@/test/edited-view-objects'

const { xml, problems } = exportExchange(editedViewObjects())
const unexpected = problems.filter((p) => p.code !== 'exchange.legend-carried')
if (unexpected.length) {
  for (const p of unexpected) console.error(`${p.code}: ${p.message}`)
  process.exit(1)
}
writeFileSync(join(import.meta.dirname, '../../src/io/fixtures/view-objects-edited.xml'), xml)
