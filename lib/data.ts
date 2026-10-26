import 'server-only'
import { hitungEnpi } from './enpi'
import { db } from './supabase'
import type { Dokumen, EnergiBulanan, Enpi, Isu, Kegiatan, Klausul, Peluang, RencanaAksi, RiwayatStatus, Sasaran, SumberEnergi, Temuan, VariabelBulanan, VariabelRelevan } from './types'

/** Tabel belum ada (PGRST205) dianggap kosong; layout menampilkan panduan migrasi. Galat lain dilempar. */
function cek<T>(r: { data: T | null; error: { message: string; code?: string } | null }, tabel: string): T {
  if (r.error?.code === 'PGRST205') return [] as T
  if (r.error) throw new Error(`Gagal membaca ${tabel}: ${r.error.message}`)
  return (r.data ?? []) as T
}

export async function ambilKlausul(): Promise<Klausul[]> {
  return cek(await (await db()).from('klausul').select('*').order('urutan'), 'klausul')
}

export async function ambilDokumen(): Promise<Dokumen[]> {
  return cek(await (await db()).from('dokumen_audit').select('*').order('kode'), 'dokumen_audit')
}

/** Riwayat perubahan status semua dokumen, terlama dulu (bahan tren kesiapan). */
export async function ambilRiwayat(): Promise<RiwayatStatus[]> {
  return cek(await (await db()).from('riwayat_status').select('dokumen_id, dari, ke, at, oleh').order('at').limit(10000), 'riwayat_status')
}

export async function ambilEnergi(): Promise<{ sumber: SumberEnergi[]; data: EnergiBulanan[] }> {
  const s = await db()
  const [a, b] = await Promise.all([
    s.from('sumber_energi').select('*').order('urutan'),
    s.from('energi_bulanan').select('tahun, bulan, sumber_kode, nilai').order('tahun').order('bulan'),
  ])
  return {
    sumber: cek(a, 'sumber_energi'),
    data: cek<EnergiBulanan[]>(b, 'energi_bulanan').map((r) => ({ ...r, nilai: Number(r.nilai) })),
  }
}

export async function ambilKegiatan(): Promise<Kegiatan[]> {
  return cek(await (await db()).from('kegiatan').select('*').order('no'), 'kegiatan')
}

export async function ambilIsu(): Promise<Isu[]> {
  return cek(await (await db()).from('isu').select('*').order('skor', { ascending: false }).order('id'), 'isu')
}

export async function ambilPeluang(): Promise<Peluang[]> {
  return cek<Peluang[]>(await (await db()).from('peluang').select('*').order('kode'), 'peluang').map((p) => ({
    ...p, prioritas: p.prioritas === null ? null : Number(p.prioritas), estimasi_kwh: p.estimasi_kwh === null ? null : Number(p.estimasi_kwh),
  }))
}

export async function ambilTemuan(): Promise<Temuan[]> {
  return cek(await (await db()).from('temuan').select('*').order('tanggal', { ascending: false }).order('nomor'), 'temuan')
}

export async function ambilVariabel(): Promise<{ variabel: VariabelRelevan[]; data: VariabelBulanan[] }> {
  const s = await db()
  const [a, b] = await Promise.all([
    s.from('variabel_relevan').select('*').order('urutan').order('kode'),
    s.from('variabel_bulanan').select('tahun, bulan, variabel_kode, nilai').order('tahun').order('bulan'),
  ])
  return {
    variabel: cek(a, 'variabel_relevan'),
    data: cek<VariabelBulanan[]>(b, 'variabel_bulanan').map((r) => ({ ...r, nilai: Number(r.nilai) })),
  }
}

export async function ambilEnpi(): Promise<Enpi[]> {
  return cek(await (await db()).from('enpi').select('*').order('urutan').order('kode'), 'enpi')
}

export async function ambilSasaran(): Promise<{ sasaran: Sasaran[]; aksi: RencanaAksi[] }> {
  const s = await db()
  const [a, b] = await Promise.all([
    s.from('sasaran').select('*').order('kode'),
    s.from('rencana_aksi').select('*').order('kode'),
  ])
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  return {
    sasaran: cek<Sasaran[]>(a, 'sasaran').map((x) => ({ ...x, target_persen: n(x.target_persen) })),
    aksi: cek<RencanaAksi[]>(b, 'rencana_aksi').map((x) => ({ ...x, estimasi_hemat_kwh: n(x.estimasi_hemat_kwh), hemat_terverifikasi_kwh: n(x.hemat_terverifikasi_kwh) })),
  }
}

/** Total Terajoule per tahun & sumber. */
export function rekapEnergi(sumber: SumberEnergi[], data: EnergiBulanan[]) {
  const f = Object.fromEntries(sumber.map((s) => [s.kode, Number(s.faktor_tj)]))
  const tahun = [...new Set(data.map((d) => d.tahun))].sort()
  const tj = (filter: (d: EnergiBulanan) => boolean) => data.filter(filter).reduce((t, d) => t + d.nilai * (f[d.sumber_kode] ?? 0), 0)
  return { tahun, tj, faktor: f }
}

/** Semua bahan kinerja energi + hasil perhitungan tiap EnPI. */
export async function ambilKinerja() {
  const [{ sumber, data: energi }, { variabel, data: dataVariabel }, enpi] = await Promise.all([ambilEnergi(), ambilVariabel(), ambilEnpi()])
  const hasil = enpi.map((e) => hitungEnpi(e, sumber, energi, variabel, dataVariabel))
  return { sumber, energi, variabel, dataVariabel, enpi, hasil }
}
