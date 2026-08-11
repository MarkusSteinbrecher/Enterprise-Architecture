import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'
import { smallWorkspace, syntheticWorkspace } from '@/test/fixtures'
import { buildWorkspaceJsonSchema, workspaceJsonSchemaText } from './json-schema'
import { toCanonicalJson } from './canonical-json'
import { loadDemoWorkspace } from './demo'

const SCHEMA_PATH = join(process.cwd(), 'design', 'archipelago-workspace.schema.json')

function validator() {
  const ajv = new Ajv2020({ strict: false, allErrors: true })
  addFormats(ajv)
  return ajv.compile(buildWorkspaceJsonSchema())
}

/** What a workspace looks like once it has been through canonical JSON. */
function canonical(workspace: Parameters<typeof toCanonicalJson>[0]): unknown {
  return JSON.parse(toCanonicalJson(workspace))
}

describe('published JSON Schema', () => {
  it('matches the checked-in copy in design/', () => {
    const onDisk = readFileSync(SCHEMA_PATH, 'utf8')
    expect(onDisk, 'design/archipelago-workspace.schema.json is stale — run `npm run schema`').toBe(
      workspaceJsonSchemaText(),
    )
  })

  it('accepts the canonical form of a real workspace', () => {
    const validate = validator()
    expect(validate(canonical(smallWorkspace())), JSON.stringify(validate.errors)).toBe(true)
  })

  it('accepts the bundled demo', () => {
    const validate = validator()
    expect(validate(canonical(loadDemoWorkspace())), JSON.stringify(validate.errors)).toBe(true)
  })

  it('accepts a 500-element synthetic workspace', () => {
    const validate = validator()
    expect(validate(canonical(syntheticWorkspace(500))), JSON.stringify(validate.errors)).toBe(true)
  })

  it('rejects an unknown element type', () => {
    const validate = validator()
    expect(
      validate({
        schemaVersion: 1,
        id: 'ws',
        name: 'W',
        elements: [{ id: 'a', type: 'Microservice', name: 'A' }],
        relationships: [],
      }),
    ).toBe(false)
  })

  it('rejects an id that would not survive the exchange format', () => {
    const validate = validator()
    expect(
      validate({
        schemaVersion: 1,
        id: 'ws',
        name: 'W',
        elements: [{ id: '9-starts-with-a-digit', type: 'Capability', name: 'A' }],
        relationships: [],
      }),
    ).toBe(false)
  })

  it('rejects a fit level outside 1–4', () => {
    const validate = validator()
    expect(
      validate({
        schemaVersion: 1,
        id: 'ws',
        name: 'W',
        elements: [
          { id: 'a', type: 'ApplicationComponent', name: 'A', profile: { functionalFit: 7 } },
        ],
        relationships: [],
      }),
    ).toBe(false)
  })

  it('requires the fields an agent would need to write a valid file', () => {
    const validate = validator()
    expect(validate({ id: 'ws', name: 'W' })).toBe(false)
    expect(validate.errors?.some((e) => e.message?.includes('schemaVersion'))).toBe(true)
  })
})
