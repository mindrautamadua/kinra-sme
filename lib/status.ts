import type { Dokumen, KelompokDokumen, RiwayatStatus, StatusDokumen } from './types'

export type KodeChip = 'good' | 'warn' | 'serious' | 'crit' | 'na' | 'info'

export const STATUS: Record<StatusDokumen, { label: string; chip: KodeChip; bobot: number }> = {
  belum: { label: 'Belum ada', chip: 'crit', bobot: 0 },
  draft: { label: 'Draft', chip: 'serious', bobot: 0.25 },
  review: { label: 'Review', chip: 'warn', bobot: 0.5 },
  disetujui: { label: 'Disetujui', chip: 'info', bobot: 0.85 },
  final: { label: 'Final', chip: 'good', bobot: 1 },
}
export const URUTAN_STATUS: StatusDokumen[] = ['belum', 'draft', 'review', 'disetujui', 'final']

export const KELOMPOK: Record<KelompokDokumen, string> = {
  persiapan: 'Persiapan awal',
  manual: 'Manual & kebijakan',
  sop: 'SOP',
  formulir: 'Formulir',
  rekaman: 'Rekaman/bukti',
}

export const INDUK_KLAUSUL: Record<string, string> = {
  P: 'Persiapan',
  '4': 'Konteks organisasi',
  '5': 'Kepemimpinan',
  '6': 'Perencanaan',
  '7': 'Dukungan',
  '8': 'Operasi',
  '9': 'Evaluasi kinerja',
  '10': 'Peningkatan',
}

/** Kesiapan berbobot 0–100: belum 0, draft 25, review 50, disetujui 85, final 100. */
export function kesiapan(dokumen: Pick<Dokumen, 'status'>[]): number {
  if (!dokumen.length) return 0
  return (dokumen.reduce((s, d) => s + STATUS[d.status].bobot, 0) / dokumen.length) * 100
}

/** Tanggal WIB (YYYY-MM-DD) dari timestamp. */
export const hariWib = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10)

/**
 * Rekonstruksi skor kesiapan pada akhir tiap tanggal dari riwayat_status.
 * Dokumen tanpa riwayat dianggap berstatus sekarang sepanjang waktu; dokumen yang
 * riwayat pertamanya INSERT (dari = null) belum dihitung sebelum tanggal dibuat.
 */
export function trenKesiapan(dokumen: Dokumen[], riwayat: RiwayatStatus[], hari: string[]): number[] {
  const per = new Map<string, { h: string; dari: StatusDokumen | null; ke: StatusDokumen }[]>()
  for (const r of riwayat) {
    const l = per.get(r.dokumen_id) ?? []
    l.push({ h: hariWib(r.at), dari: r.dari, ke: r.ke })
    per.set(r.dokumen_id, l)
  }
  return hari.map((h) => {
    const st: Pick<Dokumen, 'status'>[] = []
    for (const d of dokumen) {
      const l = per.get(d.id)
      if (!l?.length) { st.push({ status: d.status }); continue }
      let s = l[0].dari
      for (const e of l) { if (e.h > h) break; s = e.ke }
      if (s) st.push({ status: s })
    }
    return kesiapan(st)
  })
}

export function terlambat(d: Pick<Dokumen, 'status' | 'tenggat'>, hariIni: string): boolean {
  return !!d.tenggat && d.tenggat < hariIni && d.status !== 'final' && d.status !== 'disetujui'
}

/** Chip berdasarkan capaian persen, sesuai panduan (≥100 tercapai, 90–99 waspada, 75–89 di bawah, <75 kritis). */
export function chipCapaian(p: number): KodeChip {
  if (p >= 100) return 'good'
  if (p >= 90) return 'warn'
  if (p >= 75) return 'serious'
  return 'crit'
}

export const TEMUAN_STATUS_CHIP: Record<string, KodeChip> = {
  Terbuka: 'crit',
  Proses: 'warn',
  Verifikasi: 'info',
  Tertutup: 'good',
}

export const KATEGORI_TEMUAN_CHIP: Record<string, KodeChip> = {
  Mayor: 'crit',
  Minor: 'serious',
  Observasi: 'warn',
  OFI: 'info',
}

export function tingkatRisiko(skor: number): { label: string; chip: KodeChip } {
  if (skor >= 15) return { label: 'Tinggi', chip: 'crit' }
  if (skor >= 8) return { label: 'Sedang', chip: 'warn' }
  return { label: 'Rendah', chip: 'good' }
}

/** Jadwal kunci dari Timeline Pendampingan Rev.3 */
export const TONGGAK = [
  { kode: 'ia', nama: 'Internal Audit', tanggal: '2026-11-05' },
  { kode: 'tm', nama: 'Tinjauan Manajemen', tanggal: '2026-11-24' },
  { kode: 's1', nama: 'TÜV Stage 1', tanggal: '2026-11-20' },
  { kode: 's2', nama: 'TÜV Stage 2', tanggal: '2026-12-10' },
]

/** Folder induk seluruh evidence SMEn (OneDrive). */
export const FOLDER_BUKTI = 'https://1drv.ms/f/c/0b4f3d49ee2d73a3/IgCR3a7n5EGZQZzBbGtsTiCnAX7VCb1zZ0Kmq82xuJbNhjY?e=GzK8c4'
