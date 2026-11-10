import 'server-only'
import { hitungEnpi } from './enpi'
import { BUCKET_BUKTI } from './status'
import { BAWAAN, type ParameterEnergi } from './konversi'
import { db } from './supabase'
import type { Deviasi, JamOperasiPompa, Pompa, Seu, TinjauanEnergi, Aset, MeterEnergi, PembacaanMeter, Berkas, BerkasTampil, Dokumen, EnergiBulanan, Enpi, Isu, JejakBukti, Kegiatan, Klausul, Peluang, RencanaAksi, Sasaran, SumberEnergi, Temuan, VariabelBulanan, VariabelRelevan } from './types'

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
  const r = await s.from('dokumen_audit').select('*, berkas(count)').order('kode')
  // Relasi berkas belum ada (migrasi 0010 belum dijalankan): baca tanpa jumlah berkas
  if (r.error?.code === 'PGRST200') return cek<Dokumen[]>(await s.from('dokumen_audit').select('*').order('kode'), 'dokumen_audit')
  // Berkas bertanda versi sah per dokumen (migrasi 0031); kolom belum ada = 0
  const sah = await s.from('berkas').select('dokumen_id').eq('sah', true)
  const nSah = new Map<string, number>()
  for (const x of (sah.error ? [] : sah.data ?? []) as { dokumen_id: string | null }[]) if (x.dokumen_id) nSah.set(x.dokumen_id, (nSah.get(x.dokumen_id) ?? 0) + 1)
  return cek(r, 'dokumen_audit').map(({ berkas, ...d }: Dokumen & { berkas?: { count: number }[] }) => ({ ...d, jumlah_berkas: berkas?.[0]?.count ?? 0, jumlah_sah: nSah.get(d.id) ?? 0 }))
}

/** Berkas evidence satu dokumen beserta signed URL (bucket privat, berlaku 1 jam). `migrasi` true bila tabel berkas belum ada. */
export async function ambilBerkas(dokumenId: string): Promise<{ berkas: BerkasTampil[]; migrasi: boolean }> {
  const s = await db()
  const r = await s.from('berkas').select('*').eq('dokumen_id', dokumenId).order('diunggah_at').returns<Berkas[]>()
  if (r.error?.code === 'PGRST205') return { berkas: [], migrasi: true }
  const daftar = cek(r, 'berkas')
  const { data: tanda } = daftar.length ? await s.storage.from(BUCKET_BUKTI).createSignedUrls(daftar.map((b) => b.path), 3600) : { data: [] }
  // Versi sah lebih dulu agar yang ditunjukkan ke auditor adalah dokumen yang benar
  const urut = [...daftar].sort((a, b) => Number(!!b.sah) - Number(!!a.sah))
  return { berkas: urut.map((b) => ({ ...b, url: tanda?.find((t) => t.path === b.path)?.signedUrl ?? null })), migrasi: false }
}

/** Metadata semua berkas evidence (tanpa signed URL; URL dibuat saat berkas dibuka). */
export async function ambilDaftarBerkas(): Promise<Berkas[]> {
  return cek(await (await db()).from('berkas').select('*').not('dokumen_id', 'is', null).order('diunggah_at').limit(10000), 'berkas')
}

