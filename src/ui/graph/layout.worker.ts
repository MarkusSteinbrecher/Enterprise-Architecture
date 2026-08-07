import { computeLayout } from './elk-runner'
import type { LayoutRequest } from './layout'

/**
 * Runs ELK off the main thread (concept §6.2: "ELKjs in a web worker" is the
 * pipeline LikeC4 proves in production on static hosting).
 */
self.onmessage = async (event: MessageEvent<{ id: number; request: LayoutRequest }>) => {
  const { id, request } = event.data
  try {
    const result = await computeLayout(request)
    self.postMessage({ id, result })
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
}
