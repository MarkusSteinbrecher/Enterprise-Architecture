import { describe, expect, it } from 'vitest'
import type { Bounds, Point } from '@/model'
import { manhattanRoute } from './manhattan'

/**
 * The Manhattan route (#133): only horizontal and vertical segments, from the
 * source's outline to the target's, wherever the two boxes are. The target is
 * placed all around the source, near and far, overlapping and not.
 */

const SOURCE: Bounds = { x: 400, y: 300, width: 120, height: 55 }

function onOutline(box: Bounds, p: Point): boolean {
  const inX = p.x >= box.x && p.x <= box.x + box.width
  const inY = p.y >= box.y && p.y <= box.y + box.height
  const onX = p.x === box.x || p.x === box.x + box.width
  const onY = p.y === box.y || p.y === box.y + box.height
  return (onX && inY) || (onY && inX)
}

const targets: Bounds[] = []
for (const dx of [-400, -130, -60, -10, 0, 10, 60, 130, 400]) {
  for (const dy of [-300, -60, -30, 0, 30, 60, 300]) {
    for (const size of [
      { width: 120, height: 55 },
      { width: 40, height: 200 },
    ]) {
      targets.push({ x: SOURCE.x + dx, y: SOURCE.y + dy, ...size })
    }
  }
}

describe('manhattanRoute (#133)', () => {
  it('runs in horizontal and vertical segments only, outline to outline, for every placement', () => {
    expect(targets.length).toBeGreaterThan(100)
    for (const target of targets) {
      const route = manhattanRoute(SOURCE, target)
      const where = JSON.stringify(target)
      expect(route.length, where).toBeGreaterThanOrEqual(2)
      for (let i = 1; i < route.length; i++) {
        const a = route[i - 1]!
        const b = route[i]!
        expect(a.x === b.x || a.y === b.y, `${where}: ${JSON.stringify([a, b])}`).toBe(true)
      }
      expect(onOutline(SOURCE, route[0]!), `${where} starts on the source`).toBe(true)
      expect(onOutline(target, route[route.length - 1]!), `${where} ends on the target`).toBe(true)
    }
  })

  it('joins two boxes beside each other straight across the gap', () => {
    const beside = { x: 700, y: 300, width: 120, height: 55 }
    expect(manhattanRoute(SOURCE, beside)).toEqual([
      { x: 520, y: 328 },
      { x: 700, y: 328 },
    ])
  })

  it('turns through the middle between two boxes set diagonally apart', () => {
    const below = { x: 700, y: 600, width: 120, height: 55 }
    expect(manhattanRoute(SOURCE, below)).toEqual([
      { x: 520, y: 328 },
      { x: 610, y: 328 },
      { x: 610, y: 628 },
      { x: 700, y: 628 },
    ])
  })

  it('leaves no point on the line between its neighbours', () => {
    for (const target of targets) {
      const route = manhattanRoute(SOURCE, target)
      for (let i = 1; i < route.length - 1; i++) {
        const [a, b, c] = [route[i - 1]!, route[i]!, route[i + 1]!]
        // On the line and between its neighbours; a route that doubles back turns there.
        const between = (p: number, q: number, s: number) =>
          Math.min(p, s) <= q && q <= Math.max(p, s)
        const redundant =
          (a.x === b.x && b.x === c.x && between(a.y, b.y, c.y)) ||
          (a.y === b.y && b.y === c.y && between(a.x, b.x, c.x))
        expect(redundant, JSON.stringify(target)).toBe(false)
      }
    }
  })
})
