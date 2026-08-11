/**
 * Rewrites design/archipelago-workspace.schema.json from the metamodel.
 * Run with `npm run schema`; `json-schema.test.ts` fails if the checked-in copy
 * is stale, so the schema cannot drift from the element catalogue.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { workspaceJsonSchemaText } from '../src/io/json-schema'

const target = join(process.cwd(), 'design', 'archipelago-workspace.schema.json')
writeFileSync(target, workspaceJsonSchemaText())
console.log(`Wrote ${target}`)
