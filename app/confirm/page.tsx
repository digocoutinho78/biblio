'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { BookData } from '@/lib/book-api'

function ConfirmPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [bookData, setBookData] = useState<BookData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leituraCompleta, setLeituraCompleta] = useState(false)
  const [avaliacao, setAvaliacao] = useState(0)
  const [notas, setNotas] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const bookParam = searchParams.get('book')
    if (bookParam) {
      try {
        const book = JSON.parse(decodeURIComponent(bookParam))
        setBookData(book)
      } catch (err) {
        console.error('[v0] Error parsing book data:', err)
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }, [searchParams, router])

  const handleSaveBook = async () => {
    if (!bookData) return

    setSaving(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { error: insertError } = await supabase
        .from('livros')
        .insert({
          user_id: user.id,
          isbn: bookData.isbn,
          titulo: bookData.titulo,
          autor: bookData.autor,
          editora: bookData.editora,
          descricao: bookData.descricao,
          capa_url: bookData.capaUrl,
          data_publicacao: bookData.dataPublicacao || null,
          leitura_completa: leituraCompleta,
          avaliacao: avaliacao > 0 ? avaliacao : null,
          notas: notas || null,
        })

      if (insertError) {
        console.error('[v0] Insert error:', insertError)
        setError('Erro ao salvar livro: ' + insertError.message)
        return
      }

      // Success - redirect to library
      router.push('/')
    } catch (err) {
      console.error('[v0] Save error:', err)
      setError('Erro ao salvar livro')
    } finally {
      setSaving(false)
    }
  }

  if (!bookData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-2">Bibliô</div>
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="outline" className="mb-6">
            ← Voltar
          </Button>
        </Link>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Salvando Livro</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Book Cover */}
            <div className="flex justify-center">
              <img
                src={bookData.capaUrl}
                alt={bookData.titulo}
                className="w-full max-w-xs h-auto object-cover rounded-lg shadow-lg"
                onError={(e) => {
                  const img = e.target as HTMLImageElement
                  img.src = '/default-book-cover.png'
                }}
              />
            </div>

            {/* Book Details & Options */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Título
                </label>
                <p className="text-lg font-semibold">{bookData.titulo}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Autor
                </label>
                <p className="text-lg">{bookData.autor}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Editora
                </label>
                <p className="text-lg">{bookData.editora}</p>
              </div>

              {/* Checkboxes and Inputs */}
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="leituraCompleta"
                    checked={leituraCompleta}
                    onChange={(e) => setLeituraCompleta(e.target.checked)}
                    className="mr-3 w-4 h-4 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="leituraCompleta"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Já li este livro
                  </label>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Avaliação (1-5 estrelas)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setAvaliacao(avaliacao === star ? 0 : star)}
                        className={`text-2xl cursor-pointer transition-transform hover:scale-110 ${
                          avaliacao >= star ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Notas Pessoais
                  </label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Adicione suas notas sobre este livro..."
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <Button
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="flex-1"
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveBook}
                  className="flex-1"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar na Biblioteca'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-2">Bibliô</div>
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    }>
      <ConfirmPageContent />
    </Suspense>
  )
}
