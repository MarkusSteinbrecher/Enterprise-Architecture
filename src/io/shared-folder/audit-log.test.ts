import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncWorld, type SyncedClient } from '@/test/sync-world'
import { AUDIT_LOCK, appendAudit, readAudit, retractAudit, type AuditEntry } from './audit-log'
import type * as AuditLog from './audit-log'
import { decodeText, encodeText } from './folder'

/**
 * Two tabs of one browser profile share a client id, so they share a log
 * (#165). Each append reads the file and writes it back whole, so two at once
 * kept one line. The profile's Web Lock puts them one after the other.
 *
 * A tab is a module instance here: `vi.resetModules()` and a fresh import give
 * a second copy of `audit-log.ts` with its own state, as a second tab has, and
 * both share `navigator.locks`, as the tabs of one profile do. jsdom has no Web
 * Locks, so `ProfileLocks` stands in for them. It is the protocol only: the
 * journey in `tests/e2e/shared-folder.spec.ts` takes the real one in Chromium.
 */

const LOG = '.archipelago-log-c1.jsonl'

/** One exclusive lock per name, granted in the order asked, held until the callback settles. */
class ProfileLocks {
  readonly requested: string[] = []
  readonly #tails = new Map<string, Promise<unknown>>()

  request<T>(name: string, callback: (lock: { name: string }) => Promise<T>): Promise<T> {
    this.requested.push(name)
    const run = (this.#tails.get(name) ?? Promise.resolve()).then(() => callback({ name }))
    this.#tails.set(
      name,
      run.catch(() => undefined),
    )
    return run
  }
}

const entry = (displayName: string, at = '2026-10-07T08:00:00.000Z'): AuditEntry => ({
  action: 'unlock',
  at,
  displayName,
  model: 'Landscape.json',
})

async function lines(folder: SyncedClient): Promise<string[]> {
  const bytes = await folder.read(LOG)
  return bytes ? decodeText(bytes).split('\n') : []
}

/** A second tab: another instance of the module, sharing whatever the page's globals are. */
async function anotherTab(): Promise<typeof AuditLog> {
  vi.resetModules()
  return import('./audit-log')
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'locks')
})

describe('appends from two tabs of one profile (#165)', () => {
  it('keeps both lines when two tabs append at once, under the profile’s Web Lock', async () => {
    const locks = new ProfileLocks()
    Object.defineProperty(navigator, 'locks', { configurable: true, value: locks })
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const [one, two] = [await anotherTab(), await anotherTab()]
    await Promise.all([
      one.appendAudit(folder, 'c1', entry('first tab')),
      two.appendAudit(folder, 'c1', entry('second tab')),
    ])
    expect((await readAudit(folder)).entries.map((e) => e.displayName).sort()).toEqual([
      'first tab',
      'second tab',
    ])
    expect(locks.requested).toEqual([AUDIT_LOCK, AUDIT_LOCK])
  })

  it('loses a line from two tabs without Web Locks, which is what the lock is for', async () => {
    // The subject of the case above, unprotected: if this kept both lines, that
    // case would pass without the lock.
    expect(navigator.locks).toBeUndefined()
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const [one, two] = [await anotherTab(), await anotherTab()]
    await Promise.all([
      one.appendAudit(folder, 'c1', entry('first tab')),
      two.appendAudit(folder, 'c1', entry('second tab')),
    ])
    expect((await readAudit(folder)).entries).toHaveLength(1)
  })

  it('keeps both lines of two appends at once in one tab without Web Locks', async () => {
    expect(navigator.locks).toBeUndefined()
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await Promise.all([
      appendAudit(folder, 'c1', entry('one')),
      appendAudit(folder, 'c1', entry('two')),
    ])
    expect((await readAudit(folder)).entries.map((e) => e.displayName)).toEqual(['one', 'two'])
  })

  it('lets the next append run after one that failed, without Web Locks', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    folder.fail('write', { name: LOG, message: 'denied' })
    const [failed, next] = await Promise.allSettled([
      appendAudit(folder, 'c1', entry('one')),
      appendAudit(folder, 'c1', entry('two')),
    ])
    expect(failed).toMatchObject({ status: 'rejected', reason: new Error('denied') })
    expect(next).toEqual({ status: 'fulfilled', value: undefined })
    expect((await readAudit(folder)).entries.map((e) => e.displayName)).toEqual(['two'])
  })

  it('takes a line back under the same Web Lock', async () => {
    const locks = new ProfileLocks()
    Object.defineProperty(navigator, 'locks', { configurable: true, value: locks })
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await appendAudit(folder, 'c1', entry('one'))
    await retractAudit(folder, 'c1', entry('one'))
    expect(await lines(folder)).toEqual([''])
    expect(locks.requested).toEqual([AUDIT_LOCK, AUDIT_LOCK])
  })
})

describe('taking a line back (#165)', () => {
  it('removes the last line that is exactly the entry, and keeps every other line', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const line = (e: AuditEntry) => JSON.stringify(e, Object.keys(e).sort())
    const ours = entry('Markus')
    const other = entry('Markus', '2026-10-07T09:00:00.000Z')
    await appendAudit(folder, 'c1', ours)
    await appendAudit(folder, 'c1', other)
    await appendAudit(folder, 'c1', ours)
    // Another tab's line, written after ours.
    await appendAudit(folder, 'c1', other)
    await retractAudit(folder, 'c1', ours)
    expect(await lines(folder)).toEqual([line(ours), line(other), line(other), ''])
  })

  it('leaves a log that no longer holds the line as it is, and writes nothing', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await folder.write(LOG, encodeText('torn {"action":\n'))
    folder.fail('write', { name: LOG, times: Infinity })
    await retractAudit(folder, 'c1', entry('Markus'))
    expect(await lines(folder)).toEqual(['torn {"action":', ''])
  })

  it('creates no log when there is none to take a line out of', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await retractAudit(folder, 'c1', entry('Markus'))
    expect(await folder.list()).toEqual([])
  })

  it('throws when the log cannot be read or rewritten', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    await appendAudit(folder, 'c1', entry('Markus'))
    folder.fail('read', { name: LOG, message: 'busy' })
    await expect(retractAudit(folder, 'c1', entry('Markus'))).rejects.toThrow('busy')
    folder.fail('write', { name: LOG, message: 'denied' })
    await expect(retractAudit(folder, 'c1', entry('Markus'))).rejects.toThrow('denied')
    expect((await readAudit(folder)).entries).toEqual([entry('Markus')])
  })
})

describe('reading the history', () => {
  it('orders every log’s lines by time, and keeps lines of the same time in the order read', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('Markus')
    const at = (hour: number) => `2026-10-07T0${hour}:00:00.000Z`
    await appendAudit(folder, 'a', entry('a at 9', at(9)))
    await appendAudit(folder, 'a', entry('a at 8', at(8)))
    await appendAudit(folder, 'b', entry('b at 8', at(8)))
    await appendAudit(folder, 'b', entry('b at 7', at(7)))
    expect((await readAudit(folder)).entries.map((e) => e.displayName)).toEqual([
      'b at 7',
      'a at 8',
      'b at 8',
      'a at 9',
    ])
  })
})
