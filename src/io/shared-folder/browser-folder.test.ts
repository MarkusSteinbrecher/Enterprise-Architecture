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
    dir.rejectNextClose = true
    await expect(browserFolder(dir.handle).write('a.json', encodeText('lost'))).rejects.toThrow(
      'in use',
    )
    expect(decodeText(dir.files.get('a.json')!)).toBe('kept')
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
