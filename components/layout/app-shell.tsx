'use client'

import { usePathname } from 'next/navigation'
import { AppHeader } from '@/components/layout/app-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { cn } from '@/lib/utils'

const SHELL_PATHS = ['/', '/search', '/admin']

export function AppShell({
  children,
  className,
  hideNav = false,
  headerRight,
}: {
  children: React.ReactNode
  className?: string
  hideNav?: boolean
  headerRight?: React.ReactNode
}) {
  const pathname = usePathname()
  const showNav =
    !hideNav &&
    SHELL_PATHS.some((p) =>
      p === '/' ? pathname === '/' : pathname.startsWith(p),
    )

  return (
    <div className="min-h-[100dvh] bg-background">
      <AppHeader rightSlot={headerRight} />
      <main
        className={cn(
          'mx-auto max-w-lg px-4',
          showNav ? 'pb-28' : 'pb-6',
          className,
        )}
      >
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  )
}
