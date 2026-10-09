import { describe, expect, it } from 'vitest'
import { SyncWorld } from '@/test/sync-world'
import { encodeText } from './folder'
import { listFolder } from './listing'

async function folderWith(...names: string[]) {
  const folder = new SyncWorld({ delayMs: 0 }).client('A')
  for (const name of names) await folder.write(name, encodeText('{}'))
  return folder
}

describe('listing a shared folder (spec §4)', () => {
  it('lists the models by name, without locks, logs or other files', async () => {
    const folder = await folderWith(
      'Landscape.json',
      'Landscape.json.lock',
      '.archipelago-log-c1.jsonl',
      'Claims.json',
      'notes.txt',
      'Archi.archimate',
    )
    expect(await listFolder(folder)).toEqual({
      models: ['Claims.json', 'Landscape.json'],
      conflictCopies: [],
    })
  })

  it('reads no file, which with Files On-Demand would download it', async () => {
    const folder = await folderWith('Landscape.json', 'Claims.json')
    folder.fail('read', { times: Infinity })
    expect((await listFolder(folder)).models).toEqual(['Claims.json', 'Landscape.json'])
  })

  it('lists a possible conflict copy apart, under the model it may copy', async () => {
    const folder = await folderWith('Landscape.json', 'Landscape-DESKTOP7.json', 'Claims.json')
    expect(await listFolder(folder)).toEqual({
      models: ['Claims.json', 'Landscape.json'],
      conflictCopies: [{ name: 'Landscape-DESKTOP7.json', of: 'Landscape.json' }],
    })
  })

  it('keeps a file as a model when there is no model it could be a copy of', async () => {
    const folder = await folderWith('Landscape-v2.json')
    expect((await listFolder(folder)).models).toEqual(['Landscape-v2.json'])
  })

  it('keeps this app’s own copies as models', async () => {
    const folder = await folderWith('Landscape.json', 'Landscape (copy Ana 2026-10-07 0827).json')
    expect((await listFolder(folder)).models).toEqual([
      'Landscape (copy Ana 2026-10-07 0827).json',
      'Landscape.json',
    ])
  })
})
