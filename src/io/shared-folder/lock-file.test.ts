import { describe, expect, it } from 'vitest'
import { SyncWorld } from '@/test/sync-world'
import { decodeText, encodeText } from './folder'
import {
  LOCK_SCHEMA_VERSION,
  parseLock,
  readLock,
  serialiseLock,
  type LockRecord,
} from './lock-file'

const LOCK: LockRecord = {
  appVersion: '0.2.0',
  displayName: 'Markus',
  heartbeatAt: '2026-10-07T08:27:03.000Z',
  heartbeatSeq: 42,
  schemaVersion: LOCK_SCHEMA_VERSION,
  since: '2026-10-07T08:12:03.000Z',
  token: '2b0f',
}

describe('the lock file (spec §5)', () => {
  it('is canonical JSON: sorted keys, two-space indent, one trailing newline', () => {
    const text = decodeText(serialiseLock({ ...LOCK }))
    expect(text).toBe(`${JSON.stringify(LOCK, Object.keys(LOCK).sort(), 2)}\n`)
    expect(Object.keys(JSON.parse(text))).toEqual(Object.keys(LOCK).sort())
    expect(parseLock(serialiseLock(LOCK))).toEqual(LOCK)
  })

  it('is not a lock when it cannot be trusted, field by field', () => {
    const bad = (value: unknown) => parseLock(encodeText(JSON.stringify(value)))
    expect(parseLock(encodeText('{ not json'))).toBeUndefined()
    expect(parseLock(encodeText(''))).toBeUndefined()
    expect(bad([LOCK])).toBeUndefined()
    expect(bad(null)).toBeUndefined()
    expect(bad({ ...LOCK, schemaVersion: 2 })).toBeUndefined()
    expect(bad({ ...LOCK, token: '' })).toBeUndefined()
    expect(bad({ ...LOCK, token: 7 })).toBeUndefined()
    expect(bad({ ...LOCK, heartbeatSeq: -1 })).toBeUndefined()
    expect(bad({ ...LOCK, heartbeatSeq: 1.5 })).toBeUndefined()
    expect(bad({ ...LOCK, heartbeatSeq: '42' })).toBeUndefined()
    for (const field of ['appVersion', 'displayName', 'heartbeatAt', 'since'] as const) {
      const { [field]: _, ...without } = LOCK
      expect(bad(without), field).toBeUndefined()
    }
  })
})

describe('reading a lock', () => {
  it('tells a free model, a lock, an unreadable lock and a failed read apart', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('A')
    expect(await readLock(folder, 'X.json.lock')).toEqual({ kind: 'free' })

    await folder.write('X.json.lock', serialiseLock(LOCK))
    expect(await readLock(folder, 'X.json.lock')).toEqual({ kind: 'lock', lock: LOCK })

    await folder.write('X.json.lock', encodeText('{"half": '))
    expect(await readLock(folder, 'X.json.lock')).toEqual({ kind: 'unreadable' })

    folder.fail('read', { name: 'X.json.lock', message: 'locked by the sync client' })
    expect(await readLock(folder, 'X.json.lock')).toEqual({
      kind: 'read-failed',
      message: 'locked by the sync client',
    })
  })
})
