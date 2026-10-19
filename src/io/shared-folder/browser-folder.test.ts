import { afterEach, describe, expect, it, vi } from 'vitest'
import { FakeDirectoryHandle } from '@/test/fake-directory'
import {
  browserFolder,
  folderPermission,
  pickDirectory,
  supportsDirectoryAccess,
} from './browser-folder'
import { decodeText, encodeText } from './folder'

/**
 * The adapter over the browser's directory handle. jsdom has none, so this is
 * the fake's protocol; `tests/e2e/shared-folder.spec.ts` runs real handles.
 */

afterEach(() => vi.unstubAllGlobals())

describe('a folder over a directory handle (spec §4)', () => {
  it('lists, checks, reads, writes and removes files', async () => {
    const dir = new FakeDirectoryHandle('Architecture', { 'b.json': 'B', 'a.json': 'A' })
    const folder = browserFolder(dir.handle)
    expect(await folder.list()).toEqual(['a.json', 'b.json'])
    expect(await folder.has('a.json')).toBe(true)
    expect(await folder.has('c.json')).toBe(false)
    expect(decodeText((await folder.read('a.json'))!)).toBe('A')
    await folder.write('c.json', encodeText('C'))
    expect(decodeText(dir.files.get('c.json')!)).toBe('C')
    await folder.remove('a.json')
    expect(await folder.list()).toEqual(['b.json', 'c.json'])
  })

  it('reads a missing file as missing, and removes one without complaint', async () => {
    const folder = browserFolder(new FakeDirectoryHandle('F').handle)
    expect(await folder.read('nope.json')).toBeUndefined()
    await expect(folder.remove('nope.json')).resolves.toBeUndefined()
  })

  it('passes on a close() that rejects, and leaves the file as it was', async () => {
    const dir = new FakeDirectoryHandle('F', { 'a.json': 'kept' })
    dir.rejectNextClose = 'a.json'
    await expect(browserFolder(dir.handle).write('a.json', encodeText('lost'))).rejects.toThrow(
      'in use',
    )
    expect(decodeText(dir.files.get('a.json')!)).toBe('kept')
  })

  it('abandons a write that fails before close(), and passes the failure on', async () => {
    const dir = new FakeDirectoryHandle('F', { 'a.json': 'kept' })
    const aborted: string[] = []
    const real = dir.getFileHandle.bind(dir)
    vi.spyOn(dir, 'getFileHandle').mockImplementation(async (name, options) => {
      const handle = await real(name, options)
      return {
        ...handle,
        createWritable: async () => ({
          write: async () => {
            throw new DOMException('quota', 'QuotaExceededError')
          },
          close: async () => {
            throw new Error('a failed write must not be closed into place')
          },
          abort: async () => {
            aborted.push(name)
            // An abort that fails too must not hide why the write failed.
            throw new DOMException('gone', 'InvalidStateError')
          },
        }),
      }
    })
    await expect(browserFolder(dir.handle).write('a.json', encodeText('lost'))).rejects.toThrow(
      'quota',
    )
    expect(aborted).toEqual(['a.json'])
    expect(decodeText(dir.files.get('a.json')!)).toBe('kept')
  })

  it('passes on a delete that fails for any reason but a missing file', async () => {
    const dir = new FakeDirectoryHandle('F', { 'a.json': 'kept' })
    vi.spyOn(dir, 'removeEntry').mockRejectedValue(
      new DOMException('in use', 'NoModificationAllowedError'),
    )
    await expect(browserFolder(dir.handle).remove('a.json')).rejects.toThrow('in use')
    vi.spyOn(dir, 'removeEntry').mockRejectedValue(new TypeError('not a DOMException'))
    await expect(browserFolder(dir.handle).remove('a.json')).rejects.toThrow('not a DOMException')
    expect(dir.files.has('a.json')).toBe(true)
  })

  it('passes on any other failure, which is not a missing file', async () => {
    const dir = new FakeDirectoryHandle('F')
    vi.spyOn(dir, 'getFileHandle').mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    await expect(browserFolder(dir.handle).read('a.json')).rejects.toThrow('denied')
    await expect(browserFolder(dir.handle).has('a.json')).rejects.toThrow('denied')
  })
})

describe('permission to write into the folder', () => {
  it('asks only when told to, which the browser allows only from a click', async () => {
    const dir = new FakeDirectoryHandle('F')
    dir.permission = 'prompt'
    expect(await folderPermission(dir.handle)).toBe('prompt')
    expect(dir.requests).toBe(0)
    expect(await folderPermission(dir.handle, { request: true })).toBe('granted')
    expect(dir.requests).toBe(1)
  })

  it('counts a handle that cannot be asked as granted, and one that cannot ask as it stands', async () => {
    // The permission methods are outside TypeScript's DOM library and not
    // promised on every handle; without them, the adapter does not ask.
    const silent = {} as unknown as FileSystemDirectoryHandle
    expect(await folderPermission(silent, { request: true })).toBe('granted')
    const mute = { queryPermission: async () => 'prompt' } as unknown as FileSystemDirectoryHandle
    expect(await folderPermission(mute, { request: true })).toBe('prompt')
  })

  it('reports a refusal', async () => {
    const dir = new FakeDirectoryHandle('F')
    dir.permission = 'prompt'
    dir.answer = 'denied'
    expect(await folderPermission(dir.handle, { request: true })).toBe('denied')
  })
})

describe('picking a folder', () => {
  it('exists only where the browser has the picker', () => {
    expect(supportsDirectoryAccess()).toBe(false)
    vi.stubGlobal('showDirectoryPicker', async () => new FakeDirectoryHandle('F').handle)
    expect(supportsDirectoryAccess()).toBe(true)
  })

  it('treats a cancelled picker as nothing picked, and passes on anything else', async () => {
    vi.stubGlobal('showDirectoryPicker', async () => {
      throw new DOMException('cancelled', 'AbortError')
    })
    expect(await pickDirectory()).toBeUndefined()
    vi.stubGlobal('showDirectoryPicker', async () => {
      throw new DOMException('blocked', 'SecurityError')
    })
    await expect(pickDirectory()).rejects.toThrow('blocked')
  })
})
