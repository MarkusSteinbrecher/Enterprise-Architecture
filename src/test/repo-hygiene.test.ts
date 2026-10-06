import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

/**
 * What must never be committed. On 2026-10-06 a worktree's `node_modules`
 * symlink, pointing at one machine's absolute path, was committed and merged:
 * `.gitignore` said `node_modules/`, which matches a directory and not a
 * symlink. A pull then replaced the real install with the link, on this
 * machine and on any other. The ignore rule is fixed; this test is what notices
 * if a path like it is tracked again, however it got past the rule.
 */

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' })

describe('the repository tracks no machine-local paths', () => {
  const files = git('ls-files', '-s').split('\n').filter(Boolean)

  it('lists the tracked files', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('tracks nothing under node_modules, dist or coverage, as a file or a link', () => {
    const local = files
      .map((line) => line.split('\t')[1]!)
      .filter((path) => /(^|\/)(node_modules|dist|coverage)(\/|$)/.test(path))
    expect(local).toEqual([])
  })

  it('tracks no symbolic link to an absolute path', () => {
    // Mode, blob, stage, then the path: the blob of a link is its target.
    const absolute = files
      .filter((line) => line.startsWith('120000 '))
      .filter((line) => git('cat-file', '-p', line.split(' ')[1]!).startsWith('/'))
      .map((line) => line.split('\t')[1])
    expect(absolute).toEqual([])
  })
})
