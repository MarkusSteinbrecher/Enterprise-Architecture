/**
 * Writes `src/io/fixtures/claims-edited.xml`: the claims landscape after the
 * edits in `src/test/edited-claims.ts`, as Archipelago's exchange writer saves
 * it. Archi then imports and saves it (#127):
 *
 *   npx vite-node scripts/fixtures/build-edited-claims.ts
 *   scripts/fixtures/archi-roundtrip.sh src/io/fixtures/claims-edited.xml \
 *     src/io/fixtures/claims-edited.archi.archimate src/io/fixtures/claims-edited.archi.xml
 *
 * `export-with-archi.sh` runs both, after re-saving the claims model they start from.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { exportExchange } from '@/io/exchange-format'
import { editedClaims } from '@/test/edited-claims'

const { xml, problems } = exportExchange(editedClaims())
if (problems.length) {
  for (const p of problems) console.error(`${p.code}: ${p.message}`)
  process.exit(1)
}
writeFileSync(join(import.meta.dirname, '../../src/io/fixtures/claims-edited.xml'), xml)
