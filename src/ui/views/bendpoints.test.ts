import { describe, expect, it } from 'vitest'
import type { ViewConnection } from '@/model'
import { insertBendpoint, moveBendpoint, removeBendpoint } from './bendpoints'

/**
 * The edits' own edges (#133): each returns the connection itself when there
 * is nothing to change, which is how the store knows to record no command.
 */

const line: ViewConnection = {
  id: 'c',
  kind: 'line',
  source: 'a',
  target: 'b',
  bendpoints: [
    { x: 10, y: 10 },
    { x: 20, y: 20 },
  ],
}

describe('bend-point edits that change nothing (#133)', () => {
  it('inserts on a segment of the route, and on no segment the route does not have', () => {
    // Two bend-points make three segments: 0, 1 and 2.
    expect(insertBendpoint(line, 2, { x: 30, y: 30 }).bendpoints).toHaveLength(3)
    // splice would put these at the end and second from the end.
    expect(insertBendpoint(line, 3, { x: 30, y: 30 })).toBe(line)
    expect(insertBendpoint(line, -1, { x: 30, y: 30 })).toBe(line)
  })

  it('moves a point to where it already is as no change', () => {
    expect(moveBendpoint(line, 1, { x: 20.4, y: 19.6 })).toBe(line)
    expect(moveBendpoint(line, 2, { x: 5, y: 5 })).toBe(line)
  })

  it('removes no point the line does not have', () => {
    expect(removeBendpoint(line, 2)).toBe(line)
    expect(removeBendpoint(line, 0).bendpoints).toEqual([{ x: 20, y: 20 }])
  })
})
