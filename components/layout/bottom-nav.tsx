'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, LayoutGrid, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Biblioteca', icon: BookOpen, match: (p: string) => p === '/' },
  {
    href: '/search',
    label: 'Descobrir',
    icon: Search,
    match: (p: string) => p.startsWith('/search'),
  },
  {
    href: '/admin',
    label: 'Coleção',
    icon: LayoutGrid,
    match: (p: string) => p.startsWith('/admin'),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      aria-label="Navegação principal"
    >
      <div
        className="mx-auto flex max-w-lg items-center justify-around gap-1 rounded-2xl border border-border/60 bg-card px-2 py-2 shadow-nav"
      >
        {navItems.map((item) => {
          const active = item.match(pathname)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
              <span className={cn(active && 'font-semibold')}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
