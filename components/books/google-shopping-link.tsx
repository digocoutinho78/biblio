import { googleShoppingUrl } from '@/lib/book-api'
import { cn } from '@/lib/utils'

export function GoogleShoppingLink({
  titulo,
  autor,
  className,
}: {
  titulo: string
  autor: string
  className?: string
}) {
  return (
    <a
      href={googleShoppingUrl(titulo, autor)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center justify-center gap-2 w-full min-h-12 border border-border rounded-2xl text-sm font-medium',
        'hover:bg-muted transition-colors',
        className,
      )}
    >
      🛍️ Ver preços no Google Shopping
    </a>
  )
}
