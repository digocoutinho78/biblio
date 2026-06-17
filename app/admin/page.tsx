'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Livro {
  id: string
  titulo: string
  autor: string
  editora: string
  isbn: string
  leitura_completa: boolean
  avaliacao: number | null
  capa_url: string
  data_adicao: string
}

export default function AdminPage() {
  const router = useRouter()
  const [supabase, setSupabase] = useState<any>(null)
  const [livros, setLivros] = useState<Livro[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLido, setFilterLido] = useState<'todos' | 'lido' | 'nao-lido'>('todos')
  const [filterAvaliacao, setFilterAvaliacao] = useState(0)
  const [sortBy, setSortBy] = useState<'data' | 'titulo' | 'autor'>('data')

  useEffect(() => {
    // Import Supabase client only on client-side
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

        let query = supabase
          .from('livros')
          .select('*')
          .eq('user_id', user.id)

        const { data, error } = await query

        if (error) {
          console.error('[v0] Error loading books:', error)
          return
        }

        setLivros(data || [])
      } catch (err) {
        console.error('[v0] Load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadBooks()
  }, [router, supabase])

  // Filter and search
  let filteredBooks = livros

  // Search filter
  if (searchQuery) {
    filteredBooks = filteredBooks.filter(
      (book) =>
        book.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.autor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.editora.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.isbn.includes(searchQuery)
    )
  }

  // Read status filter
  if (filterLido === 'lido') {
    filteredBooks = filteredBooks.filter((book) => book.leitura_completa)
  } else if (filterLido === 'nao-lido') {
    filteredBooks = filteredBooks.filter((book) => !book.leitura_completa)
  }

  // Rating filter
  if (filterAvaliacao > 0) {
    filteredBooks = filteredBooks.filter(
      (book) => book.avaliacao && book.avaliacao >= filterAvaliacao
    )
  }

  // Sort
  filteredBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === 'titulo') {
      return a.titulo.localeCompare(b.titulo)
    } else if (sortBy === 'autor') {
      return a.autor.localeCompare(b.autor)
    }
    // Default: by date (newest first)
    return (
      new Date(b.data_adicao).getTime() - new Date(a.data_adicao).getTime()
    )
  })

  const exportToCSV = () => {
    const headers = [
      'Título',
      'Autor',
      'Editora',
      'ISBN',
      'Lido',
      'Avaliação',
      'Data Adicionado',
    ]
    const rows = filteredBooks.map((book) => [
      book.titulo,
      book.autor,
      book.editora,
      book.isbn,
      book.leitura_completa ? 'Sim' : 'Não',
      book.avaliacao ? `${book.avaliacao}/5` : 'N/A',
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
      console.error('[v0] Delete error:', error)
    } else {
      setLivros(livros.filter((book) => book.id !== id))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Painel Admin</h1>
          <Link href="/">
            <Button variant="outline">← Voltar</Button>
          </Link>
        </div>

        {/* Controls */}
        <div className="bg-card border rounded-lg p-6 mb-8">
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, autor, editora ou ISBN..."
              className="w-full px-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={filterLido}
                onChange={(e) => setFilterLido(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="todos">Todos</option>
                <option value="lido">Lidos</option>
                <option value="nao-lido">Não Lidos</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Avaliação Mínima
              </label>
              <select
                value={filterAvaliacao}
                onChange={(e) => setFilterAvaliacao(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={0}>Todas</option>
                <option value={1}>1★+</option>
                <option value={2}>2★+</option>
                <option value={3}>3★+</option>
                <option value={4}>4★+</option>
                <option value={5}>5★</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Ordenar Por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="data">Data Adicionado</option>
                <option value="titulo">Título</option>
                <option value="autor">Autor</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button onClick={exportToCSV} className="w-full">
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-background rounded border">
              <p className="text-muted-foreground text-xs">Total</p>
              <p className="text-xl font-semibold">{filteredBooks.length}</p>
            </div>
            <div className="p-3 bg-background rounded border">
              <p className="text-muted-foreground text-xs">Lidos</p>
              <p className="text-xl font-semibold">
                {filteredBooks.filter((b) => b.leitura_completa).length}
              </p>
            </div>
            <div className="p-3 bg-background rounded border">
              <p className="text-muted-foreground text-xs">Não Lidos</p>
              <p className="text-xl font-semibold">
                {filteredBooks.filter((b) => !b.leitura_completa).length}
              </p>
            </div>
          </div>
        </div>

        {/* Books Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <p className="text-muted-foreground mt-4">Carregando livros...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhum livro encontrado
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Capa
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Título
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Autor
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Editora
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    Lido
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    Nota
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <img
                        src={book.capa_url}
                        alt={book.titulo}
                        className="h-12 w-8 object-cover rounded"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement
                          img.src = '/default-book-cover.png'
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium max-w-xs truncate">
                      {book.titulo}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                      {book.autor}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                      {book.editora}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {book.leitura_completa ? '✓' : '○'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {book.avaliacao ? `${book.avaliacao}★` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteBook(book.id)}
                      >
                        Deletar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
