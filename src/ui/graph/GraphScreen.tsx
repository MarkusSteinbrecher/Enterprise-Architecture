import { useModelSelector } from '@/store'

/** Placeholder — the real dependency graph lands with issue #10. */
export function GraphScreen() {
  const counts = useModelSelector((store) => ({
    nodes: store.elementCount,
    edges: store.relationshipCount,
  }))

  return (
    <section className="screen-stub">
      <h1 className="screen-stub__title">Dependency graph</h1>
      <p className="screen-stub__note">
        {counts.nodes} nodes · {counts.edges} relations — React Flow + ELKjs, issue #10
      </p>
    </section>
  )
}
