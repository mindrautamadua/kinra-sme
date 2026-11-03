'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Aksi } from '@/lib/akses'
import { ambilBerkas } from '@/lib/data'
import { cekAkses } from '@/lib/sesi'
import { COOKIE_SESI, db } from '@/lib/supabase'
import { BUCKET_BUKTI, STATUS, UKURAN_MAKS_BUKTI } from '@/lib/status'
import type { BerkasTampil, StatusAksi, StatusDokumen, StatusKegiatan } from '@/lib/types'
import { ambilIsian, ambilTemplat } from '@/lib/formulir/data'
import { isiAwal, selaraskan } from '@/lib/formulir/isi'
import { tabelDariData } from '@/lib/formulir/sumber-data'
import { DOKUMEN_TEMPLAT, TABEL_TERTAUT } from '@/lib/formulir/tautan'
import type { IsiFormulir, StatusFormulir } from '@/lib/formulir/tipe'

type Hasil = { ok: true } | { ok: false; pesan: string }

function gagal(e: { message: string } | null): Hasil {
  return e ? { ok: false, pesan: e.message } : { ok: true }
}

/** Tolak lebih awal bila peran tidak berhak. RLS di database tetap menjadi penjaga utama. */
async function tolak(aksi: Aksi): Promise<Hasil | null> {
  const pesan = await cekAkses(aksi)
  return pesan ? { ok: false, pesan } : null
}

const teks = (f: FormData, k: string) => {
  const v = f.get(k)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}
