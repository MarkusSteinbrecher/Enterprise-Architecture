import { beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, currentTheme, readStoredTheme, THEME_STORAGE_KEY, toggleTheme } from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('falls back to the system preference when nothing is stored', () => {
    expect(readStoredTheme()).toBe('light') // jsdom matchMedia stub reports no dark preference
  })

  it('reads a stored theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('ignores a junk stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon')
    expect(readStoredTheme()).toBe('light')
  })

  it('applies the theme to <html> and persists it', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(currentTheme()).toBe('dark')
  })

  it('toggles between light and dark', () => {
    applyTheme('light')
    expect(toggleTheme()).toBe('dark')
    expect(toggleTheme()).toBe('light')
  })
})
