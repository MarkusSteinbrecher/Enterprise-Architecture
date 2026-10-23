import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SCHEMA_ID } from './json-schema'
import { distPathOf, publishedSchemaProblem } from './published-schema'

const DESIGN = join(process.cwd(), 'design', 'archipelago-workspace.schema.json')

describe('where the schema is served from (#189)', () => {
  it('maps SCHEMA_ID to its path in dist/, with the Pages origin and base stripped', () => {
    expect(distPathOf(SCHEMA_ID)).toBe('schema/archipelago-workspace.schema.json')
  })

  it('refuses a host that is not GitHub Pages', () => {
    expect(() =>
      distPathOf('https://schemas.example.com/Enterprise-Architecture/schema/x.json'),
    ).toThrow(/not a GitHub Pages URL/)
  })

  it('refuses a Pages URL that is not https', () => {
    expect(() =>
      distPathOf('http://stein-clankers.github.io/Enterprise-Architecture/schema/x.json'),
    ).toThrow(/not a GitHub Pages URL/)
  })

  it('refuses a Pages URL outside the project base', () => {
    expect(() => distPathOf('https://stein-clankers.github.io/schema/x.json')).toThrow(
      /not under the Pages base/,
    )
  })
})

describe('the check the build runs on dist/ (#189)', () => {
  let dist: string

  beforeEach(() => {
    dist = mkdtempSync(join(tmpdir(), 'archipelago-dist-'))
  })

  afterEach(() => {
    rmSync(dist, { recursive: true, force: true })
  })

  function place(path: string, bytes: Buffer | string) {
    mkdirSync(dirname(join(dist, path)), { recursive: true })
    writeFileSync(join(dist, path), bytes)
  }

  it('passes when dist/ holds the design file at the $id path', () => {
    place('schema/archipelago-workspace.schema.json', readFileSync(DESIGN))
    expect(publishedSchemaProblem(dist, SCHEMA_ID, DESIGN)).toBeUndefined()
  })

  it('fails when the file is missing', () => {
    place('index.html', '<div id="root"></div>')
    expect(publishedSchemaProblem(dist, SCHEMA_ID, DESIGN)).toMatch(
      /dist\/schema\/archipelago-workspace\.schema\.json is missing/,
    )
  })

  it('fails when the file sits under the base instead of with it stripped', () => {
    place('Enterprise-Architecture/schema/archipelago-workspace.schema.json', readFileSync(DESIGN))
    expect(publishedSchemaProblem(dist, SCHEMA_ID, DESIGN)).toMatch(/is missing/)
  })

  it('fails when a directory has the name', () => {
    mkdirSync(join(dist, 'schema', 'archipelago-workspace.schema.json'), { recursive: true })
    expect(publishedSchemaProblem(dist, SCHEMA_ID, DESIGN)).toMatch(/is missing/)
  })

  it('fails when the file differs from the design file, even only in line endings', () => {
    const crlf = readFileSync(DESIGN, 'utf8').replace(/\n/g, '\r\n')
    place('schema/archipelago-workspace.schema.json', crlf)
    expect(JSON.parse(crlf)).toEqual(JSON.parse(readFileSync(DESIGN, 'utf8')))
    expect(publishedSchemaProblem(dist, SCHEMA_ID, DESIGN)).toMatch(/not byte-identical/)
  })

  it('fails closed on a $id it cannot map, whatever dist/ holds', () => {
    place('schema/archipelago-workspace.schema.json', readFileSync(DESIGN))
    expect(() =>
      publishedSchemaProblem(
        dist,
        'https://example.com/schema/archipelago-workspace.schema.json',
        DESIGN,
      ),
    ).toThrow(/not a GitHub Pages URL/)
  })

  /** Runs the build's own check script against `dist`, as `npm run build` runs it. */
  function runCheck() {
    return spawnSync('npx', ['vite-node', 'scripts/check-published-schema.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, SCHEMA_CHECK_DIST: dist },
      encoding: 'utf8',
    })
  }

  it('fails the build when the file is missing: the script exits non-zero', () => {
    place('index.html', '<div id="root"></div>')
    const run = runCheck()
    expect(run.stderr).toContain('archipelago-workspace.schema.json is missing')
    expect(run.status).toBe(1)
  }, 30_000)

  it('lets the build pass when the file is there', () => {
    place('schema/archipelago-workspace.schema.json', readFileSync(DESIGN))
    const run = runCheck()
    expect(run.stdout).toContain('dist/ serves')
    expect(run.status).toBe(0)
  }, 30_000)

  it('runs as the last step of npm run build, after the copy', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }
    const steps = pkg.scripts.build!.split('&&').map((step) => step.trim())
    expect(steps).toContain('node scripts/emit-schema.ts')
    expect(steps.at(-1)).toBe('vite-node scripts/check-published-schema.ts')
  })
})
