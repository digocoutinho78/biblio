'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppLogo } from '@/components/layout/app-logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Page() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      router.push('/')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erro ao entrar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <AppLogo href="/auth/login" />
        </div>
        <Card className="rounded-3xl border-border shadow-soft">
          <CardHeader>
            <CardTitle className="font-heading text-2xl italic">Entrar</CardTitle>
            <CardDescription>
              Acesse sua biblioteca pessoal no Bibliô
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-full min-h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-full min-h-11"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive rounded-xl bg-destructive/10 p-3">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full min-h-11" disabled={isLoading}>
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Não tem conta?{' '}
                <Link
                  href="/auth/sign-up"
                  className="text-primary font-medium hover:underline"
                >
                  Criar conta
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