const bil = (f: FormData, k: string) => {
  const v = teks(f, k)
  if (v === null) return null
  // input type="number" selalu memakai titik desimal
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// ---------- Dokumen audit ----------

export async function ubahStatusDokumen(id: string, status: StatusDokumen): Promise<Hasil> {
  const t = await tolak(status === 'disetujui' || status === 'final' ? 'dokumen.setujui' : 'dokumen.ubah'); if (t) return t
  const { data, error } = await (await db()).from('dokumen_audit').update({ status }).eq('id', id).select('id')
  revalidatePath('/', 'layout')
  if (!error && !data?.length) return { ok: false, pesan: 'Perubahan tidak tersimpan: tidak punya akses atau data tidak ditemukan.' }
  return gagal(error)
}

export async function simpanDokumen(id: string | null, f: FormData): Promise<Hasil & { id?: string }> {
  const t = await tolak(id ? 'dokumen.ubah' : 'dokumen.tambah'); if (t) return t
  const data = {
    kode: teks(f, 'kode'),
    kelompok: teks(f, 'kelompok'),
    klausul_kode: teks(f, 'klausul_kode'),
    nama: teks(f, 'nama'),
    nomor_dokumen: teks(f, 'nomor_dokumen'),
    pic: teks(f, 'pic'),
    status: teks(f, 'status') ?? 'belum',
    tenggat: teks(f, 'tenggat'),
    tanggal_terima: teks(f, 'tanggal_terima'),
    keterangan: teks(f, 'keterangan'),
  }
  if (!data.kode || !data.nama || !data.klausul_kode || !data.kelompok) return { ok: false, pesan: 'Kode, nama, klausul, dan kelompok wajib diisi.' }
  const q = id
    ? (await db()).from('dokumen_audit').update(data).eq('id', id).select('id').single()
    : (await db()).from('dokumen_audit').insert(data).select('id').single()
  const { data: row, error } = await q
  revalidatePath('/', 'layout')
  return error ? gagal(error) : { ok: true, id: row.id }
}

export async function hapusDokumen(id: string): Promise<Hasil> {
  const t = await tolak('dokumen.hapus'); if (t) return t
  const s = await db()
  const { data: berkas } = await s.from('berkas').select('path').eq('dokumen_id', id)
  const { error } = await s.from('dokumen_audit').delete().eq('id', id)
  // Berkas evidence ikut dibersihkan agar tidak jadi objek yatim di bucket
  if (!error && berkas?.length) {
    const paths = berkas.map((b) => b.path)
    await s.storage.from(BUCKET_BUKTI).remove(paths)
    await s.from('berkas').delete().in('path', paths)
  }
  revalidatePath('/', 'layout')
  return gagal(error)
}

// ---------- Berkas evidence (Supabase Storage) ----------

/** Nama aman untuk key objek Storage: tanpa spasi/aksen, tetap terbaca. */
const namaAman = (n: string) => n.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(-120) || 'berkas'

/** Berkas + signed URL untuk penampil di tabel kesiapan (semua peran yang login boleh melihat; RLS menjaga). */
export async function lihatBerkas(dokumenId: string): Promise<Hasil & { berkas?: BerkasTampil[] }> {
  try {
    const { berkas } = await ambilBerkas(dokumenId)
    return { ok: true, berkas }
  } catch (e) {
    return { ok: false, pesan: e instanceof Error ? e.message : 'Gagal memuat berkas.' }
  }
}

/** Langkah 1 unggah: server membuat signed upload URL; browser lalu mengunggah langsung ke Storage (tidak lewat server Next). */
export async function siapkanUnggah(dokumenId: string, nama: string, ukuran: number): Promise<Hasil & { path?: string; token?: string }> {
  const t = await tolak('dokumen.ubah'); if (t) return t
  if (ukuran > UKURAN_MAKS_BUKTI) return { ok: false, pesan: `${nama} melebihi batas ${UKURAN_MAKS_BUKTI / 1024 / 1024} MB.` }
  const path = `${dokumenId}/${randomUUID()}-${namaAman(nama)}`
  const { data, error } = await (await db()).storage.from(BUCKET_BUKTI).createSignedUploadUrl(path)
  return error ? gagal(error) : { ok: true, path: data.path, token: data.token }
}

/** Langkah 2 unggah: catat metadata setelah berkas masuk ke Storage. */
export async function catatBerkas(dokumenId: string, b: { path: string; nama_file: string; mime: string; ukuran: number }): Promise<Hasil> {
  const t = await tolak('dokumen.ubah'); if (t) return t
  if (!b.path.startsWith(`${dokumenId}/`)) return { ok: false, pesan: 'Path berkas tidak sesuai dokumen.' }
  const { error } = await (await db()).from('berkas').insert({ dokumen_id: dokumenId, path: b.path, nama_file: b.nama_file, mime: b.mime || null, ukuran: b.ukuran, folder: 'Evidence' })
  revalidatePath('/', 'layout')
  return gagal(error)
}

export async function hapusBerkas(id: string): Promise<Hasil> {
  const t = await tolak('dokumen.ubah'); if (t) return t
  const s = await db()
  const { data: b, error: e1 } = await s.from('berkas').select('path').eq('id', id).maybeSingle()
  if (e1 || !b) return { ok: false, pesan: e1?.message ?? 'Berkas tidak ditemukan.' }
  const { error: e2 } = await s.storage.from(BUCKET_BUKTI).remove([b.path])
  if (e2) return gagal(e2)
  const { error } = await s.from('berkas').delete().eq('id', id)
  revalidatePath('/', 'layout')
  return gagal(error)
}

// ---------- Energi ----------

export async function simpanEnergi(tahun: number, bulan: number, sumber_kode: string, nilai: number | null): Promise<Hasil> {
  const t = await tolak('energi.ubah'); if (t) return t
  const s = await db()
  const { error } = nilai === null
    ? await s.from('energi_bulanan').delete().match({ tahun, bulan, sumber_kode })
    : await s.from('energi_bulanan').upsert({ tahun, bulan, sumber_kode, nilai, diubah_at: new Date().toISOString() })
  revalidatePath('/energi')
  revalidatePath('/')
  return gagal(error)
}

// ---------- Kinerja energi: variabel relevan & EnPI ----------

const bulanKeTanggal = (v: string | null) => (v && /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : v)
const daftar = (f: FormData, k: string) => f.getAll(k).filter((v): v is string => typeof v === 'string' && !!v)

function revalidasiKinerja() {
  revalidatePath('/kinerja')
  revalidatePath('/sasaran')
  revalidatePath('/')
}

export async function simpanVariabelBulanan(tahun: number, bulan: number, variabel_kode: string, nilai: number | null): Promise<Hasil> {
  const t = await tolak('energi.ubah'); if (t) return t
  const s = await db()
  const { error } = nilai === null
    ? await s.from('variabel_bulanan').delete().match({ tahun, bulan, variabel_kode })
    : await s.from('variabel_bulanan').upsert({ tahun, bulan, variabel_kode, nilai, diubah_at: new Date().toISOString() })
  revalidasiKinerja()
  return gagal(error)
}

export async function simpanVariabel(kodeLama: string | null, f: FormData): Promise<Hasil> {
  const t = await tolak(kodeLama ? 'enpi.ubah' : 'enpi.tambah'); if (t) return t
  const data = { kode: teks(f, 'kode')?.toLowerCase(), nama: teks(f, 'nama'), satuan: teks(f, 'satuan'), keterangan: teks(f, 'keterangan'), urutan: bil(f, 'urutan') ?? 0 }
  if (!data.kode || !data.nama || !data.satuan) return { ok: false, pesan: 'Kode, nama, dan satuan wajib diisi.' }
  if (!/^[a-z0-9_]+$/.test(data.kode)) return { ok: false, pesan: 'Kode hanya huruf kecil, angka, dan garis bawah (mis. air_olahan).' }
  const { error } = kodeLama
    ? await (await db()).from('variabel_relevan').update(data).eq('kode', kodeLama)
    : await (await db()).from('variabel_relevan').insert(data)
  revalidasiKinerja()
  return gagal(error && { message: /duplicate key/.test(error.message) ? 'Kode variabel sudah dipakai.' : error.message })
}

export async function hapusVariabel(kode: string): Promise<Hasil> {
  const t = await tolak('enpi.hapus'); if (t) return t
  const { error } = await (await db()).from('variabel_relevan').delete().eq('kode', kode)
  revalidasiKinerja()
  return gagal(error)
}

export async function simpanEnpi(kodeLama: string | null, f: FormData): Promise<Hasil> {
  const t = await tolak(kodeLama ? 'enpi.ubah' : 'enpi.tambah'); if (t) return t
  const metode = teks(f, 'metode')
  const data = {
    kode: teks(f, 'kode')?.toUpperCase(), nama: teks(f, 'nama'), metode,
    sumber_kode: daftar(f, 'sumber_kode'),
    variabel_kode: metode === 'absolut' ? [] : daftar(f, 'variabel_kode'),
    baseline_mulai: bulanKeTanggal(teks(f, 'baseline_mulai')), baseline_selesai: bulanKeTanggal(teks(f, 'baseline_selesai')),
    alasan_baseline: teks(f, 'alasan_baseline'), catatan: teks(f, 'catatan'),
    aktif: f.get('aktif') === 'on', urutan: bil(f, 'urutan') ?? 0, diubah_at: new Date().toISOString(),
  }
  if (!data.kode || !data.nama || !data.metode || !data.baseline_mulai || !data.baseline_selesai) return { ok: false, pesan: 'Kode, nama, metode, dan periode baseline wajib diisi.' }
  if (!data.sumber_kode.length) return { ok: false, pesan: 'Pilih minimal satu sumber energi dalam ruang lingkup.' }
  if (data.baseline_selesai < data.baseline_mulai) return { ok: false, pesan: 'Akhir baseline harus sesudah awal baseline.' }
  if (metode === 'rasio' && data.variabel_kode.length !== 1) return { ok: false, pesan: 'Metode rasio memakai tepat satu variabel relevan.' }
  if (metode === 'regresi' && !data.variabel_kode.length) return { ok: false, pesan: 'Metode regresi butuh minimal satu variabel relevan.' }
  if (kodeLama) {
    // Penyesuaian baseline (6.5) wajib tercatat: periode atau metode berubah berarti alasannya juga harus diperbarui
    const { data: lama } = await (await db()).from('enpi').select('baseline_mulai, baseline_selesai, metode, alasan_baseline').eq('kode', kodeLama).maybeSingle()
    const berubah = lama && (lama.baseline_mulai !== data.baseline_mulai || lama.baseline_selesai !== data.baseline_selesai || lama.metode !== data.metode)
    if (berubah && (data.alasan_baseline ?? '') === (lama.alasan_baseline ?? '')) return { ok: false, pesan: 'Periode atau metode baseline berubah: perbarui alasan baseline untuk mencatat penyesuaian (klausul 6.5).' }
  }
  const { error } = kodeLama
    ? await (await db()).from('enpi').update(data).eq('kode', kodeLama)
    : await (await db()).from('enpi').insert(data)
  revalidasiKinerja()
  return gagal(error && { message: /duplicate key/.test(error.message) ? 'Kode EnPI sudah dipakai.' : error.message })
}

export async function hapusEnpi(kode: string): Promise<Hasil> {
  const t = await tolak('enpi.hapus'); if (t) return t
  const { error } = await (await db()).from('enpi').delete().eq('kode', kode)
  revalidasiKinerja()
  return gagal(error)
}

// ---------- Sasaran & rencana aksi ----------

export async function simpanSasaran(id: number | null, f: FormData): Promise<Hasil> {
  const t = await tolak(id ? 'sasaran.ubah' : 'sasaran.tambah'); if (t) return t
  const data = {
    kode: teks(f, 'kode'), uraian: teks(f, 'uraian'), enpi_kode: teks(f, 'enpi_kode'),
    target_persen: bil(f, 'target_persen'), tahun_target: bil(f, 'tahun_target'),
    pic: teks(f, 'pic'), status: teks(f, 'status') ?? 'Aktif', catatan: teks(f, 'catatan'),
    diubah_at: new Date().toISOString(),
  }
  if (!data.kode || !data.uraian) return { ok: false, pesan: 'Kode dan uraian sasaran wajib diisi.' }
  if (data.enpi_kode && (data.target_persen === null || data.tahun_target === null)) return { ok: false, pesan: 'Sasaran yang terkait EnPI butuh target (%) dan tahun target agar dapat diukur.' }
  const { error } = id ? await (await db()).from('sasaran').update(data).eq('id', id) : await (await db()).from('sasaran').insert(data)
  revalidasiKinerja()
  return gagal(error && { message: /duplicate key/.test(error.message) ? 'Kode sasaran sudah dipakai.' : error.message })
}

export async function hapusSasaran(id: number): Promise<Hasil> {
  const t = await tolak('sasaran.hapus'); if (t) return t
  const { error } = await (await db()).from('sasaran').delete().eq('id', id)
  revalidasiKinerja()
  return gagal(error)
}

export async function simpanAksi(id: number | null, f: FormData): Promise<Hasil> {
  const t = await tolak('aksi.ubah'); if (t) return t
  const data = {
    kode: teks(f, 'kode'), uraian: teks(f, 'uraian'), sasaran_id: bil(f, 'sasaran_id'), peluang_kode: teks(f, 'peluang_kode'),
    pic: teks(f, 'pic'), sumber_daya: teks(f, 'sumber_daya'), mulai: teks(f, 'mulai'), tenggat: teks(f, 'tenggat'),
    estimasi_hemat_kwh: bil(f, 'estimasi_hemat_kwh'), metode_verifikasi: teks(f, 'metode_verifikasi'),
    status: teks(f, 'status') ?? 'Rencana', hemat_terverifikasi_kwh: bil(f, 'hemat_terverifikasi_kwh'),
    tanggal_verifikasi: teks(f, 'tanggal_verifikasi'), catatan: teks(f, 'catatan'), diubah_at: new Date().toISOString(),
  }
  if (!data.kode || !data.uraian) return { ok: false, pesan: 'Kode dan uraian aksi wajib diisi.' }
  if (data.hemat_terverifikasi_kwh !== null && !data.tanggal_verifikasi) return { ok: false, pesan: 'Isi tanggal verifikasi untuk penghematan terverifikasi.' }
  const { error } = id ? await (await db()).from('rencana_aksi').update(data).eq('id', id) : await (await db()).from('rencana_aksi').insert(data)
  revalidasiKinerja()
  return gagal(error && { message: /duplicate key/.test(error.message) ? 'Kode aksi sudah dipakai.' : error.message })
}

export async function ubahStatusAksi(id: number, status: StatusAksi): Promise<Hasil> {
  const t = await tolak('aksi.ubah'); if (t) return t
  const { error } = await (await db()).from('rencana_aksi').update({ status, diubah_at: new Date().toISOString() }).eq('id', id)
  revalidasiKinerja()
  return gagal(error)
}

export async function hapusAksi(id: number): Promise<Hasil> {
  const t = await tolak('sasaran.hapus'); if (t) return t
  const { error } = await (await db()).from('rencana_aksi').delete().eq('id', id)
  revalidasiKinerja()
  return gagal(error)
}

// ---------- Timeline ----------

export async function ubahStatusKegiatan(no: number, status: StatusKegiatan): Promise<Hasil> {
  const t = await tolak('kegiatan.ubah'); if (t) return t
  const { error } = await (await db()).from('kegiatan')
    .update({ status, selesai_at: status === 'selesai' ? new Date().toISOString() : null }).eq('no', no)
  revalidatePath('/timeline')
  revalidatePath('/')
  return gagal(error)
}

// ---------- Isu & peluang ----------

export async function simpanIsu(id: number | null, f: FormData): Promise<Hasil> {
  const t = await tolak('register.ubah'); if (t) return t
  const data = {
    asal: teks(f, 'asal'), jenis: teks(f, 'jenis'), uraian: teks(f, 'uraian'),
    dampak: bil(f, 'dampak'), kemungkinan: bil(f, 'kemungkinan'),
    tindakan: teks(f, 'tindakan'), evaluasi: teks(f, 'evaluasi'), pic: teks(f, 'pic'),
    diubah_at: new Date().toISOString(),
  }
  if (!data.uraian || !data.dampak || !data.kemungkinan) return { ok: false, pesan: 'Uraian, dampak, dan kemungkinan wajib diisi.' }
  const { error } = id ? await (await db()).from('isu').update(data).eq('id', id) : await (await db()).from('isu').insert(data)
  revalidatePath('/register')
  return gagal(error)
}

export async function hapusIsu(id: number): Promise<Hasil> {
  const t = await tolak('register.hapus'); if (t) return t
  const { error } = await (await db()).from('isu').delete().eq('id', id)
  revalidatePath('/register')
  return gagal(error)
}

export async function simpanPeluang(kode: string, f: FormData): Promise<Hasil> {
  const t = await tolak('register.ubah'); if (t) return t
  const data = {
    kode: teks(f, 'kode') ?? kode, uraian: teks(f, 'uraian'), variabel: teks(f, 'variabel'), metode: teks(f, 'metode'),
    pemilik: teks(f, 'pemilik'), skor_energi: bil(f, 'skor_energi'), skor_roi: bil(f, 'skor_roi'),
    estimasi_kwh: bil(f, 'estimasi_kwh'), status: teks(f, 'status') ?? 'Belum dinilai', diubah_at: new Date().toISOString(),
  }
  if (!data.uraian) return { ok: false, pesan: 'Uraian peluang wajib diisi.' }
  const { error } = kode
    ? await (await db()).from('peluang').update(data).eq('kode', kode)
    : await (await db()).from('peluang').insert(data)
  revalidatePath('/register')
  return gagal(error)
}

// ---------- Temuan ----------

export async function simpanTemuan(id: string | null, f: FormData): Promise<Hasil> {
  const t = await tolak(id ? 'temuan.ubah' : 'temuan.tambah'); if (t) return t
  const data = {
    nomor: teks(f, 'nomor'), jenis_audit: teks(f, 'jenis_audit'), tanggal: teks(f, 'tanggal'),
    klausul_kode: teks(f, 'klausul_kode'), kategori: teks(f, 'kategori'), uraian: teks(f, 'uraian'),
    bukti: teks(f, 'bukti'), auditor: teks(f, 'auditor'), auditee: teks(f, 'auditee'),
    akar_masalah: teks(f, 'akar_masalah'), tindakan: teks(f, 'tindakan'), pic: teks(f, 'pic'),
    tenggat: teks(f, 'tenggat'), status: teks(f, 'status') ?? 'Terbuka', dokumen_id: teks(f, 'dokumen_id'),
    diubah_at: new Date().toISOString(),
  }
  if (!data.nomor || !data.uraian || !data.kategori || !data.jenis_audit) return { ok: false, pesan: 'Nomor, jenis audit, kategori, dan uraian wajib diisi.' }
  const { error } = id ? await (await db()).from('temuan').update(data).eq('id', id) : await (await db()).from('temuan').insert(data)
  revalidatePath('/temuan')
  revalidatePath('/')
  return gagal(error)
}

export async function ubahStatusTemuan(id: string, status: string): Promise<Hasil> {
  const t = await tolak(status === 'Tertutup' ? 'temuan.tutup' : 'temuan.ubah'); if (t) return t
  const { error } = await (await db()).from('temuan').update({ status, diubah_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/temuan')
  revalidatePath('/')
  return gagal(error)
}

export async function hapusTemuan(id: string): Promise<Hasil> {
  const t = await tolak('temuan.hapus'); if (t) return t
  const { error } = await (await db()).from('temuan').delete().eq('id', id)
  revalidatePath('/temuan')
  return gagal(error)
}

// ---------- Formulir ----------

const BATAS_ISI = 1_500_000 // karakter JSON per isian

/** Pastikan isian hanya berisi string dengan bentuk sesuai templat. */
function rapikanIsi(kode: string, isi: IsiFormulir): IsiFormulir | null {
  const t = ambilTemplat(kode)
  if (!t) return null
  const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 20_000) : '')
  const s = selaraskan(t, isi)
  return {
    kepala: Object.fromEntries(Object.entries(s.kepala).map(([k, v]) => [k, str(v)])),
    teks: Object.fromEntries(Object.entries(s.teks).map(([k, v]) => [k, str(v)])),
    tabel: Object.fromEntries(Object.entries(s.tabel).map(([k, rows]) => [k, rows.slice(0, 500).map((r) => r.map(str))])),
    ttd: s.ttd.map((x) => ({ nama: str(x?.nama), tanggal: str(x?.tanggal) })),
  }
}

export async function buatIsian(kode: string, f: FormData): Promise<Hasil & { id?: string }> {
  const t0 = await tolak('formulir.isi'); if (t0) return t0
  const t = ambilTemplat(kode)
  if (!t) return { ok: false, pesan: 'Templat formulir tidak ditemukan.' }
  const varian = teks(f, 'varian')
  if (t.varian?.length && (!varian || !t.varian.some((v) => v.nama === varian))) return { ok: false, pesan: 'Pilih bagian terlebih dahulu.' }
  const periode = teks(f, 'periode')
  const salin = teks(f, 'salin')
  let isi = isiAwal(t, varian)
  if (salin) {
    const lama = await ambilIsian(salin)
    if (!lama || lama.isian.templat_kode !== kode) return { ok: false, pesan: 'Isian sumber tidak ditemukan.' }
    isi = selaraskan(t, lama.isian.isi)
    isi.ttd = t.ttd.map(() => ({ nama: '', tanggal: '' }))
  }
  // Tabel tertaut selalu diambil dari data terkini, juga saat menyalin isian lama
  Object.assign(isi.tabel, await tabelDariData(kode))
  if (periode) {
    const k = t.kepala.find((x) => /^periode$/i.test(x.label))
    if (k) isi.kepala[k.label] = periode
  }
  const judul = teks(f, 'judul') ?? [t.judul, varian, periode].filter(Boolean).join(' · ')
  const { data, error } = await (await db()).from('formulir_isian')
    .insert({ templat_kode: kode, judul, varian, periode, isi }).select('id').single()
  revalidatePath('/formulir', 'layout')
  return error ? gagal(error) : { ok: true, id: data.id }
}

/** Simpan isian. `versi` = diubah_at saat isian dimuat; bila berbeda, ada orang lain yang menyimpan lebih dulu. */
export async function simpanIsian(id: string, kode: string, versi: string, data: { judul: string; periode: string | null; isi: IsiFormulir }): Promise<Hasil & { versi?: string; bentrok?: boolean }> {
  const t0 = await tolak('formulir.isi'); if (t0) return t0
  const isi = rapikanIsi(kode, data.isi)
  if (!isi) return { ok: false, pesan: 'Templat formulir tidak ditemukan.' }
  if (JSON.stringify(isi).length > BATAS_ISI) return { ok: false, pesan: 'Isian terlalu besar untuk disimpan. Pecah menjadi beberapa isian.' }
  const judul = data.judul.trim()
  if (!judul) return { ok: false, pesan: 'Judul isian wajib diisi.' }
  const s = await db()
  const { data: row, error } = await s.from('formulir_isian')
    .update({ judul, periode: data.periode?.trim() || null, isi }).eq('id', id).eq('templat_kode', kode).eq('diubah_at', versi)
    .select('diubah_at').maybeSingle<{ diubah_at: string }>()
  if (error) return gagal(error)
  if (!row) {
    const { data: kini } = await s.from('formulir_isian').select('diubah_at, diubah_oleh').eq('id', id).maybeSingle<{ diubah_at: string; diubah_oleh: string | null }>()
    if (kini && kini.diubah_at !== versi) {
      return { ok: false, bentrok: true, pesan: `Isian ini baru saja disimpan oleh ${kini.diubah_oleh ?? 'pengguna lain'}. Salin perubahan Anda, lalu muat ulang halaman.` }
    }
    return { ok: false, pesan: 'Perubahan tidak tersimpan: tidak punya akses atau isian tidak ditemukan.' }
  }
  revalidatePath(`/formulir/${kode}`)
  return { ok: true, versi: row.diubah_at }
}

export async function ubahStatusIsian(id: string, status: StatusFormulir): Promise<Hasil & { catatan?: string }> {
  const s0 = await db()
  const { data: lama } = await s0.from('formulir_isian').select('status, templat_kode').eq('id', id).maybeSingle<{ status: StatusFormulir; templat_kode: string }>()
  if (!lama) return { ok: false, pesan: 'Isian tidak ditemukan.' }
  const t = await tolak(status === 'disetujui' || lama.status === 'disetujui' ? 'formulir.setujui' : 'formulir.isi'); if (t) return t
  const { data, error } = await s0.from('formulir_isian').update({ status }).eq('id', id).select('id')
  revalidatePath('/formulir', 'layout')
  if (!error && !data?.length) return { ok: false, pesan: 'Status tidak berubah: tidak punya akses.' }
  if (error) return gagal(error)
  const catatan = await naikkanDokumenTertaut(lama.templat_kode, status)
  revalidatePath('/', 'layout')
  return catatan ? { ok: true, catatan } : { ok: true }
}

/**
 * Selaraskan lembar Kesiapan Audit: isian diajukan → dokumen tertaut minimal Review,
 * isian disetujui → minimal Disetujui. Status dokumen tidak pernah diturunkan otomatis.
 * Mengembalikan pesan bila dokumen gagal diperbarui.
 */
async function naikkanDokumenTertaut(templatKode: string, ke: StatusFormulir): Promise<string | null> {
  const kode = DOKUMEN_TEMPLAT[templatKode]
  const target: StatusDokumen | null = ke === 'disetujui' ? 'disetujui' : ke === 'diajukan' ? 'review' : null
  if (!kode || !target) return null
  const s = await db()
  const { data: d } = await s.from('dokumen_audit').select('id, status').eq('kode', kode).maybeSingle<{ id: string; status: StatusDokumen }>()
  if (!d || STATUS[d.status].bobot >= STATUS[target].bobot) return null
  const { error } = await s.from('dokumen_audit').update({ status: target }).eq('id', d.id)
  return error ? `Status isian sudah berubah, tetapi dokumen ${kode} di Kesiapan Audit gagal diperbarui: ${error.message}` : null
}

/** Muat ulang tabel tertaut isian dari data aplikasi terkini. Hanya untuk isian yang belum disetujui. */
export async function segarkanDataIsian(id: string): Promise<Hasil & { versi?: string }> {
  const t0 = await tolak('formulir.isi'); if (t0) return t0
  const r = await ambilIsian(id)
  if (!r) return { ok: false, pesan: 'Isian tidak ditemukan.' }
  if (r.isian.status === 'disetujui') return { ok: false, pesan: 'Isian sudah disetujui. Kembalikan ke draf untuk memuat ulang data.' }
  if (!TABEL_TERTAUT[r.isian.templat_kode]) return { ok: false, pesan: 'Formulir ini tidak punya tabel yang diambil dari data aplikasi.' }
  const isi = rapikanIsi(r.isian.templat_kode, { ...r.isian.isi, tabel: { ...r.isian.isi.tabel, ...(await tabelDariData(r.isian.templat_kode)) } })
  if (!isi) return { ok: false, pesan: 'Templat formulir tidak ditemukan.' }
  const { data, error } = await (await db()).from('formulir_isian').update({ isi }).eq('id', id).select('diubah_at').maybeSingle<{ diubah_at: string }>()
  if (error) return gagal(error)
  if (!data) return { ok: false, pesan: 'Data tidak dimuat ulang: tidak punya akses.' }
  revalidatePath(`/formulir/isian/${id}`)
  return { ok: true, versi: data.diubah_at }
}

export async function hapusIsian(id: string): Promise<Hasil> {
  const t = await tolak('formulir.hapus'); if (t) return t
  const { data, error } = await (await db()).from('formulir_isian').delete().eq('id', id).select('id')
  revalidatePath('/formulir', 'layout')
  if (!error && !data?.length) return { ok: false, pesan: 'Isian tidak terhapus: tidak punya akses.' }
  return gagal(error)
}

// ---------- Sesi & pengguna ----------

const KUKI = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 60 * 60 }

