import { useRef } from 'react'
import type { Bounds, Point } from '@/model'
import type { Viewport } from './geometry'

/**
 * The outline (Archi's "Outline" view): every node as a plain box, and the part
 * of the drawing on screen as a frame. Pressing or dragging on it centres the
 * canvas there. Boxes only, no text: it has to stay cheap at a few hundred nodes.
 */

const WIDTH = 180
const HEIGHT = 120
const PAD = 6

export interface MinimapProps {
  drawing: Bounds
  boxes: Iterable<Bounds>
  viewport: Viewport
  screen: { width: number; height: number }
  onCentre: (point: Point) => void
}

export function Minimap({ drawing, boxes, viewport, screen, onCentre }: MinimapProps) {
  const svg = useRef<SVGSVGElement>(null)
  const k = Math.min(
    (WIDTH - PAD * 2) / Math.max(drawing.width, 1),
    (HEIGHT - PAD * 2) / Math.max(drawing.height, 1),
  )
  const ox = PAD + (WIDTH - PAD * 2 - drawing.width * k) / 2
  const oy = PAD + (HEIGHT - PAD * 2 - drawing.height * k) / 2
  const map = (x: number, y: number) => ({
    x: ox + (x - drawing.x) * k,
    y: oy + (y - drawing.y) * k,
  })

  const visible = map(-viewport.x / viewport.zoom, -viewport.y / viewport.zoom)

  const centreAt = (event: React.PointerEvent) => {
    const rect = svg.current!.getBoundingClientRect()
    onCentre({
      x: drawing.x + (event.clientX - rect.left - ox) / k,
      y: drawing.y + (event.clientY - rect.top - oy) / k,
    })
  }

  return (
    <svg
      ref={svg}
      className="view-minimap"
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label="Outline of the view"
      onPointerDown={(event) => {
        event.stopPropagation()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        centreAt(event)
      }}
      onPointerMove={(event) => {
        if (event.buttons & 1) centreAt(event)
      }}
    >
      {[...boxes].map((b, i) => {
        const p = map(b.x, b.y)
        return (
          <rect
            key={i}
            className="view-minimap__box"
            x={p.x}
            y={p.y}
            width={b.width * k}
            height={b.height * k}
          />
        )
      })}
      <rect
        className="view-minimap__frame"
        data-testid="minimap-frame"
        x={visible.x}
        y={visible.y}
        width={(screen.width / viewport.zoom) * k}
        height={(screen.height / viewport.zoom) * k}
      />
    </svg>
  )
}
