import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_HEIGHT, NODE_WIDTH } from './layout'

/**
 * A graph node (handoff "Screen 3 — nodes"): 150×42, a 3px accent bar in the
 * element's colour on the left edge, the name wrapped to two lines, and a mono
 * sub-label carrying the TIME class or the lifecycle phase.
 *
 * Handles are present but invisible: React Flow needs them to anchor edges, and
 * the design draws edges centre-to-centre behind opaque node bodies (UI spec
 * §3.3), so they sit at the middle of each side rather than on a port.
 */

export interface GraphNodeData extends Record<string, unknown> {
  name: string
  subLabel: string
  stroke: string
  fill: string
  focused: boolean
  dimmed: boolean
  /** Past end of life at the current time point — dashed and semi-transparent. */
  pastEol: boolean
  opacity: number
}

export function GraphNode({ data }: NodeProps & { data: GraphNodeData }) {
  return (
    <div
      // `nopan` keeps a click-to-trace from also starting a canvas pan.
      className={`gnode nopan${data.focused ? ' gnode--focused' : ''}`}
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: data.fill,
        borderColor: data.focused ? 'var(--accent)' : data.stroke,
        borderWidth: data.focused ? 2 : 1,
        borderStyle: data.pastEol ? 'dashed' : 'solid',
        opacity: data.opacity,
      }}
      title={`${data.name} · ${data.subLabel}`}
    >
      <span className="gnode__bar" style={{ background: data.stroke }} aria-hidden="true" />
      <span className="gnode__body">
        <span className="gnode__name">{data.name}</span>
        <span className="gnode__sub">{data.subLabel}</span>
      </span>
      <Handle type="target" position={Position.Top} className="gnode__handle" />
      <Handle type="source" position={Position.Bottom} className="gnode__handle" />
    </div>
  )
}
