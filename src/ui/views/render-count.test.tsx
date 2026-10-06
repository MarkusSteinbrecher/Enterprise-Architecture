import { describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SCHEMA_VERSION, type Element, type Relationship, type View, type Workspace } from '@/model'
import { ModelStore, ModelStoreContext, type ModelStoreContextValue } from '@/store'
import type * as Notation from '@/ui/notation'
import { moveSelection } from './edit'
import { ViewScreen } from './ViewScreen'

/**
 * #128, from ADR 0006's consequences: an edit redraws what it changed and
 * nothing else. The spike measured a 133 ms commit at 1,360 objects because
 * every node was a new object after every edit. Each shape and each line is
 * counted as it renders, by name, so the test sees exactly which were redrawn.
 */

const renders = new Map<string, number>()
const count = (key: string) => renders.set(key, (renders.get(key) ?? 0) + 1)

vi.mock('@/ui/notation', async (importOriginal) => {
  const actual = await importOriginal<typeof Notation>()
  return {
    ...actual,
    ElementShape: (props: React.ComponentProps<typeof actual.ElementShape>) => {
      count(`shape ${props.name}`)
      return <actual.ElementShape {...props} />
    },
    RelationshipLine: (props: React.ComponentProps<typeof actual.RelationshipLine>) => {
      count(`line ${props.label ?? ''}`)
      return <actual.RelationshipLine {...props} />
    },
  }
})

const SIZE = 500

function workspace(): Workspace {
  const elements: Element[] = []
  const relationships: Relationship[] = []
  const view: View = { id: 'v', name: 'Big', properties: {}, nodes: [], connections: [] }
  for (let i = 0; i < SIZE; i++) {
    elements.push({ id: `e${i}`, type: 'ApplicationComponent', name: `E${i}`, properties: {} })
    view.nodes.push({
      id: `n${i}`,
      kind: 'element',
      element: `e${i}`,
      bounds: { x: (i % 25) * 160, y: Math.floor(i / 25) * 80, width: 120, height: 55 },
    })
    if (i > 0) {
      relationships.push({
        id: `r${i}`,
        type: 'Flow',
        source: `e${i - 1}`,
        target: `e${i}`,
        name: `R${i}`,
        properties: {},
      })
      view.connections.push({
        id: `c${i}`,
        kind: 'relationship',
        relationship: `r${i}`,
        source: `n${i - 1}`,
        target: `n${i}`,
      })
    }
  }
  return {
    id: 'ws',
    name: 'Scale',
    schemaVersion: SCHEMA_VERSION,
    elements,
    relationships,
    views: [view],
    folders: [],
    reports: [],
    tagGroups: [],
  }
}

describe('an edit redraws only what it changed (#128)', () => {
  it('moving one shape of 500 redraws that shape and its two lines, and nothing else', () => {
    const store = new ModelStore(workspace())
    const value = { store, role: 'writer', ready: true } as unknown as ModelStoreContextValue
    render(
      <MemoryRouter
        initialEntries={['/view/v']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ModelStoreContext.Provider value={value}>
          <Routes>
            <Route path="/view/:id" element={<ViewScreen />} />
          </Routes>
        </ModelStoreContext.Provider>
      </MemoryRouter>,
    )
    // Presence first: every shape and line was drawn.
    expect(renders.get('shape E0')).toBeGreaterThan(0)
    expect(renders.get('shape E499')).toBeGreaterThan(0)
    expect(renders.get('line R1')).toBeGreaterThan(0)

    const before = new Map(renders)
    act(() => {
      store.updateView('v', (v) => moveSelection(v, new Set(['n250']), 7, 3))
    })
    const redrawn = [...renders].filter(([key, n]) => n !== before.get(key)).map(([key]) => key)
    expect(redrawn.sort()).toEqual(['line R250', 'line R251', 'shape E250'])
  })
})
