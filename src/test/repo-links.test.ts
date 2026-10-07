import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Links from the app and the docs to files in this repository. On 2026-10-07
 * #151 shipped the guide with a link to ADR 0011, which lived on #150's branch:
 * the deployed guide pointed at a 404 until #150 merged, and nothing noticed.
 * A link to `blob/main/<path>` resolves against the tree that merges, so every
 * branch must carry the file it links to.
 */

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' })
const root = git('rev-parse', '--show-toplevel').trim()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

const REPO_LINK = /Enterprise-Architecture\/(?:blob|tree)\/main\/([^'"`)\s#?]+)/g
/** A relative Markdown link; `../` climbs out of the repo into GitHub's own pages. */
const RELATIVE_LINK = /\]\((?!https?:|#|\.\.\/)([^)#\s]+)\)/g
const INDEX = 'design/decisions/README.md'
const INDEX_LINK = /\]\(([0-9]{4}-[^)]+\.md)\)/g

/** Every repository path linked from `src` files and the README. */
function repoLinks(): { from: string; path: string }[] {
  // Untracked files too, so a link in a file not yet committed is checked locally.
  const sources = git('ls-files', '--cached', '--others', '--exclude-standard')
    .split('\n')
    .filter((f) => /^src\/.*\.(ts|tsx)$/.test(f) || f === 'README.md')
  return sources.flatMap((from) => {
    const text = read(from)
    const relative = from === 'README.md' ? [...text.matchAll(RELATIVE_LINK)] : []
    return [...text.matchAll(REPO_LINK), ...relative].map((m) => ({ from, path: m[1]! }))
  })
}

const exists = (path: string) => existsSync(join(root, path))

describe('links into the repository resolve', () => {
  it('finds the links it checks', () => {
    // A pattern that matched nothing would pass below, so name one of each kind.
    const links = repoLinks()
    expect(links).toContainEqual({
      from: 'src/ui/guide/sources.ts',
      path: 'design/decisions/0011-stay-on-archimate-3-2.md',
    })
    expect(links).toContainEqual({ from: 'README.md', path: 'LICENSE' })
  })

  it('links only to files the branch carries', () => {
    expect(repoLinks().filter((l) => !exists(l.path))).toEqual([])
  })

  it('indexes every ADR, and every index entry is a file', () => {
    const adrs = readdirSync(join(root, 'design/decisions')).filter((f) =>
      /^[0-9]{4}-.*\.md$/.test(f),
    )
    const indexed = [...read(INDEX).matchAll(INDEX_LINK)].map((m) => m[1]!)
    expect(indexed.length).toBeGreaterThan(0)
    expect(indexed.filter((f) => !adrs.includes(f))).toEqual([])
    expect(adrs.filter((f) => !indexed.includes(f))).toEqual([])
  })
})
