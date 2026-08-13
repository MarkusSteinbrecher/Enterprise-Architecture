import { describe, expect, it } from 'vitest'
import { toCanonicalJson } from './canonical-json'
import { exportExchangeXml } from './exchange-format'
import { readWorkspaceFile, supportsFileSystemAccess } from './file-system'
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

  it('reads an Archi .archimate extension through the exchange reader', async () => {
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

describe('feature detection', () => {
  it('reports no File System Access API under jsdom', () => {
    // jsdom implements neither picker, so the app takes the download path —
    // which is exactly the Firefox and Safari behaviour this guards.
    expect(supportsFileSystemAccess()).toBe(false)
  })
})
