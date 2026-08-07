import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/base.css'
import { App } from './app/App'
import { applyTheme, readStoredTheme } from './app/theme'
import { ModelStoreProvider } from './store'

applyTheme(readStoredTheme())

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element')

createRoot(container).render(
  <StrictMode>
    {/* import.meta.env.BASE_URL carries the GitHub Pages project prefix. */}
    <BrowserRouter
      basename={import.meta.env.BASE_URL}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ModelStoreProvider>
        <App />
      </ModelStoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
