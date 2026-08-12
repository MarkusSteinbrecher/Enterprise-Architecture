import { computeLayout } from './elk-runner'
import type { LayoutRequest } from './layout'

/**
 * Runs ELK off the main thread (concept §6.2: "ELKjs in a web worker" is the
 * pipeline LikeC4 proves in production on static hosting).
 *
 * The `ack` is what lets the caller bound the *handshake* rather than the
 * computation. A timeout on the whole job cannot tell a dead worker from a busy
 * one, and ELK on 5,000 nodes is seconds of arithmetic — so the models that most
 * need the worker are exactly the ones a job timeout would kill.
 */
self.onmessage = async (event: MessageEvent<{ id: number; request: LayoutRequest }>) => {
  const { id, request } = event.data
  self.postMessage({ id, ack: true })
  try {
    const result = await computeLayout(request)
    self.postMessage({ id, result })
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
}
