import { type NextRequest, NextResponse } from 'next/server'
import { bolehHalaman, type Peran } from '@/lib/akses'

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/** Cache peran per token sesi (60 detik) supaya tidak memanggil database di setiap request. */
const CACHE = new Map<string, { peran: Peran | null; sampai: number }>()

async function peranDari(token: string): Promise<Peran | null> {
  const ada = CACHE.get(token)
  if (ada && ada.sampai > Date.now()) return ada.peran
  let peran: Peran | null = null
  try {
    const r = await fetch(`${URL_SB}/rest/v1/rpc/saya`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'x-sesi': token, 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
    })
    if (r.ok) peran = ((await r.json()) as { peran: Peran }[])[0]?.peran ?? null
  } catch {
    return null // jangan cache galat jaringan
  }
  if (CACHE.size > 500) CACHE.clear()
  CACHE.set(token, { peran, sampai: Date.now() + 60_000 })
  return peran
}

/**
 * Arahkan ke /masuk bila belum ada cookie sesi. Keabsahan token diperiksa di layout & RLS database.
 * Peran auditor hanya boleh membuka halaman di HALAMAN_AUDITOR (lib/akses.ts); halaman lain dialihkan ke /kesiapan.
 * Penjagaan di sini (bukan di layout) karena layout tidak dirender ulang saat navigasi antarhalaman di sisi klien.
 * Dikecualikan: /f/<token>, lembar penyelidikan untuk PIC tanpa login (akses dijaga token di fungsi database, migrasi 0075).
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get('kinra_sesi')?.value
  if (token) {
    const path = req.nextUrl.pathname
    if (path !== '/ganti-sandi' && (await peranDari(token)) === 'auditor' && !bolehHalaman('auditor', path)) {
      if (path.startsWith('/api/')) return NextResponse.json({ pesan: 'Tidak tersedia untuk akun auditor.' }, { status: 403 })
      return NextResponse.redirect(new URL('/kesiapan', req.url))
    }
    return NextResponse.next()
  }
  const url = new URL('/masuk', req.url)
  if (req.nextUrl.pathname !== '/') url.searchParams.set('lanjut', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!masuk|f/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)'],
}
