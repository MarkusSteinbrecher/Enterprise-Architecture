/**
 * Publishes the workspace JSON Schema at the URL its `$id` names (#189):
 * https://<owner>.github.io/Enterprise-Architecture/schema/archipelago-workspace.schema.json.
 *
 * The bytes are design/archipelago-workspace.schema.json's, unchanged;
 * `json-schema.test.ts` keeps that file equal to what the metamodel generates.
 * `check-published-schema.ts` runs after this and fails the build if the file
 * is not where `SCHEMA_ID` points.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const source = join(process.cwd(), 'design', 'archipelago-workspace.schema.json')
const target = join(dist, 'schema', 'archipelago-workspace.schema.json')

if (!existsSync(dist)) {
  console.error('emit-schema: dist/ not found — run vite build first')
  process.exit(1)
}

mkdirSync(join(dist, 'schema'), { recursive: true })
copyFileSync(source, target)

console.log('emit-schema: wrote dist/schema/archipelago-workspace.schema.json')
