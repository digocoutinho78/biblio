'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { bookDataToLivroInsert, type BookData } from '@/lib/book-api'
import { AppShell } from '@/components/layout/app-shell'
import { GoogleShoppingLink } from '@/components/books/google-shopping-link'

function ConfirmPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [bookData, setBookData] = useState<BookData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leituraCompleta, setLeituraCompleta] = useState(false)
  const [avaliacao, setAvaliacao] = useState(0)
  const [notas, setNotas] = useState('')
  const [comentario, setComentario] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const bookParam = searchParams.get('book')
    if (bookParam) {
      try {
        const book = JSON.parse(decodeURIComponent(bookParam))
        setBookData(book)
      } catch (err) {
        console.error('[confirm] Error parsing book data:', err)
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
        .insert(
          bookDataToLivroInsert(bookData, user.id, {
            leitura_completa: leituraCompleta,
            avaliacao: avaliacao > 0 ? avaliacao : null,
            notas: notas.trim() || null,
            comentario: comentario.trim() || null,
          }),
        )

      if (insertError) {
        console.error('[confirm] Insert error:', insertError)
        setError('Erro ao salvar livro: ' + insertError.message)
        return
      }

      router.push('/')
    } catch (err) {
      console.error('[confirm] Save error:', err)
      setError('Erro ao salvar livro')
    } finally {
      setSaving(false)
    }
  }

  if (!bookData) {
    return (
      <AppShell hideNav>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <p className="font-heading text-2xl italic">Bibliô</p>
            <p className="text-muted-foreground text-sm mt-2">Carregando...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell hideNav>
      <Link href="/search">
        <Button variant="outline" className="mb-4 min-h-11">
          ← Voltar
        </Button>
      </Link>

      <h1 className="font-heading text-2xl italic mb-6">Salvar na biblioteca</h1>

      <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
        <div className="flex justify-center mb-6">
          <img
            src={bookData.capaUrl}
            alt={bookData.titulo}
            className="w-full max-w-xs rounded-2xl object-cover shadow-soft"
            onError={(e) => {
              const img = e.target as HTMLImageElement
              img.src = '/default-book-cover.png'
            }}
          />
        </div>

        <div className="space-y-4">
          <Field label="Título" value={bookData.titulo} large />
          <Field label="Autor" value={bookData.autor} />
          <Field label="Editora" value={bookData.editora} />

          <div className="border-t border-border pt-4 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={leituraCompleta}
                onChange={(e) => setLeituraCompleta(e.target.checked)}
                className="size-4 rounded border-border text-primary"
              />
              <span className="text-sm font-medium">Já li este livro</span>
            </label>

            <div>
              <label className="block text-sm font-medium mb-2">
                Avaliação (1-5 estrelas)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setAvaliacao(avaliacao === star ? 0 : star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      avaliacao >= star ? 'text-amber-400' : 'text-muted-foreground/40'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Notas pessoais
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Adicione suas notas sobre este livro..."
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Comentário (opcional)
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Suas impressões sobre o livro..."
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={3}
              />
            </div>
          </div>

          <GoogleShoppingLink titulo={bookData.titulo} autor={bookData.autor} />

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-2xl text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="flex-1 min-h-12"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveBook}
              className="flex-1 min-h-12"
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar na Biblioteca'}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function Field({
  label,
  value,
  large,
}: {
  label: string
  value: string
  large?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <p className={large ? 'text-lg font-semibold mt-1' : 'text-base mt-1'}>
        {value}
      </p>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <AppShell hideNav>
          <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        </AppShell>
      }
    >
      <ConfirmPageContent />
    </Suspense>
  )
}
