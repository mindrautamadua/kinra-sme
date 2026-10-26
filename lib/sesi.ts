import 'server-only'
import { cache } from 'react'
import { type Aksi, boleh, type Peran } from './akses'
import { db } from './supabase'

export type Saya = { id: string; email: string; nama: string; peran: Peran; wajib_ganti_sandi: boolean }

/** Pengguna yang sedang login, atau null. Di-cache per request. */
export const penggunaSaya = cache(async (): Promise<Saya | null> => {
  const { data, error } = await (await db()).rpc('saya')
  if (error || !data?.length) return null
  return data[0] as Saya
})

/** Penjaga server action: kembalikan pesan galat bila peran tidak berhak. */
export async function cekAkses(aksi: Aksi): Promise<string | null> {
  const s = await penggunaSaya()
  if (!s) return 'Sesi berakhir. Silakan masuk kembali.'
  return boleh(s.peran, aksi) ? null : 'Peran Anda tidak memiliki akses untuk tindakan ini.'
}
