import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ElementType } from '@/model'
import { loadDemoWorkspace } from '@/io'
import { newId, useModelSelector, useModelStoreContext } from '@/store'
import { ActiveFilterChips } from './ActiveFilterChips'
import { CreateElementDialog } from './CreateElementDialog'
import { FilterRail } from './FilterRail'
import { InventoryCards } from './InventoryCards'
import { InventoryTable } from './InventoryTable'
import { buildFacetGroups, countFacets } from './facets'
import { SAVED_SEARCHES, applyFilter } from './filters'
import { useInventoryState } from './use-inventory-state'
import './inventory.css'

/**
 * The inventory — find, filter, scan and open any element in the workspace
 * (handoff "Screen 1").
 *
 * Everything that defines what the user is looking at lives in the URL, so a
 * filtered view is a link and back/forward work.
 */

export function InventoryScreen() {
  const { store, role } = useModelStoreContext()
  const navigate = useNavigate()
  const state = useInventoryState()
  const [creating, setCreating] = useState(false)

  // Evaluated at today: the inventory is always "now", the graph has the slider.
  const at = useMemo(() => Date.now(), [])

  const model = useModelSelector((s) => ({
    elements: s.elementList(),
    tagGroups: [...s.tagGroups],
    completeness: (id: string) => s.completeness(id),
  }))

  const groups = useMemo(() => buildFacetGroups({ tagGroups: model.tagGroups }), [model.tagGroups])
  const counts = useMemo(() => countFacets(model.elements, at), [model.elements, at])
  // Saved searches show how many elements they return, not how many facets they carry.
  const savedCounts = useMemo(
    () =>
      new Map(
        SAVED_SEARCHES.map((saved) => [
          saved.id,
          applyFilter(model.elements, { facets: saved.facets, mode: saved.mode, query: '' }, at)
            .length,
        ]),
      ),
    [model.elements, at],
  )
  const filtered = useMemo(
    () => applyFilter(model.elements, state, at),
    [model.elements, state, at],
  )

  const total = model.elements.length
  const readOnly = role === 'reader'

  const createElement = (type: ElementType, name: string) => {
    const element = { id: newId('el'), type, name, properties: {} }
    store.addElement(element)
    setCreating(false)
    navigate(`/element/${element.id}`)
  }

  return (
    <div className="inventory">
      <FilterRail
        groups={groups}
        counts={counts}
        savedCounts={savedCounts}
        facets={state.facets}
        mode={state.mode}
        onFacetsChange={state.setFacets}
        onModeChange={state.setMode}
        onApplySaved={state.applySaved}
        onClear={state.clear}
      />

      <section className="inventory__main">
        <div className="inventory__head">
          <div>
            <h1 className="inventory__title">Inventory</h1>
            <p className="inventory__result">
              {`${filtered.length} of ${total} element${total === 1 ? '' : 's'}`}
              {state.facets.length > 0 &&
                ` · ${state.facets.length} filter${state.facets.length === 1 ? '' : 's'} (${state.mode})`}
            </p>
          </div>

          <div className="inventory__controls">
            <input
              className="inventory__filter"
              placeholder="Filter by name…"
              value={state.query}
              onChange={(event) => state.setQuery(event.target.value)}
              aria-label="Filter by name"
            />
            <div className="segmented" role="group" aria-label="Presentation">
              {(['table', 'cards'] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  className={`segmented__option${state.view === view ? ' segmented__option--active' : ''}`}
                  aria-pressed={state.view === view}
                  onClick={() => state.setView(view)}
                >
                  {view.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="button button--primary"
              onClick={() => setCreating(true)}
              disabled={readOnly}
            >
              + Element
            </button>
          </div>
        </div>

        <ActiveFilterChips
          facets={state.facets}
          onRemove={(facet) => state.setFacets(state.facets.filter((f) => f !== facet))}
        />

        {total === 0 ? (
          <div className="inventory__first-run">
            <p className="inventory__first-run-text">
              This workspace is empty. Load the demo to see what a landscape looks like — the
              three-action first-run screen lands with #11.
            </p>
            <button
              type="button"
              className="button button--primary"
              disabled={readOnly}
              onClick={() => store.replaceWorkspace(loadDemoWorkspace(), { markClean: false })}
            >
              Load the demo workspace
            </button>
          </div>
        ) : state.view === 'table' ? (
          <InventoryTable
            elements={filtered}
            at={at}
            completenessOf={model.completeness}
            onOpen={(id) => navigate(`/element/${id}`)}
          />
        ) : (
          <InventoryCards
            elements={filtered}
            at={at}
            completenessOf={model.completeness}
            onOpen={(id) => navigate(`/element/${id}`)}
          />
        )}
      </section>

      {creating && (
        <CreateElementDialog onCancel={() => setCreating(false)} onCreate={createElement} />
      )}
    </div>
  )
}
