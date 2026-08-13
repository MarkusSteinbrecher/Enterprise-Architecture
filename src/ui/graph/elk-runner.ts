import ELK from 'elkjs/lib/elk.bundled.js'
import {
  ELK_OPTIONS,
  NODE_HEIGHT,
  NODE_WIDTH,
  type LayoutRequest,
  type LayoutResponse,
} from './layout'

/**
 * Construct an ELK, working around what `elk.bundled.js` does when it believes
 * it *is* the worker.
 *
 * The first time an ELK is constructed, the bundle requires its own
 * `elk-worker.min.js`, and that file branches on
 * `typeof document === 'undefined' && typeof self !== 'undefined'` — its test
 * for "I am running inside a Web Worker". In that branch it installs itself as
 * the worker (`self.onmessage = …`) and exports nothing at all.
 *
 * Both halves are fatal here, because this module runs inside a Web Worker of
 * *our* making (`layout.worker.ts`). The `Worker` the bundle then reads off its
 * own exports is `undefined`, so `new ELK()` threw "U8 is not a constructor" —
 * the message the graph screen reported — and had it not thrown, the handler
 * `layout.worker.ts` installed would already have been replaced by ELK's
 * dispatcher, swallowing every later layout request until the ack timeout.
 *
 * Presenting a `document` for the length of the constructor call takes the
 * export branch instead, which is the in-process layout worker we want: our own
 * worker is already the thing keeping ELK off the main thread. elkjs reads
 * nothing off the object — the only other mention of `document` in
 * `elk-worker.min.js` is `$doc.documentMode`, behind an `msie` user-agent test —
 * and it is removed again immediately, so nothing else in the worker can
 * feature-detect a DOM that isn't there. Later constructions reuse the module
 * the bundle cached on this one.
 */
function createElk(): InstanceType<typeof ELK> {
  if (typeof document !== 'undefined') return new ELK()

  const scope = globalThis as { document?: unknown }
  scope.document = {}
  try {
    return new ELK()
  } finally {
    delete scope.document
  }
}

/**
 * The ELK call itself, isolated so it can run either inside the worker or on the
 * main thread as a fallback. It reads nothing from the DOM — the one `document`
 * it writes is `createElk`'s decoy, gone before this function resumes.
 */
export async function computeLayout(request: LayoutRequest): Promise<LayoutResponse> {
  const elk = createElk()
  const graph = {
    id: 'root',
    layoutOptions: ELK_OPTIONS,
    children: request.nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      layoutOptions: { 'elk.partitioning.partition': String(node.partition) },
    })),
    edges: request.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  }

  // elkjs types the return as the input shape; the layout result carries the
  // computed geometry, which is what we are here for.
  const laid = (await elk.layout(graph)) as {
    children?: { id: string; x?: number; y?: number }[]
    width?: number
    height?: number
  }
  const nodes = (laid.children ?? []).map((child) => ({
    id: child.id,
    x: child.x ?? 0,
    y: child.y ?? 0,
  }))
  return {
    nodes,
    width: laid.width ?? extent(nodes, 'x', NODE_WIDTH),
    height: laid.height ?? extent(nodes, 'y', NODE_HEIGHT),
  }
}

function extent(nodes: { x: number; y: number }[], axis: 'x' | 'y', size: number): number {
  return nodes.reduce((max, node) => Math.max(max, node[axis] + size), 0)
}
