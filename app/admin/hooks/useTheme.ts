'use client'

import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') as Theme | null
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
      const init = stored ?? (prefersDark ? 'dark' : 'light')
      setTheme(init)
      document.documentElement.classList.toggle('dark', init === 'dark')
    } catch {}
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('theme', next)
  }

  return { theme, toggle }
}
