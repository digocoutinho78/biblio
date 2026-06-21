import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AppLogo } from '@/components/layout/app-logo'
import Link from 'next/link'

export default function Page() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <AppLogo href="/auth/login" />
        </div>
        <Card className="rounded-3xl border-border shadow-soft">
          <CardHeader>
            <CardTitle className="font-heading text-2xl italic">
              Conta criada!
            </CardTitle>
            <CardDescription>Confirme seu email para continuar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você se cadastrou com sucesso. Verifique seu email para confirmar
              a conta antes de entrar.
            </p>
            <Link
              href="/auth/login"
              className="text-sm text-primary font-medium hover:underline"
            >
              Voltar para entrar →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
