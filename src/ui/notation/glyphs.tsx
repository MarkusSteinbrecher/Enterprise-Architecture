import type { ReactElement } from 'react'

/**
 * The ArchiMate 3.2 type glyphs, drawn from the specification's figures (Archi's
 * figures are visual reference only — concept §5.3).
 *
 * A glyph is drawn into any box, so one definition serves both places ArchiMate
 * uses it: the small icon in the corner of the rectangle notation, and the
 * full-size alternative figure (the actor stick figure, the node box, the
 * function chevron). `filled` paints the closed outline with the fill colour,
 * which the alternative figure needs and the icon does not.
 */

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface Paint {
  stroke: string
  fill: string
  strokeWidth: number
  filled: boolean
}

export type Glyph = (b: Box, paint: Paint) => ReactElement

const n = (v: number) => Math.round(v * 100) / 100

/** Outline props: the closed shape of a glyph. */
function outline(paint: Paint) {
  return {
    stroke: paint.stroke,
    strokeWidth: paint.strokeWidth,
    fill: paint.filled ? paint.fill : 'none',
  }
}

/** Detail props: inner strokes that are never filled. */
function detail(paint: Paint) {
  return { stroke: paint.stroke, strokeWidth: paint.strokeWidth, fill: 'none' }
}

/** The largest box of aspect `ratio` (w/h) centred in `b`. */
function fit(b: Box, ratio: number): Box {
  const w = Math.min(b.w, b.h * ratio)
  const h = w / ratio
  return { x: b.x + (b.w - w) / 2, y: b.y + (b.h - h) / 2, w, h }
}

// ── Active structure ─────────────────────────────────────────────────────────

const actor: Glyph = (box, p) => {
  const b = fit(box, 0.6)
  const cx = b.x + b.w / 2
  const r = b.h * 0.15
  const neck = b.y + r * 2
  const hip = b.y + b.h * 0.65
  return (
    <g {...detail(p)}>
      <circle cx={n(cx)} cy={n(b.y + r)} r={n(r)} {...outline(p)} />
      <path
        d={`M${n(cx)},${n(neck)}V${n(hip)}M${n(b.x)},${n(b.y + b.h * 0.42)}H${n(b.x + b.w)}M${n(b.x + b.w * 0.1)},${n(b.y + b.h)}L${n(cx)},${n(hip)}L${n(b.x + b.w * 0.9)},${n(b.y + b.h)}`}
      />
    </g>
  )
}

/** A cylinder on its side: Business Role and Stakeholder. */
const cylinder: Glyph = (box, p) => {
  const b = fit(box, 1.6)
  const rx = b.h * 0.25
  const ry = b.h / 2
  const right = b.x + b.w - rx
  return (
    <g>
      <path
        d={`M${n(b.x + rx)},${n(b.y)}H${n(right)}A${n(rx)},${n(ry)} 0 0 1 ${n(right)},${n(b.y + b.h)}H${n(b.x + rx)}A${n(rx)},${n(ry)} 0 0 1 ${n(b.x + rx)},${n(b.y)}Z`}
        {...outline(p)}
      />
      <ellipse cx={n(right)} cy={n(b.y + ry)} rx={n(rx)} ry={n(ry)} {...detail(p)} />
    </g>
  )
}

const collaboration: Glyph = (box, p) => {
  const b = fit(box, 1.6)
  const r = b.h / 2
  const cy = b.y + r
  return (
    <g {...outline(p)}>
      <circle cx={n(b.x + r)} cy={n(cy)} r={n(r)} />
      <circle cx={n(b.x + b.w - r)} cy={n(cy)} r={n(r)} fillOpacity={p.filled ? 0.6 : undefined} />
    </g>
  )
}

/** A lollipop: the provided-interface notation. */
const iface: Glyph = (box, p) => {
  const b = fit(box, 1.6)
  const r = b.h / 2
  const cx = b.x + b.w - r
  return (
    <g>
      <path d={`M${n(b.x)},${n(b.y + r)}H${n(cx - r)}`} {...detail(p)} />
      <circle cx={n(cx)} cy={n(b.y + r)} r={n(r)} {...outline(p)} />
    </g>
  )
}

const component: Glyph = (box, p) => {
  const b = fit(box, 1.3)
  const tabW = b.w * 0.3
  const tabH = b.h * 0.18
  const body = b.x + tabW / 2
  return (
    <g {...outline(p)}>
      <rect x={n(body)} y={n(b.y)} width={n(b.x + b.w - body)} height={n(b.h)} />
      <rect x={n(b.x)} y={n(b.y + b.h * 0.2)} width={n(tabW)} height={n(tabH)} />
      <rect x={n(b.x)} y={n(b.y + b.h * 0.62)} width={n(tabW)} height={n(tabH)} />
    </g>
  )
}

