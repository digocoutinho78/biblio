'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)

      if (!user) {
        router.push('/auth/login')
      }
    }

    checkAuth()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-2">Bibliô</div>
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Minha Biblioteca</h1>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className={buttonVariants({ variant: 'outline' })}
            >
              Admin
            </Link>
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/auth/login')
              }}
            >
              Sair
            </Button>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          {/* Scanner Button */}
          <Link href="/scanner" className="block">
            <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center hover:bg-primary/5 transition-colors cursor-pointer">
              <div className="text-4xl mb-4">📷</div>
              <h2 className="text-xl font-semibold mb-2">Scanner</h2>
              <p className="text-muted-foreground text-sm">
                Adicione livros usando o código de barras
              </p>
            </div>
          </Link>

          {/* Manual Search Button */}
          <Link href="/search" className="block">
            <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center hover:bg-primary/5 transition-colors cursor-pointer">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-xl font-semibold mb-2">Buscar</h2>
              <p className="text-muted-foreground text-sm">
                Procure livros por título ou autor
              </p>
            </div>
          </Link>
        </div>

        {/* Temporary Welcome Message */}
        <div className="mt-12 p-6 bg-card border rounded-lg max-w-2xl">
          <h3 className="font-semibold mb-2">Bem-vindo ao Bibliô!</h3>
          <p className="text-muted-foreground text-sm">
            Comece a organizar sua biblioteca escolhendo uma das opções acima.
            Você pode adicionar livros manualmente ou usando o scanner de
            código de barras.
          </p>
        </div>
      </div>
    </main>
  )
}
