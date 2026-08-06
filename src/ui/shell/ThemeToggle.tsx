import { useState } from 'react'
import { currentTheme, toggleTheme } from '@/app/theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)

  return (
    <button
      type="button"
      className="theme-toggle"
      title="Toggle theme"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      onClick={() => setTheme(toggleTheme())}
    >
      <span className="theme-toggle__glyph" aria-hidden="true" />
    </button>
  )
}
