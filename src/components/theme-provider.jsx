'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ThemeCtx = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('system')

  useEffect(() => {
    setThemeState(localStorage.getItem('fitme-theme') || 'system')

    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      if ((localStorage.getItem('fitme-theme') || 'system') === 'system') {
        document.documentElement.classList.toggle('dark', mq.matches)
      }
    }
    mq.addEventListener('change', onSystemChange)
    return () => mq.removeEventListener('change', onSystemChange)
  }, [])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    localStorage.setItem('fitme-theme', next)
    const isDark =
      next === 'dark' ||
      (next === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  return useContext(ThemeCtx)
}