const node: Glyph = (box, p) => {
  const b = fit(box, 1.3)
  const d = Math.min(b.w, b.h) * 0.22
  const fx = b.x
  const fy = b.y + d
  const fw = b.w - d
  const fh = b.h - d
  return (
    <g>
      <path
        d={`M${n(fx)},${n(fy)}L${n(fx + d)},${n(b.y)}H${n(b.x + b.w)}V${n(b.y + fh)}L${n(fx + fw)},${n(b.y + b.h)}H${n(fx)}Z`}
        {...outline(p)}
      />
      <path
        d={`M${n(fx)},${n(fy)}H${n(fx + fw)}V${n(b.y + b.h)}M${n(fx + fw)},${n(fy)}L${n(b.x + b.w)},${n(b.y)}`}
        {...detail(p)}
      />
    </g>
  )
}

/** A screen over a keyboard. */
const device: Glyph = (box, p) => {
  const b = fit(box, 1.3)
  const screenH = b.h * 0.68
  const inset = b.w * 0.12
  return (
    <g {...outline(p)}>
      <rect
        x={n(b.x + inset)}
        y={n(b.y)}
        width={n(b.w - inset * 2)}
        height={n(screenH)}
        rx={n(b.h * 0.06)}
      />
      <path
        d={`M${n(b.x + inset)},${n(b.y + screenH)}L${n(b.x)},${n(b.y + b.h)}H${n(b.x + b.w)}L${n(b.x + b.w - inset)},${n(b.y + screenH)}`}
      />
    </g>
  )
}

/** A disc with a second, partly hidden disc behind it. */
const systemSoftware: Glyph = (box, p) => {
  const b = fit(box, 1)
  const r = b.w * 0.4
  const cx = b.x + r
  const cy = b.y + b.h - r
  const bx = b.x + b.w - r
  const by = b.y + r
  return (
    <g>
      <path
        d={`M${n(bx - r * 0.55)},${n(by + r * 0.83)}A${n(r)},${n(r)} 0 1 1 ${n(bx + r * 0.83)},${n(by + r * 0.55)}`}
        {...detail(p)}
      />
      <circle cx={n(cx)} cy={n(cy)} r={n(r)} {...outline(p)} />
    </g>
  )
}

/** A dashed line with an open arrowhead at each end. */
const path: Glyph = (box, p) => {
  const b = fit(box, 2.2)
  const cy = b.y + b.h / 2
  const a = b.h * 0.4
  return (
    <g {...detail(p)}>
      <path
        d={`M${n(b.x)},${n(cy)}H${n(b.x + b.w)}`}
        strokeDasharray={`${n(b.w / 7)} ${n(b.w / 14)}`}
      />
      <path
        d={`M${n(b.x + a)},${n(cy - a)}L${n(b.x)},${n(cy)}L${n(b.x + a)},${n(cy + a)}M${n(b.x + b.w - a)},${n(cy - a)}L${n(b.x + b.w)},${n(cy)}L${n(b.x + b.w - a)},${n(cy + a)}`}
      />
    </g>
  )
}

/** Four nodes joined in a slanted ring. */
const communicationNetwork: Glyph = (box, p) => {
  const b = fit(box, 1.8)
  const r = b.h * 0.12
  const s = b.w * 0.25
  const pts: [number, number][] = [
    [b.x + s + r, b.y + r],
    [b.x + b.w - r, b.y + r],
    [b.x + b.w - s - r, b.y + b.h - r],
    [b.x + r, b.y + b.h - r],
  ]
  return (
    <g>
      <path d={`M${pts.map(([x, y]) => `${n(x)},${n(y)}`).join('L')}Z`} {...detail(p)} />
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          cx={n(x)}
          cy={n(y)}
          r={n(r)}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          fill={p.stroke}
        />
      ))}
    </g>
  )
}

/** Two gears. */
const equipment: Glyph = (box, p) => {
  const b = fit(box, 1.2)
  const big = gear(b.x + b.w * 0.36, b.y + b.h * 0.62, b.h * 0.36)
  const small = gear(b.x + b.w * 0.75, b.y + b.h * 0.27, b.h * 0.25)
  return (
    <g {...outline(p)}>
      <path d={big} />
      <path d={small} />
    </g>
  )
}

