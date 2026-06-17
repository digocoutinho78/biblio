import { updateSession } from '@/lib/supabase/update-session'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request)
  } catch (error) {
    console.error('[proxy] updateSession failed:', error)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    /*
     * Executa apenas em rotas de app — exclui assets estáticos e arquivos PWA.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|icon\\.svg|icon-light-32x32\\.png|icon-dark-32x32\\.png|apple-icon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|json|woff2?|ttf|eot)$).*)',
  ],
}