export async function masuk(_: unknown, f: FormData): Promise<{ pesan: string } | undefined> {
  const email = teks(f, 'email'), sandi = f.get('sandi')
  if (!email || typeof sandi !== 'string' || !sandi) return { pesan: 'Isi email dan sandi.' }
  const { data, error } = await (await db('')).rpc('masuk', { p_email: email, p_sandi: sandi })
  if (error) return { pesan: /function .*masuk|Could not find/i.test(error.message) ? 'Login belum disiapkan: jalankan migrasi 0006_login_peran.sql.' : error.message }
  if (!data?.token) return { pesan: data?.galat ?? 'Gagal masuk.' }
  ;(await cookies()).set(COOKIE_SESI, data.token, KUKI)
  const tujuan = teks(f, 'lanjut')
  redirect(tujuan?.startsWith('/') && !tujuan.startsWith('//') ? tujuan : '/')
}

export async function keluar(): Promise<void> {
  await (await db()).rpc('keluar')
  ;(await cookies()).delete(COOKIE_SESI)
  redirect('/masuk')
}

export async function gantiSandi(_: unknown, f: FormData): Promise<{ pesan: string; ok?: boolean } | undefined> {
  const lama = f.get('lama'), baru = f.get('baru'), ulang = f.get('ulang')
  if (typeof lama !== 'string' || typeof baru !== 'string' || !lama || !baru) return { pesan: 'Isi semua kolom.' }
  if (baru !== ulang) return { pesan: 'Konfirmasi sandi baru tidak sama.' }
  if (baru.length < 8) return { pesan: 'Sandi baru minimal 8 karakter.' }
  const { error } = await (await db()).rpc('ganti_sandi', { p_lama: lama, p_baru: baru })
  if (error) return { pesan: error.message }
  redirect('/')
}