function gear(cx: number, cy: number, r: number): string {
  const teeth = 8
  const inner = r * 0.72
  const parts: string[] = []
  for (let i = 0; i < teeth * 2; i++) {
    const radius = i % 2 === 0 ? r : inner
    for (const offset of [-0.22, 0.22]) {
      const a = ((i + 0.5 + offset) / (teeth * 2)) * Math.PI * 2
      parts.push(`${n(cx + Math.cos(a) * radius)},${n(cy + Math.sin(a) * radius)}`)
    }
  }
  return `M${parts.join('L')}Z`
}

/** A factory: a chimney and a saw-tooth roof. */
const facility: Glyph = (box, p) => {
  const b = fit(box, 1.3)
  const x = (f: number) => n(b.x + b.w * f)
  const y = (f: number) => n(b.y + b.h * f)
  return (
    <path
      d={`M${x(0)},${y(1)}V${y(0)}H${x(0.2)}V${y(0.55)}L${x(0.47)},${y(0.3)}V${y(0.55)}L${x(0.73)},${y(0.3)}V${y(0.55)}L${x(1)},${y(0.3)}V${y(1)}Z`}
      {...outline(p)}
    />
  )
}

/** A double line with arrowheads: physical distribution. */
const distributionNetwork: Glyph = (box, p) => {
  const b = fit(box, 2.2)
  const cy = b.y + b.h / 2
  const g = b.h * 0.14
  const a = b.h * 0.45
  return (
    <path
      d={`M${n(b.x + a * 0.4)},${n(cy - g)}H${n(b.x + b.w - a * 0.4)}M${n(b.x + a * 0.4)},${n(cy + g)}H${n(b.x + b.w - a * 0.4)}M${n(b.x + a)},${n(cy - a)}L${n(b.x)},${n(cy)}L${n(b.x + a)},${n(cy + a)}M${n(b.x + b.w - a)},${n(cy - a)}L${n(b.x + b.w)},${n(cy)}L${n(b.x + b.w - a)},${n(cy + a)}`}
      {...detail(p)}
    />
  )
}

// ── Behaviour ────────────────────────────────────────────────────────────────

/** A block arrow pointing right. */
const process: Glyph = (box, p) => {
  const b = fit(box, 1.6)
  const shaft = b.h * 0.25
  const head = b.x + b.w * 0.6
  const cy = b.y + b.h / 2
  return (
    <path
      d={`M${n(b.x)},${n(cy - shaft)}H${n(head)}V${n(b.y)}L${n(b.x + b.w)},${n(cy)}L${n(head)},${n(b.y + b.h)}V${n(cy + shaft)}H${n(b.x)}Z`}
      {...outline(p)}
    />
  )
}

/** A chevron pointing up (a bookmark). */
const fn: Glyph = (box, p) => {
  const b = fit(box, 1)
  const x = (f: number) => n(b.x + b.w * f)
  const y = (f: number) => n(b.y + b.h * f)
  return (
    <path
      d={`M${x(0)},${y(0.3)}L${x(0.5)},${y(0)}L${x(1)},${y(0.3)}V${y(1)}L${x(0.5)},${y(0.72)}L${x(0)},${y(1)}Z`}
      {...outline(p)}
    />
  )
}

/** Two half-discs facing apart. */
const interaction: Glyph = (box, p) => {
  const b = fit(box, 1.15)
  const gap = b.w * 0.08
  const r = b.h / 2
  const cx = b.x + b.w / 2
  return (
    <g {...outline(p)}>
      <path
        d={`M${n(cx - gap)},${n(b.y)}A${n(cx - gap - b.x)},${n(r)} 0 0 0 ${n(cx - gap)},${n(b.y + b.h)}Z`}
      />
      <path
        d={`M${n(cx + gap)},${n(b.y)}A${n(b.x + b.w - cx - gap)},${n(r)} 0 0 1 ${n(cx + gap)},${n(b.y + b.h)}Z`}
      />
    </g>
  )
}

/** A pill with a notch on its left: something that happens. */
const event: Glyph = (box, p) => {
  const b = fit(box, 1.8)
  const r = b.h / 2
  const right = b.x + b.w - r * 0.6
  return (
    <path
      d={`M${n(b.x)},${n(b.y)}H${n(right)}A${n(r * 0.6)},${n(r)} 0 0 1 ${n(right)},${n(b.y + b.h)}H${n(b.x)}L${n(b.x + r * 0.6)},${n(b.y + r)}Z`}
      {...outline(p)}
    />
  )
}

