import { afterEach, describe, expect, it } from 'vitest'
import { toCanonicalJson } from './canonical-json'
import { exportExchangeXml } from './exchange-format'
import {
  FileReadError,
  importFailure,
  openWorkspaceFile,
  readWorkspaceFile,
  supportsFileSystemAccess,
} from './file-system'
import { smallWorkspace } from '@/test/fixtures'

function file(name: string, contents: string): File {
  return new File([contents], name, { type: 'text/plain' })
}

describe('reading a file the user handed us', () => {
  it('reads canonical JSON by extension', async () => {
    const result = await readWorkspaceFile(file('model.json', toCanonicalJson(smallWorkspace())))
    expect(result.ok).toBe(true)
    expect(result.workspace?.elements).toHaveLength(5)
  })

  it('reads exchange XML by extension', async () => {
    const result = await readWorkspaceFile(file('model.xml', exportExchangeXml(smallWorkspace())))
    expect(result.ok).toBe(true)
    expect(result.workspace?.relationships).toHaveLength(4)
  })

  it('reads an exchange file named .archimate with the exchange reader: the content decides', async () => {
    const result = await readWorkspaceFile(
      file('ArchiSurance.archimate', exportExchangeXml(smallWorkspace())),
    )
    expect(result.ok).toBe(true)
  })

  it('sniffs the content when the extension is unhelpful', async () => {
    // A .txt that starts with "<" is still an exchange file; refusing it would
    // be pedantry.
    const xml = await readWorkspaceFile(file('export.txt', exportExchangeXml(smallWorkspace())))
    expect(xml.ok).toBe(true)

    const json = await readWorkspaceFile(file('export.txt', toCanonicalJson(smallWorkspace())))
    expect(json.ok).toBe(true)
  })

  it('explains a file that is neither', async () => {
    const result = await readWorkspaceFile(file('notes.txt', 'just some notes'))
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toMatchObject({
      code: 'file.unrecognised',
      file: 'notes.txt',
    })
  })

  it('surfaces the problems from a partly broken file rather than refusing it', async () => {
    const broken = exportExchangeXml(smallWorkspace()).replace(
      'xsi:type="Capability"',
      'xsi:type="Microservice"',
    )
    const result = await readWorkspaceFile(file('model.xml', broken))
    expect(result.ok).toBe(true)
    expect(result.workspace?.elements).toHaveLength(4)
    expect(result.problems.map((p) => p.code)).toContain('exchange.unknown-element-type')
  })
})

describe('an import that throws (#52)', () => {
  function unreadable(name: string): File {
    const gone = file(name, '{}')
    const rejection = () =>
      Promise.reject(new DOMException('The file changed.', 'NotReadableError'))
    return Object.assign(gone, { arrayBuffer: rejection, text: rejection })
  }

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).showOpenFilePicker
    delete (window as unknown as Record<string, unknown>).showSaveFilePicker
  })

  it('throws a FileReadError when the file cannot be read', async () => {
    const thrown = await readWorkspaceFile(unreadable('synced.json')).catch((error) => error)
    expect(thrown).toBeInstanceOf(FileReadError)
    expect(thrown.message).toBe('The file changed.')
  })

  it('says the file could not be read only when it could not', () => {
    expect(importFailure(new FileReadError(new Error('gone'))).problems).toEqual([
      { severity: 'error', code: 'file.unreadable', message: 'The file could not be read: gone' },
    ])
  })

  it('calls a reader that failed on a file it read a fault, not an unreadable file', () => {
    const result = importFailure(new TypeError('x is undefined'))
    expect(result.ok).toBe(false)
    expect(result.problems).toEqual([
      {
        severity: 'error',
        code: 'import.failed',
        message:
          'The import stopped on an unexpected error: x is undefined. This is a fault in Archipelago; please report it, with the file if you can.',
      },
    ])
    expect(importFailure('thrown as a string').problems[0]?.message).toContain(
      'error: thrown as a string.',
    )
  })

  it('reports a picked file that cannot be read, through either read', async () => {
    const pick = (getFile: () => Promise<File>) =>
      Object.assign(window, {
        showSaveFilePicker: async () => ({}),
        showOpenFilePicker: async () => [{ name: 'model.json', getFile }],
      })

    pick(() => Promise.reject(new DOMException('It is gone.', 'NotFoundError')))
    expect((await openWorkspaceFile())?.result.problems).toEqual([
      expect.objectContaining({
        code: 'file.unreadable',
        message: 'The file could not be read: It is gone.',
      }),
    ])

    pick(async () => unreadable('model.json'))
    expect((await openWorkspaceFile())?.result.problems).toEqual([
      expect.objectContaining({
        code: 'file.unreadable',
        message: 'The file could not be read: The file changed.',
      }),
    ])
  })
})

describe('feature detection', () => {
  it('reports no File System Access API under jsdom', () => {
    // jsdom implements neither picker, so the app takes the download path —
    // which is exactly the Firefox and Safari behaviour this guards.
    expect(supportsFileSystemAccess()).toBe(false)
  })
})
