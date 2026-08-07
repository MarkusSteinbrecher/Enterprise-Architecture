import type { Element, Relationship } from '@/model'
import { BANDS, bandOf, partitionOf, type Band } from './bands'

/**
 * ELK layout for the dependency graph.
 *
 * The prototype's hand-placed coordinates were stand-ins; this replaces them.
 * `layered` with partitioning gives the three bands: partitions become stacked
 * layers, and `elk.direction: UP` puts partition 0 at the bottom, so technology
 * sits under application sits under business.
 *
 * Layout runs in a **web worker** — ELK on a 5,000-node graph is seconds of
 * arithmetic, and doing it on the main thread would freeze the toolbar the user
 * is holding. `runLayout` falls back to the main thread where Worker is
 * unavailable (jsdom, and any browser that blocks module workers), because a
 * slow graph beats no graph.
 */

export const NODE_WIDTH = 150
export const NODE_HEIGHT = 42

export interface LayoutNode {
  id: string
  x: number
  y: number
  band: Band
}

export interface LayoutResult {
  nodes: Map<string, LayoutNode>
  bands: Record<Band, { y: number; height: number } | undefined>
  width: number
  height: number
}

export interface LayoutRequest {
  nodes: { id: string; partition: number }[]
  edges: { id: string; source: string; target: string }[]
}

export interface LayoutResponse {
  nodes: { id: string; x: number; y: number }[]
  width: number
  height: number
}

/** Layout options, shared by the worker and the main-thread fallback. */
export const ELK_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'UP',
  'elk.partitioning.activate': 'true',
  'elk.spacing.nodeNode': '24',
  'elk.layered.spacing.nodeNodeBetweenLayers': '52',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.crossingMinimization.semiInteractive': 'true',
  'elk.edgeRouting': 'POLYLINE',
}

let worker: Worker | undefined
let nextRequestId = 1

/** How long to wait for the worker before laying out on the main thread. */
const WORKER_TIMEOUT_MS = 10_000

function getWorker(): Worker | undefined {
  if (typeof Worker === 'undefined') return undefined
  if (!worker) {
    try {
      worker = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      return undefined
    }
  }
  return worker
}

/**
 * A worker that fails to start — a blocked module worker, a bundler quirk, an
 * out-of-memory kill — must not leave the graph waiting forever. Every failure
 * path resolves `undefined` so the caller falls back to the main thread, and the
 * worker is discarded so the next attempt does not queue behind a dead one.
 */
async function layoutInWorker(request: LayoutRequest): Promise<LayoutResponse | undefined> {
  const instance = getWorker()
  if (!instance) return undefined
  const id = nextRequestId++

  return new Promise<LayoutResponse | undefined>((resolve) => {
    let settled = false
    const finish = (result: LayoutResponse | undefined, discard = false) => {
      if (settled) return
      settled = true
      instance.removeEventListener('message', onMessage)
      instance.removeEventListener('error', onError)
      instance.removeEventListener('messageerror', onError)
      clearTimeout(timer)
      if (discard) {
        instance.terminate()
        if (worker === instance) worker = undefined
      }
      resolve(result)
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { id: number; result?: LayoutResponse; error?: string }
      if (data.id !== id) return
      finish(data.result)
    }
    const onError = () => finish(undefined, true)

    instance.addEventListener('message', onMessage)
    instance.addEventListener('error', onError)
    instance.addEventListener('messageerror', onError)

    // A worker that never answers is indistinguishable from one that never
    // started, and both mean: lay out here instead.
    const timer = setTimeout(() => finish(undefined, true), WORKER_TIMEOUT_MS)

    instance.postMessage({ id, request })
  })
}

async function layoutOnMainThread(request: LayoutRequest): Promise<LayoutResponse> {
  const { computeLayout } = await import('./elk-runner')
  return computeLayout(request)
}

/**
 * Lay out a set of elements and relationships.
 * Returns positions in the same coordinate space React Flow uses (top-left of
 * each node), plus the band rectangles derived from where the nodes landed.
 */
export async function runLayout(
  elements: readonly Element[],
  relationships: readonly Relationship[],
): Promise<LayoutResult> {
  const bandById = new Map<string, Band>()
  for (const element of elements) bandById.set(element.id, bandOf(element))

  const known = new Set(elements.map((element) => element.id))
  const request: LayoutRequest = {
    nodes: elements.map((element) => ({
      id: element.id,
      partition: partitionOf(bandById.get(element.id) ?? 'business'),
    })),
    edges: relationships
      .filter((r) => known.has(r.source) && known.has(r.target) && r.source !== r.target)
      .map((r) => ({ id: r.id, source: r.source, target: r.target })),
  }

  const response = (await layoutInWorker(request)) ?? (await layoutOnMainThread(request))
  return toResult(response, bandById)
}

/** Air above and below the content of a band, inside its dashed rectangle. */
const BAND_PADDING = 18
/** Vertical space between two band rectangles. */
const BAND_GAP = 34

/**
 * Turn ELK's output into bands.
 *
 * ELK's partitioning constrains the *order* of layers, not their count: a
 * partition with many nodes spreads across several layers, so application
 * elements can end up interleaved with business ones vertically. That is a
 * perfectly good layered drawing, but it is not the three-band landscape the
 * design asks for.
 *
 * So the bands are re-stacked afterwards: ELK's horizontal ordering and relative
 * vertical arrangement within a band are kept exactly, and each band is
 * translated so the three occupy disjoint, labelled rows. The expensive part —
 * crossing minimisation and node placement — is still ELK's.
 */
function toResult(response: LayoutResponse, bandById: Map<string, Band>): LayoutResult {
  const byBand = new Map<Band, { id: string; x: number; y: number }[]>()
  for (const node of response.nodes) {
    const band = bandById.get(node.id) ?? 'business'
    const bucket = byBand.get(band)
    if (bucket) bucket.push(node)
    else byBand.set(band, [node])
  }

  const nodes = new Map<string, LayoutNode>()
  const bands = {} as LayoutResult['bands']
  let cursor = 0
  let width = 0

  for (const band of BANDS) {
    const members = byBand.get(band)
    if (!members || members.length === 0) {
      bands[band] = undefined
      continue
    }

    const top = Math.min(...members.map((node) => node.y))
    const bottom = Math.max(...members.map((node) => node.y + NODE_HEIGHT))
    const height = bottom - top

    for (const node of members) {
      const y = cursor + BAND_PADDING + (node.y - top)
      nodes.set(node.id, { id: node.id, x: node.x, y, band })
      width = Math.max(width, node.x + NODE_WIDTH)
    }

    bands[band] = { y: cursor, height: height + BAND_PADDING * 2 }
    cursor += height + BAND_PADDING * 2 + BAND_GAP
  }

  return {
    nodes,
    bands,
    width: Math.max(width, response.width),
    height: Math.max(cursor - BAND_GAP, 0),
  }
}
