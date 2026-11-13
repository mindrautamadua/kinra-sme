import { type NextRequest, NextResponse } from 'next/server'

/**
 * Arahkan ke /masuk bila belum ada cookie sesi. Keabsahan token diperiksa di layout & RLS database.
 * Dikecualikan: /f/<token>, lembar penyelidikan untuk PIC tanpa login (akses dijaga token di fungsi database, migrasi 0075).
 */
export function proxy(req: NextRequest) {
  if (req.cookies.get('kinra_sesi')) return NextResponse.next()
  const url = new URL('/masuk', req.url)
  if (req.nextUrl.pathname !== '/') url.searchParams.set('lanjut', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!masuk|f/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)'],
}