/** A stadium: the service notation. */
const service: Glyph = (box, p) => {
  const b = fit(box, 1.8)
  return (
    <rect x={n(b.x)} y={n(b.y)} width={n(b.w)} height={n(b.h)} rx={n(b.h / 2)} {...outline(p)} />
  )
}

// ── Passive structure ────────────────────────────────────────────────────────

/** A page with its top-right corner folded. */
const artifact: Glyph = (box, p) => {
  const b = fit(box, 0.8)
  const f = b.w * 0.32
  return (
    <g>
      <path
        d={`M${n(b.x)},${n(b.y)}H${n(b.x + b.w - f)}L${n(b.x + b.w)},${n(b.y + f)}V${n(b.y + b.h)}H${n(b.x)}Z`}
        {...outline(p)}
      />
      <path d={`M${n(b.x + b.w - f)},${n(b.y)}V${n(b.y + f)}H${n(b.x + b.w)}`} {...detail(p)} />
    </g>
  )
}

/** A hexagon with three inner edges. */
const material: Glyph = (box, p) => {
  const b = fit(box, 1.15)
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const r = b.h / 2
  const pt = (i: number, k = 1) => {
    const a = (Math.PI / 3) * i
    return [cx + Math.cos(a) * r * k * 1.15, cy + Math.sin(a) * r * k] as const
  }
  const hex = [0, 1, 2, 3, 4, 5].map((i) => pt(i))
  const inner = (i: number) => {
    const [x1, y1] = pt(i, 0.7)
    const [x2, y2] = pt(i + 1, 0.7)
    return `M${n(x1)},${n(y1)}L${n(x2)},${n(y2)}`
  }
  return (
    <g>
      <path d={`M${hex.map(([x, y]) => `${n(x)},${n(y)}`).join('L')}Z`} {...outline(p)} />
      <path d={`${inner(0)}${inner(2)}${inner(4)}`} {...detail(p)} />
    </g>
  )
}

// ── Motivation ───────────────────────────────────────────────────────────────

/** A steering wheel: circle, hub and eight spokes. */
const driver: Glyph = (box, p) => {
  const b = fit(box, 1)
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const r = b.w * 0.36
  const spokes: string[] = []
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i
    spokes.push(
      `M${n(cx)},${n(cy)}L${n(cx + Math.cos(a) * (b.w / 2))},${n(cy + Math.sin(a) * (b.h / 2))}`,
    )
  }
  return (
    <g>
      <circle cx={n(cx)} cy={n(cy)} r={n(r)} {...outline(p)} />
      <path d={spokes.join('')} {...detail(p)} />
      <circle
        cx={n(cx)}
        cy={n(cy)}
        r={n(r * 0.25)}
        stroke={p.stroke}
        strokeWidth={p.strokeWidth}
        fill={p.stroke}
      />
    </g>
  )
}

/** A magnifying glass. */
const assessment: Glyph = (box, p) => {
  const b = fit(box, 1)
  const r = b.w * 0.33
  const cx = b.x + b.w * 0.6
  const cy = b.y + r
  return (
    <g>
      <circle cx={n(cx)} cy={n(cy)} r={n(r)} {...outline(p)} />
      <path d={`M${n(cx - r * 0.7)},${n(cy + r * 0.7)}L${n(b.x)},${n(b.y + b.h)}`} {...detail(p)} />
    </g>
  )
}

/** A target: three rings and a filled bull's-eye. */
const goal: Glyph = (box, p) => {
  const b = fit(box, 1)
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const r = b.w / 2
  return (
    <g>
      <circle cx={n(cx)} cy={n(cy)} r={n(r)} {...outline(p)} />
      <circle cx={n(cx)} cy={n(cy)} r={n(r * 0.62)} {...detail(p)} />
      <circle
        cx={n(cx)}
        cy={n(cy)}
        r={n(r * 0.25)}
        stroke={p.stroke}
        strokeWidth={p.strokeWidth}
        fill={p.stroke}
      />
    </g>
  )
}

/** A target with an arrow in it. */
const outcome: Glyph = (box, p) => {
  const b = fit(box, 1)
  const r = b.w * 0.42
  const cx = b.x + r
  const cy = b.y + b.h - r
  const a = r * 0.35
  return (
    <g>
      <circle cx={n(cx)} cy={n(cy)} r={n(r)} {...outline(p)} />
      <circle cx={n(cx)} cy={n(cy)} r={n(r * 0.55)} {...detail(p)} />
      <path
        d={`M${n(cx)},${n(cy)}L${n(b.x + b.w)},${n(b.y)}M${n(b.x + b.w - a)},${n(b.y)}H${n(b.x + b.w)}V${n(b.y + a)}`}
        {...detail(p)}
      />
    </g>
  )
}

