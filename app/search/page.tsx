'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { searchGoogleBooks, type BookData } from '@/lib/book-api'

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
      // Search using Google Books API
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        searchQuery
      )}&maxResults=12`
      const response = await fetch(url)
      const data = await response.json()

      if (data.items && data.items.length > 0) {
        const books: BookData[] = data.items.map((item: any) => {
          const book = item.volumeInfo
          const isbn = book.industryIdentifiers?.[0]?.identifier || ''

          return {
            isbn: isbn,
            titulo: book.title || 'Título desconhecido',
            autor:
              book.authors && book.authors.length > 0
                ? book.authors.join(', ')
                : 'Autor desconhecido',
            editora: book.publisher || 'Editora desconhecida',
            descricao: book.description || '',
            capaUrl:
              book.imageLinks?.thumbnail || '/default-book-cover.png',
            dataPublicacao: book.publishedDate || '',
          }
        })

        setSearchResults(books)
      } else {
        setError('Nenhum livro encontrado. Tente outra busca.')
      }
    } catch (err) {
      console.error('[v0] Search error:', err)
      setError('Erro ao buscar livros. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="outline" className="mb-6">
            ← Voltar
          </Button>
        </Link>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Buscar Livros</h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, autor, ou ISBN..."
                className="flex-1 px-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
              <p>{error}</p>
            </div>
          )}

          {/* Search Results Grid */}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {searchResults.map((book, index) => (
                <div
                  key={index}
                  onClick={() =>
                    router.push(
                      '/confirm?book=' + encodeURIComponent(JSON.stringify(book))
                    )
                  }
                  className="cursor-pointer group"
                >
                  <div className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                    {/* Book Cover */}
                    <div className="relative overflow-hidden bg-muted">
                      <img
                        src={book.capaUrl}
                        alt={book.titulo}
                        className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement
                          img.src = '/default-book-cover.png'
                        }}
                      />
                    </div>

                    {/* Book Info */}
                    <div className="p-3 flex-1 flex flex-col">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                        {book.titulo}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {book.autor}
                      </p>
                      <p className="text-xs text-muted-foreground mt-auto pt-2">
                        {book.editora}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && searchResults.length === 0 && !error && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-muted-foreground">
                Comece digitando um título ou autor para buscar livros
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <p className="text-muted-foreground mt-4">
                Buscando livros...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
