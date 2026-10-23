/**
 * Fails the build when dist/ does not serve the workspace schema at the path
 * `SCHEMA_ID` names, byte-identical to design/ (#189). Runs last in
 * `npm run build`, which CI, the Pages deploy and the e2e harness all run.
 */
import { join } from 'node:path'
import { SCHEMA_ID } from '../src/io/json-schema'
import { publishedSchemaProblem } from '../src/io/published-schema'

const problem = publishedSchemaProblem(
  join(process.cwd(), 'dist'),
  SCHEMA_ID,
  join(process.cwd(), 'design', 'archipelago-workspace.schema.json'),
)

if (problem !== undefined) {
  console.error(`check-published-schema: ${problem}`)
  process.exit(1)
}

console.log(`check-published-schema: dist/ serves ${SCHEMA_ID}`)
