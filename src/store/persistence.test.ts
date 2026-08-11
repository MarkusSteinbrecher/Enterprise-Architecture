import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { emptyWorkspace } from '@/model'
import { smallWorkspace } from '@/test/fixtures'
import {
  GENERATIONS,
  deleteWorkspace,
  listWorkspaces,
  loadGenerations,
  loadMostRecentWorkspace,
  loadWorkspace,
  renameStoredWorkspace,
  resetDatabaseConnection,
  saveSnapshot,
} from './persistence'

beforeEach(() => {
  // A fresh factory per test — no shared state between cases.
  globalThis.indexedDB = new IDBFactory()
  resetDatabaseConnection()
})

describe('IndexedDB persistence', () => {
  it('round-trips a workspace', async () => {
    const workspace = smallWorkspace()
    await saveSnapshot(workspace)

    const restored = await loadWorkspace(workspace.id)
    expect(restored?.name).toBe('ArchiSurance')
    expect(restored?.elements).toHaveLength(5)
    expect(restored?.relationships).toHaveLength(4)
    // Relationship properties are first class and must survive the trip.
    expect(restored?.relationships.find((r) => r.id === 'rel-app-proc')?.profile).toEqual({
      annualCost: 1_200_000,
      currency: 'EUR',
    })
  })

  it('lists workspaces newest first with their counts', async () => {
    await saveSnapshot(smallWorkspace(), 1_000)
    await saveSnapshot(emptyWorkspace('ws-empty', 'Empty'), 2_000)

    const list = await listWorkspaces()
    expect(list.map((meta) => meta.id)).toEqual(['ws-empty', 'ws-test'])
    expect(list[1]).toMatchObject({ name: 'ArchiSurance', elementCount: 5, relationshipCount: 4 })
  })

  it('opens the most recently written workspace on boot', async () => {
    await saveSnapshot(emptyWorkspace('ws-old', 'Old'), 1_000)
    await saveSnapshot(smallWorkspace(), 5_000)
    expect((await loadMostRecentWorkspace())?.id).toBe('ws-test')
  })

  it('keeps a rolling window of generations', async () => {
    const workspace = smallWorkspace()
    for (let i = 0; i < GENERATIONS + 4; i += 1) {
      await saveSnapshot({ ...workspace, name: `Generation ${i}` }, 1_000 + i)
    }

    const generations = await loadGenerations(workspace.id)
    expect(generations).toHaveLength(GENERATIONS)
    // Newest first, and the oldest ones are gone.
    expect(generations[0]?.workspace.name).toBe(`Generation ${GENERATIONS + 3}`)
    expect(generations.at(-1)?.workspace.name).toBe('Generation 4')
    expect(generations.map((g) => g.seq)).toEqual([9, 8, 7, 6, 5])
  })

  it('keeps generations of different workspaces apart', async () => {
    await saveSnapshot(smallWorkspace())
    await saveSnapshot(emptyWorkspace('ws-other', 'Other'))
    expect(await loadGenerations('ws-test')).toHaveLength(1)
    expect(await loadGenerations('ws-other')).toHaveLength(1)
  })

  it('renames and deletes workspaces', async () => {
    await saveSnapshot(smallWorkspace())
    await renameStoredWorkspace('ws-test', 'Client engagement')
    expect((await listWorkspaces())[0]?.name).toBe('Client engagement')

    await deleteWorkspace('ws-test')
    expect(await listWorkspaces()).toEqual([])
    expect(await loadGenerations('ws-test')).toEqual([])
    expect(await loadWorkspace('ws-test')).toBeUndefined()
  })

  it('reports nothing for an unknown workspace rather than throwing', async () => {
    expect(await loadWorkspace('ws-missing')).toBeUndefined()
    expect(await loadMostRecentWorkspace()).toBeUndefined()
    await expect(renameStoredWorkspace('ws-missing', 'x')).resolves.toBeUndefined()
  })
})
