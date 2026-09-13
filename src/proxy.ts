import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Role khusus dibatasi ke modul kerjanya walaupun URL diketik secara langsung.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (profile?.role === 'peserta_consulting' && !pathname.startsWith('/dashboard/rals')) {
        return NextResponse.redirect(new URL('/dashboard/rals', request.url))
      }
      if (profile?.role === 'evaluator_apip' && !pathname.startsWith('/dashboard/uji-publik-zi')) {
        return NextResponse.redirect(new URL('/dashboard/uji-publik-zi', request.url))
      }
      if (['upg_pusat', 'upg_satker'].includes(profile?.role ?? '') && !pathname.startsWith('/dashboard/ppg')) {
        return NextResponse.redirect(new URL('/dashboard/ppg', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
