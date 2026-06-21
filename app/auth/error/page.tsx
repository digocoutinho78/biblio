import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppLogo } from '@/components/layout/app-logo'
import Link from 'next/link'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <AppLogo href="/auth/login" />
        </div>
        <Card className="rounded-3xl border-border shadow-soft">
          <CardHeader>
            <CardTitle className="font-heading text-2xl italic">
              Algo deu errado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {params?.error ? (
              <p className="text-sm text-muted-foreground">
                Código de erro: {params.error}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ocorreu um erro inesperado.
              </p>
            )}
            <Link
              href="/auth/login"
              className="text-sm text-primary font-medium hover:underline"
            >
              Tentar novamente →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
