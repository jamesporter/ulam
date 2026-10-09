import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

function current(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** The page theme, kept on <html> and remembered between visits. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(current)

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeState(current()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const setTheme = (next: Theme) => {
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Private windows may refuse; the toggle still works for this visit
    }
  }

  return { theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
}

/** Reads a CSS custom property, for canvases that cannot use classes. */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
