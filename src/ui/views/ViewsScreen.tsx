import { Link } from 'react-router-dom'
import { useModelSelector } from '@/store'
import './views.css'

/**
 * Every hand-drawn view in the workspace, by name. A stopgap way in until the
 * model tree (#80) lists views in their folders.
 */
export function ViewsScreen() {
  const views = useModelSelector((store) =>
    store
      .viewList()
      .map((view) => ({
        id: view.id,
        name: view.name,
        viewpoint: view.viewpoint,
        nodes: view.nodes.length,
        connections: view.connections.length,
      }))
      // Display order only, never serialised: the explicit locale keeps it the same on every machine.
      .sort((a, b) => a.name.localeCompare(b.name, 'en')),
  )

  return (
    <div className="views-list">
      <h1 className="views-list__title">Views</h1>
      {views.length === 0 ? (
        <p className="views-list__empty">
          This workspace has no views yet. Import an Archi model or an exchange file to bring its
          diagrams in.
        </p>
      ) : (
        <table className="views-list__table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Viewpoint</th>
              <th className="views-list__count">Nodes</th>
              <th className="views-list__count">Connections</th>
            </tr>
          </thead>
          <tbody>
            {views.map((view) => (
              <tr key={view.id}>
                <td>
                  <Link className="views-list__link" to={`/view/${encodeURIComponent(view.id)}`}>
                    {view.name || '(unnamed view)'}
                  </Link>
                </td>
                <td>{view.viewpoint ?? '—'}</td>
                <td className="views-list__count">{view.nodes}</td>
                <td className="views-list__count">{view.connections}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
