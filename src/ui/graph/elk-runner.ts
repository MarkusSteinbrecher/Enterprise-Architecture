import ELK from 'elkjs/lib/elk.bundled.js'
import {
  ELK_OPTIONS,
  NODE_HEIGHT,
  NODE_WIDTH,
  type LayoutRequest,
  type LayoutResponse,
} from './layout'

/**
 * The ELK call itself, isolated so it can run either inside the worker or on the
 * main thread as a fallback. Nothing here touches the DOM.
 */
export async function computeLayout(request: LayoutRequest): Promise<LayoutResponse> {
  const elk = new ELK()
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
