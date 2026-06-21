'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppShell } from '@/components/layout/app-shell'
import { type BookData } from '@/lib/book-api'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'Machado de Assis',
  'Clarice Lispector',
  'Ficção científica',
  'Ítalo Calvino',
]

export default function SearchPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BookData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      setError('Digite um título ou autor para buscar')
      return
    }

    setLoading(true)
    setError(null)
    setSearchResults([])

    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        searchQuery,
      )}&maxResults=12`
      const response = await fetch(url)
      const data = await response.json()

      if (data.items && data.items.length > 0) {
        const books: BookData[] = data.items.map((item: {
          volumeInfo: {
            title?: string
            authors?: string[]
            publisher?: string
            description?: string
            imageLinks?: { thumbnail?: string }
            publishedDate?: string
            industryIdentifiers?: { identifier: string }[]
          }
        }) => {
          const book = item.volumeInfo
          const isbn = book.industryIdentifiers?.[0]?.identifier || ''

          return {
            isbn,
            titulo: book.title || 'Título desconhecido',
            autor:
              book.authors && book.authors.length > 0
                ? book.authors.join(', ')
                : 'Autor desconhecido',
            editora: book.publisher || 'Editora desconhecida',
            descricao: book.description || '',
            capaUrl:
              book.imageLinks?.thumbnail?.replace('http:', 'https:') ||
              '/default-book-cover.png',
            dataPublicacao: book.publishedDate || '',
          }
        })

        setSearchResults(books)
      } else {
        setError('Nenhum livro encontrado. Tente outra busca.')
      }
    } catch (err) {
      console.error('[search] error:', err)
      setError('Erro ao buscar livros. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const runSuggestion = (text: string) => {
    setSearchQuery(text)
  }

  return (
    <AppShell>
      <section className="pt-2 pb-4">
        <h1 className="font-heading text-[2rem] leading-tight tracking-tight">
          Descobrir{' '}
          <span className="text-primary italic">livros</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Busque por título, autor ou ISBN. Resultados em tempo real do Google
          Books.
        </p>
      </section>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ex: Memórias Póstumas, Ítalo Calvino…"
            className="w-full min-h-12 rounded-full border-2 border-primary/30 bg-card pl-12 pr-4 text-base shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Button type="submit" disabled={loading} className="mt-3 w-full min-h-11">
          {loading ? 'Buscando...' : 'Buscar'}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {SUGGESTIONS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => runSuggestion(tag)}
            className={cn(
              'rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground',
              'hover:border-primary/40 hover:text-foreground transition-colors',
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {searchResults.map((book, index) => (
            <button
              key={index}
              type="button"
              onClick={() =>
                router.push(
                  '/confirm?book=' + encodeURIComponent(JSON.stringify(book)),
                )
              }
              className="text-left rounded-2xl border border-border bg-card overflow-hidden shadow-soft hover:shadow-md transition-shadow"
            >
              <div className="aspect-[3/4] bg-muted">
                <img
                  src={book.capaUrl}
                  alt={book.titulo}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    img.src = '/default-book-cover.png'
                  }}
                />
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-2">{book.titulo}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {book.autor}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && searchResults.length === 0 && !error && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Comece digitando um título ou autor para buscar livros
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground mt-4 text-sm">Buscando livros...</p>
        </div>
      )}
    </AppShell>
  )
}
