import 'server-only'
import { db } from '@/lib/supabase'
import { TEMPLAT } from './templat'
import type { IsianFormulir, RiwayatFormulir, RingkasTemplat, StatusFormulir, Templat } from './tipe'

export function ambilTemplat(kode: string): Templat | null {
  return TEMPLAT.find((t) => t.kode === kode) ?? null
}

export function daftarTemplat(): RingkasTemplat[] {
  return TEMPLAT.map((t) => ({ kode: t.kode, judul: t.judul, klausul: t.klausul, nomor: t.nomor, tautan: t.tautan, varian: (t.varian ?? []).map((v) => v.nama) }))
}

export type RekapIsian = { templat_kode: string; status: StatusFormulir; diubah_at: string }

/** Ringkasan semua isian (tanpa kolom isi) untuk halaman daftar. `migrasi` = tabel belum dibuat. */
export async function rekapIsian(): Promise<{ rekap: RekapIsian[]; migrasi: boolean }> {
  const { data, error } = await (await db()).from('formulir_isian').select('templat_kode, status, diubah_at')
  if (error) return { rekap: [], migrasi: /formulir_isian|schema cache|does not exist/i.test(error.message) }
  return { rekap: (data ?? []) as RekapIsian[], migrasi: false }
}

export type IsianRingkas = Omit<IsianFormulir, 'isi'>

export async function daftarIsian(kode: string): Promise<IsianRingkas[]> {
  const { data } = await (await db()).from('formulir_isian')
    .select('id, templat_kode, judul, varian, periode, status, dibuat_oleh, dibuat_at, diubah_oleh, diubah_at, diajukan_oleh, diajukan_at, disetujui_oleh, disetujui_at')
    .eq('templat_kode', kode).order('diubah_at', { ascending: false })
  return (data ?? []) as IsianRingkas[]
}

export async function ambilIsian(id: string): Promise<{ isian: IsianFormulir; riwayat: RiwayatFormulir[] } | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const s = await db()
  const [{ data }, { data: riwayat }] = await Promise.all([
    s.from('formulir_isian').select('*').eq('id', id).maybeSingle<IsianFormulir>(),
    s.from('formulir_riwayat').select('*').eq('isian_id', id).order('at', { ascending: false }).limit(30),
  ])
  return data ? { isian: data, riwayat: (riwayat ?? []) as RiwayatFormulir[] } : null
}
