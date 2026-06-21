'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { AppLogo } from '@/components/layout/app-logo'
import { cn } from '@/lib/utils'

type AppHeaderProps = {
  searchHref?: string
  className?: string
  rightSlot?: React.ReactNode
}

export function AppHeader({
  searchHref = '/search',
  className,
  rightSlot,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/90 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))] pb-3',
        className,
      )}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4">
        <AppLogo />
        <div className="flex items-center gap-2">
          {rightSlot}
          <Link
            href={searchHref}
            className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform active:scale-95"
            aria-label="Buscar livros"
          >
            <Search className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
