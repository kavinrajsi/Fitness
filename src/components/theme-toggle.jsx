'use client'

/** Light / Dark theme switch (defaults to dark). Used on the Profile page. */
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { MoonIcon, SunIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { key: 'light', label: 'Light', Icon: SunIcon },
  { key: 'dark', label: 'Dark', Icon: MoonIcon },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const current = mounted ? theme : 'dark'

  return (
    <div className="bg-muted inline-flex gap-1 rounded-lg p-1">
      {OPTIONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => setTheme(key)}
          aria-pressed={current === key}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors',
            current === key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
