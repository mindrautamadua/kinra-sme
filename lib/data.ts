import 'server-only'
import { hitungEnpi } from './enpi'
import { DOKUMEN_TEMPLAT } from './formulir/tautan'
import { BUCKET_BUKTI } from './status'
import { db } from './supabase'
import type { Berkas, BerkasTampil, Dokumen, EnergiBulanan, Enpi, Isu, JejakBukti, Kegiatan, Klausul, Peluang, RencanaAksi, Sasaran, SumberEnergi, Temuan, VariabelBulanan, VariabelRelevan } from './types'

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
  const s = await db()
  const [r, isian] = await Promise.all([
    s.from('dokumen_audit').select('*, berkas(count)').order('kode'),
    isianDisetujuiPerDokumen(),
  ])
  const tambah = (d: Dokumen) => ({ ...d, jumlah_isian: isian.get(d.kode) ?? 0 })
  // Relasi berkas belum ada (migrasi 0010 belum dijalankan): baca tanpa jumlah berkas
  if (r.error?.code === 'PGRST200') return cek<Dokumen[]>(await s.from('dokumen_audit').select('*').order('kode'), 'dokumen_audit').map(tambah)
  return cek(r, 'dokumen_audit').map(({ berkas, ...d }: Dokumen & { berkas?: { count: number }[] }) => tambah({ ...d, jumlah_berkas: berkas?.[0]?.count ?? 0 }))
}

/** Jumlah isian formulir disetujui per kode dokumen kesiapan. Kosong bila tabel formulir belum ada (migrasi 0011). */
export async function isianDisetujuiPerDokumen(): Promise<Map<string, number>> {
  const { data, error } = await (await db()).from('formulir_isian').select('templat_kode').eq('status', 'disetujui')
  const hasil = new Map<string, number>()
  if (error) return hasil
  for (const { templat_kode } of data as { templat_kode: string }[]) {
    const kode = DOKUMEN_TEMPLAT[templat_kode]
    if (kode) hasil.set(kode, (hasil.get(kode) ?? 0) + 1)
  }
  return hasil
}

/** Berkas evidence satu dokumen beserta signed URL (bucket privat, berlaku 1 jam). `migrasi` true bila tabel berkas belum ada. */
export async function ambilBerkas(dokumenId: string): Promise<{ berkas: BerkasTampil[]; migrasi: boolean }> {
  const s = await db()
  const r = await s.from('berkas').select('*').eq('dokumen_id', dokumenId).order('diunggah_at').returns<Berkas[]>()
  if (r.error?.code === 'PGRST205') return { berkas: [], migrasi: true }
  const daftar = cek(r, 'berkas')
  const { data: tanda } = daftar.length ? await s.storage.from(BUCKET_BUKTI).createSignedUrls(daftar.map((b) => b.path), 3600) : { data: [] }
  return { berkas: daftar.map((b) => ({ ...b, url: tanda?.find((t) => t.path === b.path)?.signedUrl ?? null })), migrasi: false }
}

/** Jejak evidence semua dokumen (unggah berkas dan isian formulir disetujui), terlama dulu: bahan tren dan aktivitas. */
export async function ambilJejakBukti(): Promise<JejakBukti[]> {
  const s = await db()
  const [b, i, d] = await Promise.all([
    s.from('berkas').select('dokumen_id, nama_file, diunggah_oleh, diunggah_at').not('dokumen_id', 'is', null).limit(10000),
    s.from('formulir_isian').select('templat_kode, judul, disetujui_oleh, disetujui_at').eq('status', 'disetujui').not('disetujui_at', 'is', null),
    s.from('dokumen_audit').select('id, kode'),
  ])
  const idDariKode = new Map((d.data ?? []).map((x: { id: string; kode: string }) => [x.kode, x.id]))
  const jejak: JejakBukti[] = [
    ...(b.error ? [] : (b.data as { dokumen_id: string; nama_file: string; diunggah_oleh: string | null; diunggah_at: string }[]))
      .map((x) => ({ dokumen_id: x.dokumen_id, at: x.diunggah_at, oleh: x.diunggah_oleh, jenis: 'berkas' as const, label: x.nama_file })),
    ...(i.error ? [] : (i.data as { templat_kode: string; judul: string | null; disetujui_oleh: string | null; disetujui_at: string }[]))
      .flatMap((x) => {
        const id = idDariKode.get(DOKUMEN_TEMPLAT[x.templat_kode] ?? '')
        return id ? [{ dokumen_id: id, at: x.disetujui_at, oleh: x.disetujui_oleh, jenis: 'isian' as const, label: x.judul ?? 'Isian formulir' }] : []
      }),
  ]
  return jejak.sort((a, b) => a.at.localeCompare(b.at))
}

/** Jumlah isian formulir yang diajukan dan menunggu persetujuan, per kode dokumen kesiapan. */
export async function isianDiajukanPerDokumen(): Promise<Map<string, number>> {
  const { data, error } = await (await db()).from('formulir_isian').select('templat_kode').eq('status', 'diajukan')
  const hasil = new Map<string, number>()
  if (error) return hasil
  for (const { templat_kode } of data as { templat_kode: string }[]) {
    const kode = DOKUMEN_TEMPLAT[templat_kode]
    if (kode) hasil.set(kode, (hasil.get(kode) ?? 0) + 1)
  }
  return hasil
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
