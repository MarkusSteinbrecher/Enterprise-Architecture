import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The coverage gate over the lock and save protocol (#164) lives in three
 * places: the thresholds in `vite.config.ts`, the script in `package.json`, and
 * the CI step that runs it. Any of them can be removed without a test going
 * red, because a gate that does not run reports nothing. These pin all three,
 * and the gate's nearest bypasses: a file the coverage `include` does not
 * reach, and an ignore hint that gives no reason.
 *
 * That the gate fires is shown in the #164 PR, by removing a test and watching
 * the coverage step fail; a test cannot run the coverage step it is part of.
 */

const read = (path: string) => readFileSync(path, 'utf8')
const MODULE = 'src/io/shared-folder'

describe('the coverage gate on src/io/shared-folder (#164)', () => {
  const config = read('vite.config.ts')

  it('holds every metric of the directory at 100%', () => {
    expect(config).toContain(
      `'${MODULE}/**': { branches: 100, functions: 100, lines: 100, statements: 100 }`,
    )
  })

  it('counts files no test imports, and every source file of the directory', () => {
    expect(config).toContain('all: true')
    expect(config).toContain(`include: ['${MODULE}/**/*.{ts,tsx}']`)
    expect(config).toContain(`exclude: ['**/*.test.{ts,tsx}']`)
  })

  it('runs in CI, through the script that turns coverage on', () => {
    const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> })
      .scripts
    expect(scripts['test:coverage']).toBe('vitest run --coverage')
    expect(read('.github/workflows/ci.yml')).toMatch(/^\s+run: npm run test:coverage$/m)
  })

  it('gives every coverage ignore hint in the directory its reason, after "--"', () => {
    const files = readdirSync(MODULE).filter((name) => /\.tsx?$/.test(name))
    expect(files).toContain('session.ts')
    const unexplained = files.flatMap((name) =>
      read(join(MODULE, name))
        .split('\n')
        .filter((line) => /\b(?:v8|c8|istanbul)\s+ignore\b/.test(line))
        .filter((line) => !/\b(?:v8|c8|istanbul)\s+ignore\b[^*]*--\s*\w/.test(line))
        .map((line) => `${name}: ${line.trim()}`),
    )
    expect(unexplained).toEqual([])
  })
})
