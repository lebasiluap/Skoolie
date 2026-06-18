'use client'

import { useEffect } from 'react'

/**
 * Reads the persisted theme from localStorage (or prefers-color-scheme as
 * fallback) and sets `data-theme` on <html> before first paint.
 * Also exposes window.__toggleTheme() so child components can call it.
 */
export default function ThemeProvider() {
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('skoolie-theme') : null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const initial = stored ?? preferred
    document.documentElement.dataset.theme = initial

    // Global toggle helper used by ThemeToggle buttons
    ;(window as Window & { __toggleTheme?: () => void }).__toggleTheme = () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      localStorage.setItem('skoolie-theme', next)
    }
  }, [])

  return null
}