/** A box with an exclamation mark. */
const principle: Glyph = (box, p) => {
  const b = fit(box, 1)
  const cx = b.x + b.w / 2
  return (
    <g>
      <rect x={n(b.x)} y={n(b.y)} width={n(b.w)} height={n(b.h)} {...outline(p)} />
      <path
        d={`M${n(cx)},${n(b.y + b.h * 0.18)}V${n(b.y + b.h * 0.6)}`}
        {...detail(p)}
        strokeWidth={p.strokeWidth * 1.6}
      />
      <circle cx={n(cx)} cy={n(b.y + b.h * 0.78)} r={n(b.h * 0.07)} fill={p.stroke} />
    </g>
  )
}

const parallelogram = (b: Box) => {
  const s = b.h * 0.35
  return `M${n(b.x + s)},${n(b.y)}H${n(b.x + b.w)}L${n(b.x + b.w - s)},${n(b.y + b.h)}H${n(b.x)}Z`
}

const requirement: Glyph = (box, p) => <path d={parallelogram(fit(box, 1.8))} {...outline(p)} />

/** A requirement with an extra line: the constraint is a restricting requirement. */
const constraint: Glyph = (box, p) => {
  const b = fit(box, 1.8)
  const s = b.h * 0.35
  return (
    <g>
      <path d={parallelogram(b)} {...outline(p)} />
      <path d={`M${n(b.x + s * 2)},${n(b.y)}L${n(b.x + s)},${n(b.y + b.h)}`} {...detail(p)} />
    </g>
  )
}

const meaning: Glyph = (box, p) => {
  const b = fit(box, 1.5)
  const x = (f: number) => n(b.x + b.w * f)
  const y = (f: number) => n(b.y + b.h * f)
  const rx = n(b.w * 0.2)
  const ry = n(b.h * 0.25)
  return (
    <path
      d={`M${x(0.2)},${y(0.85)}A${rx},${ry} 0 0 1 ${x(0.12)},${y(0.4)}A${rx},${ry} 0 0 1 ${x(0.42)},${y(0.15)}A${rx},${ry} 0 0 1 ${x(0.8)},${y(0.2)}A${rx},${ry} 0 0 1 ${x(0.88)},${y(0.65)}A${rx},${ry} 0 0 1 ${x(0.55)},${y(0.92)}A${rx},${ry} 0 0 1 ${x(0.2)},${y(0.85)}Z`}
      {...outline(p)}
    />
  )
}

const value: Glyph = (box, p) => {
  const b = fit(box, 1.7)
  return (
    <ellipse
      cx={n(b.x + b.w / 2)}
      cy={n(b.y + b.h / 2)}
      rx={n(b.w / 2)}
      ry={n(b.h / 2)}
      {...outline(p)}
    />
  )
}

// ── Strategy ─────────────────────────────────────────────────────────────────

/** A battery: a rounded cell, a terminal and three bars. */
const resource: Glyph = (box, p) => {
  const b = fit(box, 1.8)
  const cell = b.w * 0.88
  const bars = [0.25, 0.45, 0.65].map(
    (f) => `M${n(b.x + cell * f)},${n(b.y + b.h * 0.25)}V${n(b.y + b.h * 0.75)}`,
  )
  return (
    <g>
      <rect
        x={n(b.x)}
        y={n(b.y)}
        width={n(cell)}
        height={n(b.h)}
        rx={n(b.h * 0.2)}
        {...outline(p)}
      />
      <path
        d={`M${n(b.x + cell)},${n(b.y + b.h * 0.3)}H${n(b.x + b.w)}V${n(b.y + b.h * 0.7)}H${n(b.x + cell)}`}
        {...detail(p)}
      />
      <path d={bars.join('')} {...detail(p)} />
    </g>
  )
}

/** A staircase of six squares. */
const capability: Glyph = (box, p) => {
  const b = fit(box, 1)
  const s = b.w / 3
  const cells: [number, number][] = [
    [2, 0],
    [1, 1],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ]
  return (
    <g {...outline(p)}>
      {cells.map(([c, r]) => (
        <rect key={`${c}${r}`} x={n(b.x + c * s)} y={n(b.y + r * s)} width={n(s)} height={n(s)} />
      ))}
    </g>
  )
}

