/**
 * Fails the build when dist/ does not serve the workspace schema at the path
 * `SCHEMA_ID` names, byte-identical to design/ (#189). Runs last in
 * `npm run build`, which CI, the Pages deploy and the e2e harness all run.
 */
import { join } from 'node:path'
import { SCHEMA_ID } from '../src/io/json-schema'
import { publishedSchemaProblem } from '../src/io/published-schema'

// `SCHEMA_CHECK_DIST` points the check at another build, so a test can run
// this script itself and see it fail the build (#201 review).
const problem = publishedSchemaProblem(
  process.env.SCHEMA_CHECK_DIST ?? join(process.cwd(), 'dist'),
  SCHEMA_ID,
  join(process.cwd(), 'design', 'archipelago-workspace.schema.json'),
)

if (problem !== undefined) {
  console.error(`check-published-schema: ${problem}`)
  process.exit(1)
}

console.log(`check-published-schema: dist/ serves ${SCHEMA_ID}`)