export async function tambahPengguna(f: FormData): Promise<Hasil> {
  const t = await tolak('pengguna.kelola'); if (t) return t
  const { error } = await (await db()).rpc('tambah_pengguna', {
    p_email: teks(f, 'email') ?? '', p_nama: teks(f, 'nama') ?? '', p_peran: teks(f, 'peran') ?? '', p_sandi: f.get('sandi') ?? '',
  })
  revalidatePath('/pengguna')
  return gagal(error && { message: /duplicate key/.test(error.message) ? 'Email sudah terdaftar.' : error.message })
}

export async function ubahPengguna(id: string, f: FormData): Promise<Hasil> {
  const t = await tolak('pengguna.kelola'); if (t) return t
  const { error } = await (await db()).rpc('ubah_pengguna', {
    p_id: id, p_nama: teks(f, 'nama') ?? '', p_peran: teks(f, 'peran') ?? '', p_aktif: f.get('aktif') === 'on',
  })
  revalidatePath('/pengguna')
  return gagal(error)
}

export async function aturUlangSandi(id: string, sandi: string): Promise<Hasil> {
  const t = await tolak('pengguna.kelola'); if (t) return t
  const { error } = await (await db()).rpc('atur_ulang_sandi', { p_id: id, p_sandi: sandi })
  return gagal(error)
}
