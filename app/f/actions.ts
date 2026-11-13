'use server'

import { revalidatePath } from 'next/cache'
import { type LembarPublik, rapikanJawaban } from '@/lib/penyelidikan'
import { db } from '@/lib/supabase'

const TOKEN = /^[A-Za-z0-9_-]{32,128}$/

/** Ambil lembar untuk pemegang tautan. Selalu tanpa sesi login (anon), sehingga hanya fungsi publik yang terpakai. */
export async function ambilLembarPublik(token: string): Promise<LembarPublik | null | 'migrasi'> {
  if (!TOKEN.test(token)) return null
  const { data, error } = await (await db('')).rpc('lembar_publik', { p_token: token })
  if (error?.code === 'PGRST202' || error?.code === '42883') return 'migrasi'
  if (error || !data) return null
  return data as LembarPublik
}

/** Simpan draf atau kirim jawaban. Pertanyaan dibaca ulang dari database agar hanya id yang dikenal yang tersimpan. */
export async function simpanJawabanPublik(token: string, jawaban: unknown, nama: string, jabatan: string, kirim: boolean):
  Promise<{ ok: true; status: string } | { ok: false; pesan: string }> {
  const l = await ambilLembarPublik(token)
  if (l === 'migrasi') return { ok: false, pesan: 'Fitur belum aktif. Hubungi Koordinator SMEn.' }
  if (!l) return { ok: false, pesan: 'Tautan tidak valid atau sudah tidak aktif.' }
  const { data, error } = await (await db('')).rpc('simpan_jawaban_lembar', {
    p_token: token, p_jawaban: rapikanJawaban(l, jawaban), p_nama: nama.slice(0, 120), p_jabatan: jabatan.slice(0, 120), p_kirim: kirim,
  })
  if (error) return { ok: false, pesan: error.message }
  revalidatePath('/penyelidikan')
  return { ok: true, status: String(data) }
}
