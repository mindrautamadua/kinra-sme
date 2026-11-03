import type { Dokumen, Kegiatan, KelompokDokumen, Klausul, RiwayatStatus, StatusDokumen } from './types'

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

/** Nilai satu dokumen dalam skor kesiapan: bobot status, tetapi 0 selama belum ada berkas evidence (auditor memeriksa bukti). */
type DokBukti = Pick<Dokumen, 'status' | 'jumlah_berkas' | 'jumlah_isian'>

export const nilaiKesiapan = (d: DokBukti) => (adaBukti(d) ? STATUS[d.status].bobot : 0)

/** Kesiapan berbobot 0–100: belum 0, draft 25, review 50, disetujui 85, final 100; dokumen tanpa berkas evidence bernilai 0. */
export function kesiapan(dokumen: DokBukti[]): number {
  if (!dokumen.length) return 0
  return (dokumen.reduce((s, d) => s + nilaiKesiapan(d), 0) / dokumen.length) * 100
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
    // Keberadaan berkas memakai kondisi saat ini (riwayat unggah tidak direkam per hari)
    const st: DokBukti[] = []
    for (const d of dokumen) {
      const l = per.get(d.id)
      if (!l?.length) { st.push(d); continue }
      let s = l[0].dari
      for (const e of l) { if (e.h > h) break; s = e.ke }
      if (s) st.push({ status: s, jumlah_berkas: d.jumlah_berkas, jumlah_isian: d.jumlah_isian })
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

/** Jadwal kunci cadangan, dipakai hanya bila tabel kegiatan belum punya kolom tonggak (migrasi 0012). */
const TONGGAK_CADANGAN: { kode: string; no: number; nama: string }[] = [
  { kode: 'ia', no: 10, nama: 'Internal Audit' },
  { kode: 's1', no: 12, nama: 'TÜV Stage 1' },
  { kode: 'tm', no: 11, nama: 'Tinjauan Manajemen' },
  { kode: 's2', no: 13, nama: 'TÜV Stage 2' },
]

export type Tonggak = { kode: string; nama: string; tanggal: string }

/**
 * Tonggak audit dari Timeline (tabel kegiatan), memakai tanggal sesi pertama tiap kegiatan.
 * Menggeser jadwal di Timeline otomatis menggeser hitung mundur di seluruh aplikasi.
 */
export function tonggakDari(kegiatan: Kegiatan[]): Tonggak[] {
  const bertanda = kegiatan.filter((k) => k.tonggak)
  const pasangan = bertanda.length
    ? bertanda.map((k) => ({ kode: k.tonggak!, k }))
    : TONGGAK_CADANGAN.map((t) => ({ kode: t.kode, k: kegiatan.find((x) => x.no === t.no) })).filter((x) => x.k)
  return pasangan
    .map(({ kode, k }) => ({ kode, nama: k!.nama.replace(/^Eksternal Audit\s+/i, ''), tanggal: k!.sesi.map((s) => s.tanggal).sort()[0] }))
    .filter((t) => t.tanggal)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
}

/** Kesiapan per klausul (hanya klausul yang punya dokumen). Dipakai Ringkasan dan Kesiapan Audit. */
export function kesiapanPerKlausul(dokumen: Dokumen[], klausul: Klausul[], kini: string) {
  return klausul.map((k) => {
    const ds = dokumen.filter((d) => d.klausul_kode === k.kode)
    return { ...k, n: ds.length, p: kesiapan(ds), lewat: ds.filter((d) => terlambat(d, kini)).length }
  }).filter((k) => k.n > 0)
}

/** Dokumen dianggap sudah punya evidence bila ada berkas terunggah atau isian formulir tertaut yang sudah disetujui. */
export const adaBukti = (d: Pick<Dokumen, 'jumlah_berkas' | 'jumlah_isian'>) => (d.jumlah_berkas ?? 0) + (d.jumlah_isian ?? 0) > 0

/** Bucket Storage privat untuk berkas evidence (migrasi 0010). */
export const BUCKET_BUKTI = 'smen-evidence'
export const UKURAN_MAKS_BUKTI = 50 * 1024 * 1024
