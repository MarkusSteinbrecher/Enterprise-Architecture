import { useParams } from 'react-router-dom'

/** Placeholder — the real fact sheet lands with issue #9. */
export function ElementScreen() {
  const { id } = useParams()
  return (
    <section style={{ padding: '16px 24px' }}>
      <h1 style={{ font: '600 22px/1.15 var(--font-ui)', letterSpacing: '-0.015em', margin: 0 }}>
        Element
      </h1>
      <p className="mono" style={{ color: 'var(--ink3)', fontSize: 11, marginTop: 8 }}>
        {id} — fact sheet, issue #9
      </p>
    </section>
  )
}
