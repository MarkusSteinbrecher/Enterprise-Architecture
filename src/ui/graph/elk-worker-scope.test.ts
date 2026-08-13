import { expect, it } from 'vitest'
import { computeLayout } from './elk-runner'
import type { LayoutRequest } from './layout'

/**
 * `elk.bundled.js` behaves differently depending on whether it believes it is
 * running inside a Web Worker, and the branch it takes when it does — install
 * itself as the worker, export no constructor — is the one `layout.worker.ts`
 * hits in every real browser. Every other test in this repo runs in jsdom, where
 * `document` exists, so all of them take the other branch and none of them could
 * ever see it: the graph screen reported "U8 is not a constructor" on a green
 * suite.
 *
 * So this test builds the scope the worker actually has — `self` defined (jsdom
 * already provides it), `document` not — and drives the real ELK. Remove the
 * `createElk` shim in `elk-runner.ts` and it fails with that same message.
 */
const REQUEST: LayoutRequest = {
  nodes: [
    { id: 'a', partition: 0 },
    { id: 'b', partition: 1 },
  ],
  edges: [{ id: 'a->b', source: 'a', target: 'b' }],
}

it('lays out inside a worker scope, and leaves that scope as it found it', async () => {
  const scope = globalThis as typeof globalThis & { onmessage: unknown }
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const originalHandler = scope.onmessage
  const handler = () => {}
  scope.onmessage = handler
  Reflect.deleteProperty(globalThis, 'document')

  try {
    // Without these two the test asserts nothing: it is the *combination* that
    // sends elkjs down the worker branch.
    expect(typeof document).toBe('undefined')
    expect(typeof self).not.toBe('undefined')

    const result = await computeLayout(REQUEST)

    expect(result.nodes.map((node) => node.id).sort()).toEqual(['a', 'b'])
    // ELK's own dispatcher takes this over on the way in, which would have left
    // the worker deaf to every later layout request.
    expect(scope.onmessage).toBe(handler)
    // And the DOM we borrow to get past the sniff is not left lying around for
    // anything else in the worker to feature-detect.
    expect(typeof document).toBe('undefined')
  } finally {
    scope.onmessage = originalHandler
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
  }
})
