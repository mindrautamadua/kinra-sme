'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Aksi } from '@/lib/akses'
import { cekAkses } from '@/lib/sesi'
import { COOKIE_SESI, db } from '@/lib/supabase'
import type { StatusAksi, StatusDokumen, StatusKegiatan } from '@/lib/types'

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
    link_eksternal: teks(f, 'link_eksternal'),
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
  const { error } = await (await db()).from('dokumen_audit').delete().eq('id', id)
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
