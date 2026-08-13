import { useParams } from 'react-router-dom'
import { typeLabel } from '@/model'
import { useModelSelector } from '@/store'

/** Placeholder — the real fact sheet lands with issue #9. */
export function ElementScreen() {
  const { id = '' } = useParams()
  const element = useModelSelector((store) => store.element(id))

  return (
    <section className="screen-stub">
      <h1 className="screen-stub__title">{element?.name ?? 'Element not found'}</h1>
      <p className="screen-stub__note">
        {element ? `${typeLabel(element.type)} · ${id}` : id} — fact sheet, issue #9
      </p>
    </section>
  )
}