/** Jejak unggah berkas evidence semua dokumen, terlama dulu: bahan tren dan aktivitas. */
export async function ambilJejakBukti(): Promise<JejakBukti[]> {
  const r = await (await db()).from('berkas').select('dokumen_id, nama_file, diunggah_oleh, diunggah_at').not('dokumen_id', 'is', null).order('diunggah_at').limit(10000)
  if (r.error) return []
  return (r.data as { dokumen_id: string; nama_file: string; diunggah_oleh: string | null; diunggah_at: string }[])
    .map((x) => ({ dokumen_id: x.dokumen_id, at: x.diunggah_at, oleh: x.diunggah_oleh, label: x.nama_file }))
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

const angkaAtauNull = (v: unknown) => (v === null || v === undefined ? null : Number(v))

/** Aset, meter, dan seluruh bacaan stand (migrasi 0022). `siap` false bila tabel belum ada. */
export async function ambilAsetMeter(): Promise<{ aset: Aset[]; meter: MeterEnergi[]; bacaan: PembacaanMeter[]; siap: boolean }> {
  const s = await db()
  const [a, m, p] = await Promise.all([
    s.from('aset').select('*').order('no_urut'),
    s.from('meter_energi').select('*').order('no_urut'),
    s.from('pembacaan_meter').select('*').order('tahun').order('bulan'),
  ])
  const siap = a.error?.code !== 'PGRST205'
  return {
    siap,
    aset: cek<Aset[]>(a, 'aset').map((r) => ({ ...r, luas_m2: angkaAtauNull(r.luas_m2), luas_ac_m2: angkaAtauNull(r.luas_ac_m2), kwh_bulan: angkaAtauNull(r.kwh_bulan), biaya_bulan: angkaAtauNull(r.biaya_bulan) })),
    meter: cek<MeterEnergi[]>(m, 'meter_energi').map((r) => ({ ...r, faktor_kali: Number(r.faktor_kali) })),
    bacaan: cek<PembacaanMeter[]>(p, 'pembacaan_meter').map((r) => ({ ...r, stand_awal: angkaAtauNull(r.stand_awal), stand_akhir: angkaAtauNull(r.stand_akhir), kwh_tagihan: angkaAtauNull(r.kwh_tagihan) })),
  }
}

/** Register pompa dan jam operasi bulanan (migrasi 0044). `siap` false bila tabel belum ada. */
export async function ambilPompa(): Promise<{ pompa: Pompa[]; jam: JamOperasiPompa[]; siap: boolean }> {
  const s = await db()
  const a = await s.from('pompa').select('*').order('unit').order('no_urut')
  if (a.error?.code === 'PGRST205' || a.error?.code === '42P01') return { pompa: [], jam: [], siap: false }
  // Supabase membatasi 1.000 baris per permintaan: ambil bertahap
  const jam: JamOperasiPompa[] = []
  for (let dari = 0; ; dari += 1000) {
    const b = await s.from('jam_operasi_pompa').select('pompa_kode, tahun, bulan, jam, keterangan')
      .order('pompa_kode').order('tahun').order('bulan').range(dari, dari + 999)
    const baris = cek<JamOperasiPompa[]>(b, 'jam_operasi_pompa')
    jam.push(...baris.map((r) => ({ ...r, jam: angkaAtauNull(r.jam) })))
    if (baris.length < 1000) break
  }
  return { siap: true, pompa: cek<Pompa[]>(a, 'pompa').map((r) => ({ ...r, daya_kw: angkaAtauNull(r.daya_kw) })), jam }
}

/** Register SEU dan tinjauan energi terbaru (migrasi 0027). `siap` false bila tabel belum ada. */
export async function ambilSeu(): Promise<{ seu: Seu[]; tinjauan: TinjauanEnergi | null; siap: boolean }> {
  const s = await db()
  const [a, b] = await Promise.all([
    s.from('seu').select('*').order('urutan').order('kode'),
    s.from('tinjauan_energi').select('*').order('periode_mulai', { ascending: false }).limit(1),
  ])
  const t = cek<TinjauanEnergi[]>(b, 'tinjauan_energi')[0] ?? null
  return {
    siap: a.error?.code !== 'PGRST205',
    seu: cek<Seu[]>(a, 'seu'),
    tinjauan: t && { ...t, ambang_persen: Number(t.ambang_persen), ambang_kumulatif: Number(t.ambang_kumulatif) },
  }
}

/** Register deviasi signifikan (migrasi 0028). */
export async function ambilDeviasi(): Promise<Deviasi[]> {
  const r = await (await db()).from('deviasi').select('*').order('tahun', { ascending: false }).order('bulan', { ascending: false })
  return cek<Deviasi[]>(r, 'deviasi').map((d) => ({
    ...d, aktual: d.aktual === null ? null : Number(d.aktual), harapan: d.harapan === null ? null : Number(d.harapan),
    selisih_persen: d.selisih_persen === null ? null : Number(d.selisih_persen),
  }))
}

export type SimulasiTersimpan = {
  id: number; unit_no: number; unit_nama: string; mode: 'stage1' | 'stage2'; jumlah: number; skor: number; skor_maks: number
  prediksi: { kategori: 'Mayor' | 'Minor' | 'OFI'; klausul: string; uraian: string }[]; oleh: string | null; dibuat_at: string
}

/** Riwayat simulasi audit (migrasi 0029). RLS: admin/konsultan semua, peran lain miliknya sendiri. */
export async function ambilRiwayatSimulasi(): Promise<SimulasiTersimpan[]> {
  const r = await (await db()).from('simulasi_audit').select('id, unit_no, unit_nama, mode, jumlah, skor, skor_maks, prediksi, oleh, dibuat_at').order('dibuat_at', { ascending: false }).limit(30)
  return cek<SimulasiTersimpan[]>(r, 'simulasi_audit')
}

/** Parameter konversi rupiah & CO₂ (migrasi 0030); bawaan bila tabel belum ada. */
export async function ambilParameter(): Promise<ParameterEnergi[]> {
  const r = await (await db()).from('parameter_energi').select('*').order('urutan')
  const data = cek<ParameterEnergi[]>(r, 'parameter_energi').map((x) => ({ ...x, nilai: Number(x.nilai) }))
  return data.length ? data : BAWAAN
}

export type PotretKesiapan = { tanggal: string; skor: number; kemajuan: number; n_siap: number; n_bukti: number; jumlah: number; gerbang_lulus: number; gerbang_total: number }

/**
 * Catat potret skor hari ini (upsert per tanggal), lalu kembalikan potret terakhir sebelum hari ini.
 * Gagal diam-diam bila tabel belum ada (migrasi 0033) atau peran tidak berhak menulis.
 */
export async function catatPotret(p: PotretKesiapan): Promise<PotretKesiapan | null> {
  const s = await db()
  await s.from('potret_kesiapan').upsert({ ...p, diubah_at: new Date().toISOString() })
  const r = await s.from('potret_kesiapan').select('*').lt('tanggal', p.tanggal).order('tanggal', { ascending: false }).limit(1)
  const x = (r.error ? [] : r.data ?? [])[0] as PotretKesiapan | undefined
  return x ? { ...x, skor: Number(x.skor), kemajuan: Number(x.kemajuan) } : null
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
  const [{ sumber, data: energi }, { variabel, data: dataVariabel }, enpi, { meter, bacaan }] = await Promise.all([ambilEnergi(), ambilVariabel(), ambilEnpi(), ambilAsetMeter()])
  const hasil = enpi.map((e) => hitungEnpi(e, sumber, energi, variabel, dataVariabel, { meter, bacaan }))
  return { sumber, energi, variabel, dataVariabel, enpi, hasil, meter, bacaan }
}
