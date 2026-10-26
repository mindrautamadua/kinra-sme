import type { Kegiatan, StatusKegiatan } from './types'

/** Status dari tanggal sesi saja; dipakai bila kolom status belum ada (migrasi 0005 belum dijalankan). */
export function statusDariTanggal(k: Kegiatan, kini: string): StatusKegiatan {
  const t = k.sesi.map((s) => s.tanggal).sort()
  if (!t.length || t[0] > kini) return 'belum'
  return t.at(-1)! < kini ? 'selesai' : 'berjalan'
}

export type Keadaan = StatusKegiatan | 'konfirmasi'

/** 'konfirmasi' = semua sesi sudah lewat tetapi belum ditandai selesai. */
export function keadaan(k: Kegiatan, kini: string): Keadaan {
  const st = k.status ?? statusDariTanggal(k, kini)
  const akhir = k.sesi.map((s) => s.tanggal).sort().at(-1)
  if (st !== 'selesai' && akhir && akhir < kini) return 'konfirmasi'
  return st
}

export const KEADAAN: Record<Keadaan, { label: string; chip: 'good' | 'info' | 'na' | 'crit' }> = {
  selesai: { label: 'Selesai', chip: 'good' },
  berjalan: { label: 'Sedang berjalan', chip: 'info' },
  belum: { label: 'Belum dikerjakan', chip: 'na' },
  konfirmasi: { label: 'Perlu konfirmasi', chip: 'crit' },
}
