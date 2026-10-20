/**
 * Writes `src/io/fixtures/appearance-edited.xml`: the claims landscape after the
 * appearance edits in `src/test/edited-appearance.ts` (#135), as Archipelago's
 * exchange writer saves it. Archi then imports and saves it (#127):
 *
 *   npx vite-node scripts/fixtures/build-edited-appearance.ts
 *   scripts/fixtures/archi-roundtrip.sh src/io/fixtures/appearance-edited.xml \
 *     src/io/fixtures/appearance-edited.archi.archimate src/io/fixtures/appearance-edited.archi.xml
 *
 * `export-with-archi.sh` runs both, after re-saving the claims model they start from.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { exportExchange } from '@/io/exchange-format'
import { editedAppearance } from '@/test/edited-appearance'

const { xml, problems } = exportExchange(editedAppearance())
if (problems.length) {
  for (const p of problems) console.error(`${p.code}: ${p.message}`)
  process.exit(1)
}
writeFileSync(join(import.meta.dirname, '../../src/io/fixtures/appearance-edited.xml'), xml)
