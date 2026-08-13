import { loadDemoWorkspace } from '@/io'
import { useModelSelector, useModelStoreContext } from '@/store'

/**
 * Placeholder — the real inventory lands with issue #8.
 *
 * The "Load the demo workspace" action is an interim affordance so a fresh
 * browser has something to look at; the proper three-action first-run screen
 * (Start empty · Import a file · Explore the demo) is issue #11.
 */
export function InventoryScreen() {
  const { store, role } = useModelStoreContext()
  const count = useModelSelector((s) => s.elementCount)

  return (
    <section className="screen-stub">
      <h1 className="screen-stub__title">Inventory</h1>
      <p className="screen-stub__note">
        {count === 0
          ? 'This workspace is empty. Faceted list, table and cards — issue #8.'
          : `${count} elements. Faceted list, table and cards — issue #8.`}
      </p>
      {count === 0 && (
        <button
          type="button"
          className="screen-stub__action"
          disabled={role === 'reader'}
          onClick={() => store.replaceWorkspace(loadDemoWorkspace(), { markClean: false })}
        >
          Load the demo workspace
        </button>
      )}
    </section>
  )
}