/** A target with a curved arrow coming in from the lower left. */
const courseOfAction: Glyph = (box, p) => {
  const b = fit(box, 1)
  const r = b.w * 0.32
  const cx = b.x + b.w - r
  const cy = b.y + r
  return (
    <g>
      <circle cx={n(cx)} cy={n(cy)} r={n(r)} {...outline(p)} />
      <circle cx={n(cx)} cy={n(cy)} r={n(r * 0.35)} fill={p.stroke} />
      <path
        d={`M${n(b.x)},${n(b.y + b.h)}Q${n(b.x)},${n(cy)} ${n(cx - r * 1.1)},${n(cy + r * 0.3)}M${n(cx - r * 1.5)},${n(cy + r * 0.05)}L${n(cx - r * 1.1)},${n(cy + r * 0.3)}L${n(cx - r * 1.45)},${n(cy + r * 0.7)}`}
        {...detail(p)}
      />
    </g>
  )
}

/** A chevron arrow with a notched tail. */
const valueStream: Glyph = (box, p) => {
  const b = fit(box, 1.8)
  const x = (f: number) => n(b.x + b.w * f)
  const y = (f: number) => n(b.y + b.h * f)
  return (
    <path
      d={`M${x(0)},${y(0)}H${x(0.75)}L${x(1)},${y(0.5)}L${x(0.75)},${y(1)}H${x(0)}L${x(0.25)},${y(0.5)}Z`}
      {...outline(p)}
    />
  )
}

// ── Implementation & migration ───────────────────────────────────────────────

/** A circular arrow. */
const workPackage: Glyph = (box, p) => {
  const b = fit(box, 1.3)
  const r = b.h / 2
  const cx = b.x + r
  const cy = b.y + r
  const a = r * 0.45
  return (
    <path
      d={`M${n(cx + r)},${n(cy)}A${n(r)},${n(r)} 0 1 1 ${n(cx)},${n(cy - r)}H${n(b.x + b.w)}M${n(b.x + b.w - a)},${n(cy - r - a)}L${n(b.x + b.w)},${n(cy - r)}L${n(b.x + b.w - a)},${n(cy - r + a)}`}
      {...detail(p)}
    />
  )
}

/** Three stacked lines, each starting further right: states over time. */
const plateau: Glyph = (box, p) => {
  const b = fit(box, 1.6)
  const lines = [0, 1, 2].map(
    (i) =>
      `M${n(b.x + b.w * 0.2 * (2 - i))},${n(b.y + b.h * (0.15 + 0.35 * i))}H${n(b.x + b.w * (1 - 0.2 * i))}`,
  )
  return <path d={lines.join('')} {...detail(p)} strokeWidth={p.strokeWidth * 1.6} />
}

/** A circle crossed by two lines. */
const gap: Glyph = (box, p) => {
  const b = fit(box, 1.5)
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const r = b.h / 2
  return (
    <g>
      <circle cx={n(cx)} cy={n(cy)} r={n(r)} {...outline(p)} />
      <path
        d={`M${n(b.x)},${n(cy - r * 0.35)}H${n(b.x + b.w)}M${n(b.x)},${n(cy + r * 0.35)}H${n(b.x + b.w)}`}
        {...detail(p)}
      />
    </g>
  )
}

// ── Other ────────────────────────────────────────────────────────────────────

/** A map pin. */
const location: Glyph = (box, p) => {
  const b = fit(box, 0.72)
  const r = b.w / 2
  const cx = b.x + r
  const cy = b.y + r
  return (
    <path
      d={`M${n(cx)},${n(b.y + b.h)}L${n(cx - r * 0.86)},${n(cy + r * 0.5)}A${n(r)},${n(r)} 0 1 1 ${n(cx + r * 0.86)},${n(cy + r * 0.5)}Z`}
      {...outline(p)}
    />
  )
}

export const GLYPHS = {
  actor,
  cylinder,
  collaboration,
  iface,
  component,
  node,
  device,
  systemSoftware,
  path,
  communicationNetwork,
  equipment,
  facility,
  distributionNetwork,
  process,
  fn,
  interaction,
  event,
  service,
  artifact,
  material,
  driver,
  assessment,
  goal,
  outcome,
  principle,
  requirement,
  constraint,
  meaning,
  value,
  resource,
  capability,
  courseOfAction,
  valueStream,
  workPackage,
  plateau,
  gap,
  location,
} as const satisfies Record<string, Glyph>

export type GlyphName = keyof typeof GLYPHS
