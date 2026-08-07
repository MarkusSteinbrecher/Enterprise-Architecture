import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// Node 25 ships a Web Storage global that shadows jsdom's `localStorage` with a
// non-functional instance (it warns about --localstorage-file). Detect the broken
// shape and install a plain in-memory Storage so tests behave like a browser.
if (typeof globalThis.localStorage?.getItem !== 'function') {
  const memoryStorage = (): Storage => {
    const map = new Map<string, string>()
    return {
      get length() {
        return map.size
      },
      clear: () => map.clear(),
      getItem: (key: string) => map.get(key) ?? null,
      key: (index: number) => [...map.keys()][index] ?? null,
      removeItem: (key: string) => void map.delete(key),
      setItem: (key: string, value: string) => void map.set(key, String(value)),
    }
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: memoryStorage(),
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    writable: true,
    value: memoryStorage(),
  })
}

// React Flow observes its container and reads matrix transforms; jsdom has
// neither API. These stubs are enough for it to mount and render nodes.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

if (typeof globalThis.DOMMatrixReadOnly === 'undefined') {
  globalThis.DOMMatrixReadOnly = class {
    m22 = 1
    constructor(_transform?: string) {}
  } as unknown as typeof DOMMatrixReadOnly
}

// jsdom has no layout, so it implements no scrolling APIs.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// jsdom implements neither of these; several modules feature-detect them.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}
