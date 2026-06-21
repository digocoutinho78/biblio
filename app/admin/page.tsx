'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppShell } from '@/components/layout/app-shell'
import { GoogleShoppingLink } from '@/components/books/google-shopping-link'
import { cn } from '@/lib/utils'

interface Livro {
  id: string
  titulo: string
  autor: string
  editora: string
  isbn: string
  leitura_completa: boolean
  avaliacao: number | null
  comentario: string | null
  capa_url: string
  data_adicao: string
}

export default function AdminPage() {
  const router = useRouter()
  const [supabase, setSupabase] = useState<ReturnType<
    typeof import('@/lib/supabase/client').createClient
  > | null>(null)
  const [livros, setLivros] = useState<Livro[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLido, setFilterLido] = useState<'todos' | 'lido' | 'nao-lido'>('todos')
  const [filterAvaliacao, setFilterAvaliacao] = useState(0)
  const [sortBy, setSortBy] = useState<'data' | 'titulo' | 'autor'>('data')

  useEffect(() => {
    const { createClient } = require('@/lib/supabase/client')
    setSupabase(createClient())
  }, [])

  useEffect(() => {
    const loadBooks = async () => {
      if (!supabase) return

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data, error } = await supabase
          .from('livros')
          .select('*')
          .eq('user_id', user.id)

        if (error) {
          console.error('[admin] Error loading books:', error)
          return
        }

        setLivros(data || [])
      } catch (err) {
        console.error('[admin] Load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadBooks()
  }, [router, supabase])

  let filteredBooks = livros

  if (searchQuery) {
    filteredBooks = filteredBooks.filter(
      (book) =>
        book.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.autor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.editora.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.isbn.includes(searchQuery),
    )
  }

  if (filterLido === 'lido') {
    filteredBooks = filteredBooks.filter((book) => book.leitura_completa)
  } else if (filterLido === 'nao-lido') {
    filteredBooks = filteredBooks.filter((book) => !book.leitura_completa)
  }

  if (filterAvaliacao > 0) {
    filteredBooks = filteredBooks.filter(
      (book) => book.avaliacao && book.avaliacao >= filterAvaliacao,
    )
  }

  filteredBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === 'titulo') {
      return a.titulo.localeCompare(b.titulo)
    }
    if (sortBy === 'autor') {
      return a.autor.localeCompare(b.autor)
    }
    return new Date(b.data_adicao).getTime() - new Date(a.data_adicao).getTime()
  })

  const exportToCSV = () => {
    const headers = [
      'Título',
      'Autor',
      'Editora',
      'ISBN',
      'Lido',
      'Avaliação',
      'Comentário',
      'Data Adicionado',
    ]
    const rows = filteredBooks.map((book) => [
      book.titulo,
      book.autor,
      book.editora,
      book.isbn,
      book.leitura_completa ? 'Sim' : 'Não',
      book.avaliacao ? `${book.avaliacao}/5` : 'N/A',
      book.comentario || '',
      new Date(book.data_adicao).toLocaleDateString('pt-BR'),
    ])

    let csv = headers.join(',') + '\n'
    rows.forEach((row) => {
      csv += row.map((cell) => `"${cell}"`).join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `biblio-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const deleteBook = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este livro?')) return
    if (!supabase) return

    const { error } = await supabase.from('livros').delete().eq('id', id)

    if (error) {
      console.error('[admin] Delete error:', error)
    } else {
      setLivros(livros.filter((book) => book.id !== id))
    }
  }

  return (
    <AppShell>
      <section className="pt-2 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[2rem] leading-tight tracking-tight">
            Coleção{' '}
            <span className="text-primary italic">completa</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {livros.length} livros no total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportToCSV}
          className="shrink-0 gap-2 mt-1"
        >
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-soft mb-6">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar na coleção..."
          className="w-full min-h-11 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mb-4"
        />

        <div className="flex flex-wrap gap-2 mb-4">
          <FilterPill
            active={filterLido === 'todos'}
            onClick={() => setFilterLido('todos')}
          >
            Todos
          </FilterPill>
          <FilterPill
            active={filterLido === 'lido'}
            onClick={() => setFilterLido('lido')}
          >
            Lidos
          </FilterPill>
          <FilterPill
            active={filterLido === 'nao-lido'}
            onClick={() => setFilterLido('nao-lido')}
          >
            Não lidos
          </FilterPill>
          <FilterPill
            active={filterAvaliacao === 0}
            onClick={() => setFilterAvaliacao(0)}
          >
            Qualquer nota
          </FilterPill>
          {[5, 4, 3].map((n) => (
            <FilterPill
              key={n}
              active={filterAvaliacao === n}
              onClick={() => setFilterAvaliacao(n)}
            >
              {n}★+
            </FilterPill>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground shrink-0">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'data' | 'titulo' | 'autor')}
            className="flex-1 min-h-10 rounded-full border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="data">Data adicionado</option>
            <option value="titulo">Título</option>
            <option value="autor">Autor</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="rounded-xl bg-muted/60 py-2">
            <p className="font-heading text-lg">{filteredBooks.length}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Total</p>
          </div>
          <div className="rounded-xl bg-muted/60 py-2">
            <p className="font-heading text-lg">
              {filteredBooks.filter((b) => b.leitura_completa).length}
            </p>
            <p className="text-[10px] uppercase text-muted-foreground">Lidos</p>
          </div>
          <div className="rounded-xl bg-muted/60 py-2">
            <p className="font-heading text-lg">
              {filteredBooks.filter((b) => !b.leitura_completa).length}
            </p>
            <p className="text-[10px] uppercase text-muted-foreground">Pendentes</p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground mt-4 text-sm">Carregando livros...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div
          className="rounded-3xl border-2 border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground"
        >
          Sua biblioteca está vazia.{' '}
          <Link href="/search" className="text-primary font-medium hover:underline">
            Buscar livros →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="rounded-2xl border border-border bg-card p-3 shadow-soft space-y-3"
            >
              <div className="flex gap-3">
                <img
                  src={book.capa_url}
                  alt={book.titulo}
                  className="size-16 rounded-lg object-cover shrink-0 bg-muted"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    img.src = '/default-book-cover.png'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-2 leading-snug">
                    {book.titulo}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {book.autor}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{book.leitura_completa ? '✓ Lido' : '○ Não lido'}</span>
                    <StarRating value={book.avaliacao} />
                  </div>
                  {book.comentario && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                      &ldquo;{book.comentario}&rdquo;
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteBook(book.id)}
                  className="shrink-0 self-start"
                >
                  Deletar
                </Button>
              </div>
              <GoogleShoppingLink
                titulo={book.titulo}
                autor={book.autor}
                className="min-h-10 text-xs rounded-xl"
              />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}

function StarRating({ value }: { value: number | null }) {
  if (!value) {
    return <span>—</span>
  }

  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= value ? 'text-amber-400' : 'text-muted-foreground/30'}
        >
          ★
        </span>
      ))}
    </span>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'border border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
