import Link from 'next/link'
import { BookMarked } from 'lucide-react'

export function AppLogo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 shrink-0">
      <span
        className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft"
      >
        <BookMarked className="size-5" strokeWidth={2.25} />
      </span>
      <span className="font-heading text-xl italic text-foreground tracking-tight">
        Bibliô
      </span>
    </Link>
  )
}
