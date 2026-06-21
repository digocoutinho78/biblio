'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { AppShell } from '@/components/layout/app-shell'

interface Livro {
  id: string
  titulo: string
  autor: string
  capa_url: string
  leitura_completa: boolean
  avaliacao: number | null
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [livros, setLivros] = useState<Livro[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)

      const { data } = await supabase
        .from('livros')
        .select('id, titulo, autor, capa_url, leitura_completa, avaliacao')
        .eq('user_id', user.id)
        .order('data_adicao', { ascending: false })

      setLivros(data || [])
      setLoading(false)
    }

    load()
  }, [router, supabase])

  const total = livros.length
  const lidos = livros.filter((l) => l.leitura_completa).length
  const rated = livros.filter((l) => l.avaliacao != null)
  const notaMedia =
    rated.length > 0
      ? (
          rated.reduce((sum, l) => sum + (l.avaliacao ?? 0), 0) / rated.length
        ).toFixed(1)
      : '—'

  const headerRight = (
    <div className="flex items-center gap-1">
      <Link href="/admin" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        Admin
      </Link>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await supabase.auth.signOut()
          router.push('/auth/login')
        }}
      >
        Sair
      </Button>
    </div>
  )

  if (loading) {
    return (
      <AppShell hideNav headerRight={headerRight}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <p className="font-heading text-2xl italic">Bibliô</p>
            <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell headerRight={headerRight}>
      <section className="pt-2 pb-6">
        <h1 className="font-heading text-[2rem] leading-tight tracking-tight text-foreground">
          Cada livro,
          <br />
          <span className="text-primary italic">um capítulo seu.</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-md">
          Organize sua biblioteca pessoal, registre leituras e descubra novos
          títulos com o scanner ou busca manual.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="NA ESTANTE" value={String(total)} />
        <StatCard label="LIDOS" value={String(lidos)} />
        <StatCard label="NOTA MÉDIA" value={notaMedia} />
      </section>

      {total === 0 ? (
        <section
          className="rounded-3xl border-2 border-dashed border-border bg-card p-8 text-center shadow-soft"
        >
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-accent">
            <BookOpen className="size-8 text-primary" strokeWidth={1.75} />
          </div>
          <h2 className="font-heading text-2xl italic text-foreground">
            Sua estante está vazia
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Adicione seu primeiro livro escaneando o código de barras ou
            buscando por título ou autor.
          </p>
          <Link
            href="/scanner"
            className={buttonVariants({
              size: 'lg',
              className: 'mt-6 w-full max-w-xs mx-auto h-12 text-base gap-2',
            })}
          >
            <Plus className="size-5" />
            Adicionar primeiro livro
          </Link>
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/scanner" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              📷 Scanner
            </Link>
            <Link href="/search" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              🔍 Buscar manualmente
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-6">
            <Link href="/scanner" className={buttonVariants({ size: 'sm' })}>
              <Plus className="size-4" />
              Adicionar livro
            </Link>
            <Link href="/search" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Buscar
            </Link>
            <Link href="/scanner" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Scanner
            </Link>
          </div>

          <section className="grid grid-cols-2 gap-3">
            {livros.map((livro) => (
              <div
                key={livro.id}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-soft"
              >
                <div className="aspect-[3/4] bg-muted">
                  <img
                    src={livro.capa_url}
                    alt={livro.titulo}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement
                      img.src = '/default-book-cover.png'
                    }}
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 leading-snug">
                    {livro.titulo}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {livro.autor}
                  </p>
                  {livro.leitura_completa && (
                    <span className="mt-2 inline-block text-[10px] uppercase tracking-wide text-primary font-medium">
                      Lido
                    </span>
                  )}
                </div>
              </div>
            ))}
          </section>

          <div className="mt-8 p-5 rounded-2xl border border-border bg-card shadow-soft">
            <h3 className="font-heading text-lg italic">Bem-vindo ao Bibliô!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Continue organizando sua biblioteca com o scanner ou a busca
              manual. Gerencie tudo na aba Coleção.
            </p>
          </div>
        </>
      )}
    </AppShell>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-4 text-center shadow-soft">
      <p className="font-heading text-2xl text-foreground">{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  )
}
