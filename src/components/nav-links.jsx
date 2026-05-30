'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/data',      label: 'Data' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile',   label: 'Profile' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <>
      {links.map(({ href, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium transition-colors ${
              active
                ? 'text-foreground border-b-2 border-primary pb-0.5'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}
