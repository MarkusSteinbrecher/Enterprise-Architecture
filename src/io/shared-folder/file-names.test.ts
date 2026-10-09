import { describe, expect, it } from 'vitest'
import { SyncWorld } from '@/test/sync-world'
import {
  conflictCopyKind,
  copyFileName,
  fileSafeName,
  freeCopyFileName,
  isAppCopyFileName,
  isLockFileName,
  isLogFileName,
  lockFileName,
  logFileName,
  stemOf,
} from './file-names'
import { encodeText } from './folder'

const AT = new Date(2026, 9, 7, 8, 27)

describe('the names the protocol writes (spec §5, §5.5)', () => {
  it('puts the lock beside the model, never behind a ~$ prefix OneDrive does not sync', () => {
    expect(lockFileName('Landscape.json')).toBe('Landscape.json.lock')
    expect(isLockFileName('Landscape.json.lock')).toBe(true)
    expect(isLockFileName('Landscape.json')).toBe(false)
    expect(stemOf('Landscape.json')).toBe('Landscape')
  })

  it('gives each client its own log', () => {
    expect(logFileName('c-1')).toBe('.archipelago-log-c-1.jsonl')
    expect(isLogFileName(logFileName('c-1'))).toBe(true)
    expect(isLogFileName('Landscape.json')).toBe(false)
  })
})

describe('a display name in a file name (spec §6.2)', () => {
  it('replaces every character Windows or SharePoint rejects, and the control characters', () => {
    expect(fileSafeName('a"b*c:d<e>f?g/h\\i|j')).toBe('a_b_c_d_e_f_g_h_i_j')
    expect(fileSafeName('tab\there\u0000\u007f')).toBe('tab_here__')
  })

  it('trims spaces and dots at either end, and a leading ~$, however they nest', () => {
    expect(fileSafeName('  Markus.  ')).toBe('Markus')
    expect(fileSafeName('~$Markus')).toBe('Markus')
    expect(fileSafeName(' . ~$ ~$Markus .')).toBe('Markus')
  })

  it('makes nothing left into "user"', () => {
    expect(fileSafeName('')).toBe('user')
    expect(fileSafeName(' ... ')).toBe('user')
    expect(fileSafeName('~$')).toBe('user')
  })

  it('leaves a name that already looks cleaned as it is', () => {
    for (const name of ['a_b', 'Markus_', '_~$x', 'user']) {
      expect(fileSafeName(fileSafeName(name))).toBe(fileSafeName(name))
    }
    expect(fileSafeName('a_b')).toBe('a_b')
  })
})

describe('the name of a copy (spec §6.2)', () => {
  it('names the person and the minute, in local time', () => {
    expect(copyFileName('Landscape.json', 'Markus', AT)).toBe(
      'Landscape (copy Markus 2026-10-07 0827).json',
    )
    expect(copyFileName('Landscape.json', 'Markus', AT, 3)).toBe(
      'Landscape (copy Markus 2026-10-07 0827 3).json',
    )
  })

  it('makes a valid name from a display name holding / : and "', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('A')
    const name = await freeCopyFileName(folder, 'Landscape.json', 'M/a:r"k', AT)
    expect(name).toBe('Landscape (copy M_a_r_k 2026-10-07 0827).json')
    expect(name).not.toMatch(/["*:<>?/\\|]/)
  })

  it('never reuses a name already there, so a second copy in the same minute keeps the first', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('A')
    const first = await freeCopyFileName(folder, 'Landscape.json', 'Markus', AT)
    await folder.write(first, encodeText('first'))
    const second = await freeCopyFileName(folder, 'Landscape.json', 'Markus', AT)
    expect(second).toBe('Landscape (copy Markus 2026-10-07 0827 2).json')
    await folder.write(second, encodeText('second'))
    expect(await freeCopyFileName(folder, 'Landscape.json', 'Markus', AT)).toBe(
      'Landscape (copy Markus 2026-10-07 0827 3).json',
    )
  })

  it('checks a name without reading the file, which on demand would download it', async () => {
    const folder = new SyncWorld({ delayMs: 0 }).client('A')
    await folder.write(copyFileName('Landscape.json', 'Markus', AT), encodeText('x'))
    folder.fail('read', { times: Infinity })
    await expect(freeCopyFileName(folder, 'Landscape.json', 'Markus', AT)).resolves.toContain(' 2)')
  })

  it('knows its own copies', () => {
    expect(isAppCopyFileName(copyFileName('Landscape.json', 'Markus', AT))).toBe(true)
    expect(isAppCopyFileName(copyFileName('Landscape.json', 'Markus', AT, 2))).toBe(true)
    expect(isAppCopyFileName('Landscape-DESKTOP7.json')).toBe(false)
  })
})

describe('a possible conflict copy (spec §8.1)', () => {
  it('matches OneDrive’s copies of the model and of its lock', () => {
    expect(conflictCopyKind('Landscape.json', 'Landscape-DESKTOP7.json')).toBe('model')
    expect(conflictCopyKind('Landscape.json', 'Landscape-DESKTOP7-2.json')).toBe('model')
    expect(conflictCopyKind('Landscape.json', 'Landscape.json-DESKTOP7.lock')).toBe('lock')
  })

  it('cannot tell a file named that way on purpose, so it is only possible', () => {
    expect(conflictCopyKind('Landscape.json', 'Landscape-v2.json')).toBe('model')
  })

  it('never matches the model, its lock, another model, or this app’s own copies', () => {
    expect(conflictCopyKind('Landscape.json', 'Landscape.json')).toBeUndefined()
    expect(conflictCopyKind('Landscape.json', 'Landscape.json.lock')).toBeUndefined()
    expect(conflictCopyKind('Landscape.json', 'Landscape-.json')).toBeUndefined()
    expect(conflictCopyKind('Landscape.json', 'Other-PC.json')).toBeUndefined()
    expect(conflictCopyKind('Landscape.json', 'Landscape-PC.json.lock')).toBeUndefined()
    expect(
      conflictCopyKind('Landscape.json', copyFileName('Landscape.json', 'Markus', AT)),
    ).toBeUndefined()
  })

  it('reads a model name holding "-", "(copy" or pattern characters as plain text', () => {
    expect(conflictCopyKind('My-Model.json', 'My-Model-PC.json')).toBe('model')
    expect(conflictCopyKind('a+b(c).json', 'a+b(c)-PC.json')).toBe('model')
    expect(conflictCopyKind('a+b(c).json', 'aab(c)-PC.json')).toBeUndefined()
    // A stem that makes this app's copy name look like a conflict copy of it.
    expect(
      conflictCopyKind(
        'Landscape (copy Markus 2026.json',
        copyFileName('Landscape.json', 'Markus', AT),
      ),
    ).toBeUndefined()
    // OneDrive's copy of this app's copy is a conflict copy of that copy.
    const copy = copyFileName('Landscape.json', 'Markus', AT)
    expect(conflictCopyKind(copy, `${stemOf(copy)}-PC.json`)).toBe('model')
  })
})
