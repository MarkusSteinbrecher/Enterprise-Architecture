/** Spike #78 entry: spike.html?engine=custom|reactflow|diagramjs&copies=1|6 */
import { createRoot } from 'react-dom/client'
import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import './spike.css'
import { expose, makeStore, params } from './shared'
import { CustomEditor } from './custom'
import { ReactFlowEditor } from './reactflow'
import { mountDiagramJs } from './diagramjs'

const engine = new URLSearchParams(location.search).get('engine') ?? 'custom'
const store = makeStore(params().copies)
const root = document.getElementById('root')!
root.className = 'spike-root'
const t0 = performance.now()

if (engine === 'diagramjs') mountDiagramJs(root, store)
else createRoot(root).render(engine === 'reactflow' ? <ReactFlowEditor store={store} /> : <CustomEditor store={store} />)

expose(engine, store, t0)
