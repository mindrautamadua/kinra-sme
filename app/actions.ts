'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Aksi } from '@/lib/akses'
import { ambilBerkas } from '@/lib/data'
import { cekAkses } from '@/lib/sesi'
import { COOKIE_SESI, db } from '@/lib/supabase'
import { BUCKET_BUKTI, UKURAN_MAKS_BUKTI } from '@/lib/status'
import type { BerkasTampil, StatusAksi, StatusDokumen, StatusKegiatan } from '@/lib/types'
import { ambilIsian, ambilTemplat } from '@/lib/formulir/data'
import { isiAwal, selaraskan } from '@/lib/formulir/isi'
import { tabelDariData } from '@/lib/formulir/sumber-data'
import { TABEL_TERTAUT } from '@/lib/formulir/tautan'
import type { IsiFormulir, StatusFormulir } from '@/lib/formulir/tipe'
import { POLA_KUNCI, tagUsulan } from '@/lib/usulan-sasaran'

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

export async function simpanDokumen(id: string | null, f: FormData): Promise<Hasil & { id?: string }> {
  const t = await tolak(id ? 'dokumen.ubah' : 'dokumen.tambah'); if (t) return t
  const data = {
    kode: teks(f, 'kode'),
    kelompok: teks(f, 'kelompok'),
    klausul_kode: teks(f, 'klausul_kode'),
    nama: teks(f, 'nama'),
    nomor_dokumen: teks(f, 'nomor_dokumen'),
    pic: teks(f, 'pic'),
    tenggat: teks(f, 'tenggat'),
    tanggal_terima: teks(f, 'tanggal_terima'),
    keterangan: teks(f, 'keterangan'),
  }
  if (!data.kode || !data.nama || !data.klausul_kode || !data.kelompok) return { ok: false, pesan: 'Kode, nama, klausul, dan kelompok wajib diisi.' }
  // Penanda wajib ISO hanya ditetapkan admin/konsultan ('dokumen.wajib'); peran lain tidak mengubahnya
  const isi: Record<string, unknown> = { ...data }
  if (f.has('wajib_iso_ada') && !(await cekAkses('dokumen.wajib'))) isi.wajib_iso = f.get('wajib_iso') === 'on'
  const kirim = (v: Record<string, unknown>) => id
    ? db().then((s) => s.from('dokumen_audit').update(v).eq('id', id).select('id').single())
    : db().then((s) => s.from('dokumen_audit').insert(v).select('id').single())
  let { data: row, error } = await kirim(isi)
  // Kolom wajib_iso belum ada (migrasi 0015 belum dijalankan): simpan tanpa penanda
  if (error?.code === 'PGRST204' && 'wajib_iso' in isi) ({ data: row, error } = await kirim(data))
  if (!id && error?.code === '42501') return { ok: false, pesan: 'Database menolak penambahan dokumen. Bila Anda Tim KINRA, jalankan migrasi 0021_tim_kinra_tambah_dokumen.sql terlebih dahulu.' }
  revalidatePath('/', 'layout')
  return error || !row ? gagal(error) : { ok: true, id: row.id }
}

/** Catatan cepat dari lembar Kesiapan: posisi draf dan keterangan. Pengubah & waktu dicatat trigger 0018. */
export async function simpanCatatanDokumen(id: string, posisiDraf: string, keterangan: string): Promise<Hasil> {
  const t = await tolak('dokumen.ubah'); if (t) return t
  const rapi = (v: string, maks: number) => v.trim().slice(0, maks) || null
  const s = await db()
  const { error } = await s.from('dokumen_audit')
    .update({ posisi_draf: rapi(posisiDraf, 120), keterangan: rapi(keterangan, 1000) }).eq('id', id)
  if (error?.code === 'PGRST204') return { ok: false, pesan: 'Kolom posisi draf belum ada. Jalankan migrasi 0018_catatan_kesiapan.sql terlebih dahulu.' }
  revalidatePath('/', 'layout')
  return gagal(error)
}

/** PIC dokumen dari lembar Kesiapan. Boleh diubah semua peran penulis (admin, konsultan, Tim KINRA). */
export async function simpanPicDokumen(id: string, pic: string): Promise<Hasil> {
  const t = await tolak('dokumen.ubah'); if (t) return t
  const { data, error } = await (await db()).from('dokumen_audit')
    .update({ pic: pic.trim().slice(0, 120) || null }).eq('id', id).select('id')
  if (!error && !data?.length) return { ok: false, pesan: 'Dokumen tidak ditemukan atau Anda tidak berhak mengubahnya.' }
  revalidatePath('/', 'layout')
  return gagal(error)
}

/** Status dokumen dari lembar Kesiapan. Belum ada/Draft/Final untuk semua peran penulis; Disetujui hanya admin & konsultan. */
export async function ubahStatusDokumen(id: string, status: StatusDokumen): Promise<Hasil> {
  if (!['belum', 'draft', 'review', 'disetujui', 'final'].includes(status)) return { ok: false, pesan: 'Status tidak dikenal.' }
  const t = await tolak(status === 'disetujui' ? 'dokumen.setujui' : 'dokumen.status'); if (t) return t
  // Mengubah dokumen yang sudah Disetujui hanya admin & konsultan (trigger 0045)
  const lama = (await (await db()).from('dokumen_audit').select('status').eq('id', id).maybeSingle()).data?.status
  if (lama === 'disetujui' && status !== 'disetujui') { const t2 = await tolak('dokumen.setujui'); if (t2) return t2 }
  // Final hanya bila ada berkas versi sah: yang ditunjukkan ke auditor harus dokumen yang sudah sah
  if (status === 'final' || status === 'disetujui') {
    const { count, error: e } = await (await db()).from('berkas').select('id', { count: 'exact', head: true }).eq('dokumen_id', id).eq('sah', true)
    if (e?.code === '42703') return { ok: false, pesan: 'Kolom penanda versi sah belum ada. Jalankan migrasi 0031_berkas_sah.sql di Supabase.' }
    if (!e && !count) return { ok: false, pesan: 'Tandai dulu minimal satu berkas evidence sebagai "Versi sah" (PDF bertanda tangan/disahkan, atau rekaman lengkap), baru status dapat diubah menjadi Final.' }
  }
  const { data, error } = await (await db()).from('dokumen_audit').update({ status }).eq('id', id).select('id')
  if (error?.code === '42501' && status === 'final') return { ok: false, pesan: 'Database belum mengizinkan Tim KINRA menetapkan Final. Jalankan migrasi 0019_status_final_tim_kinra.sql.' }
  if (!error && !data?.length) return { ok: false, pesan: 'Dokumen tidak ditemukan atau Anda tidak berhak mengubahnya.' }
  revalidatePath('/', 'layout')
  return gagal(error)
}

export async function hapusDokumen(id: string): Promise<Hasil> {
  const t = await tolak('dokumen.hapus'); if (t) return t
  const s = await db()
  const { data: berkas } = await s.from('berkas').select('path').eq('dokumen_id', id)
  const { data: terhapus, error } = await s.from('dokumen_audit').delete().eq('id', id).select('id')
  // RLS menolak delete secara diam-diam (0 baris); untuk Tim KINRA berarti migrasi 0020 belum dijalankan
  if (!error && !terhapus?.length) return { ok: false, pesan: 'Dokumen tidak terhapus. Bila Anda Tim KINRA, jalankan migrasi 0020_tim_kinra_hapus_dokumen.sql terlebih dahulu.' }
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
export type EvidenceDokumen = { id: string; kode: string; nama: string; wajib: boolean; status: StatusDokumen; posisiDraf: string | null; berkas: BerkasTampil[] }

/** Daftar dokumen satu klausul beserta berkas evidence-nya (signed URL 1 jam). Dipakai modal di halaman Tanya Jawab. */
export async function evidenceKlausul(kode: string): Promise<Hasil & { judul?: string; dokumen?: EvidenceDokumen[] }> {
  try {
    const s = await db()
    const [k, d] = await Promise.all([
      s.from('klausul').select('judul').eq('kode', kode).maybeSingle<{ judul: string }>(),
      // select('*') agar tetap jalan bila kolom migrasi 0015/0018 belum ada
      s.from('dokumen_audit').select('*').eq('klausul_kode', kode).order('kode'),
    ])
    if (d.error) return { ok: false, pesan: d.error.message }
    const docs = (d.data ?? []) as { id: string; kode: string; nama: string; status: StatusDokumen; wajib_iso?: boolean; posisi_draf?: string | null }[]
    if (!docs.length) return { ok: true, judul: k.data?.judul, dokumen: [] }
    const b = await s.from('berkas').select('*').in('dokumen_id', docs.map((x) => x.id)).order('diunggah_at')
    if (b.error) return { ok: false, pesan: b.error.message }
    const daftar = (b.data ?? []) as BerkasTampil[]
    const { data: tanda } = daftar.length ? await s.storage.from(BUCKET_BUKTI).createSignedUrls(daftar.map((x) => x.path), 3600) : { data: [] }
    const url = new Map((tanda ?? []).map((t) => [t.path, t.signedUrl]))
    return {
      ok: true, judul: k.data?.judul,
      dokumen: docs.map((x) => ({
        id: x.id, kode: x.kode, nama: x.nama, wajib: !!x.wajib_iso, status: x.status, posisiDraf: x.posisi_draf ?? null,
        berkas: daftar.filter((f) => f.dokumen_id === x.id).sort((a, b) => Number(!!b.sah) - Number(!!a.sah)).map((f) => ({ ...f, url: url.get(f.path) ?? null })),
      })),
    }
  } catch (e) {
    return { ok: false, pesan: e instanceof Error ? e.message : 'Gagal memuat evidence.' }
  }
}

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

/** Tandai atau lepas penanda "versi sah" pada satu berkas evidence (migrasi 0031). */
export async function tandaiSah(id: string, sah: boolean): Promise<Hasil & { peringatan?: string }> {
  const t = await tolak('dokumen.ubah'); if (t) return t
  const s = await db()
  const { data, error } = await s.from('berkas').update({ sah }).eq('id', id).select('dokumen_id')
  if (error?.code === '42703' || error?.code === 'PGRST204') return { ok: false, pesan: 'Kolom penanda versi sah belum ada. Jalankan migrasi 0031_berkas_sah.sql di Supabase.' }
  if (error?.code === '42501') return { ok: false, pesan: 'Database belum mengizinkan perubahan penanda. Jalankan migrasi 0031_berkas_sah.sql.' }
  if (!error && !data?.length) return { ok: false, pesan: 'Berkas tidak ditemukan atau Anda tidak berhak mengubahnya.' }
  revalidatePath('/', 'layout')
  if (error) return gagal(error)
  // Melepas penanda terakhir pada item Final: item tidak lagi dihitung siap audit
  if (!sah && data?.[0]?.dokumen_id) {
    const [{ count }, { data: dok }] = await Promise.all([
      s.from('berkas').select('id', { count: 'exact', head: true }).eq('dokumen_id', data[0].dokumen_id).eq('sah', true),
      s.from('dokumen_audit').select('status').eq('id', data[0].dokumen_id).maybeSingle(),
    ])
    if (!count && (dok?.status === 'final' || dok?.status === 'disetujui')) return { ok: true, peringatan: 'Item ini berstatus Final tetapi tidak lagi punya berkas sah, sehingga tidak dihitung siap audit.' }
  }
  return { ok: true }
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

// ---------- Aset, meter energi & bacaan stand (migrasi 0022) ----------

const bulat = (f: FormData, k: string) => { const n = bil(f, k); return n === null ? null : Math.round(n) }

/** Pesan ramah bila migrasi 0022 belum dijalankan. */
function gagalAset(e: { message: string; code?: string } | null): Hasil {
  if (e?.code === 'PGRST205' || e?.code === '42P01') return { ok: false, pesan: 'Tabel aset/meter belum ada. Jalankan migrasi 0022_aset_meter.sql di Supabase.' }
  if (e?.code === '23505') return { ok: false, pesan: 'Kode tersebut sudah dipakai. Gunakan kode lain.' }
  return gagal(e)
}

function revalidasiAset() {
  revalidatePath('/aset')
}

export async function simpanAset(kodeLama: string | null, f: FormData): Promise<Hasil> {
  const t = await tolak('aset.ubah'); if (t) return t
  const data = {
    kode: teks(f, 'kode')?.toUpperCase() ?? null,
    no_urut: bulat(f, 'no_urut') ?? 0,
    nama: teks(f, 'nama'),
    area: teks(f, 'area'),
    luas_m2: bil(f, 'luas_m2'),
    jumlah_lantai: bulat(f, 'jumlah_lantai'),
    jumlah_ruangan: bulat(f, 'jumlah_ruangan'),
    tahun_bangun: bulat(f, 'tahun_bangun'),
    tanggal_bangun: teks(f, 'tanggal_bangun'),
    fungsi: teks(f, 'fungsi'),
    kondisi: teks(f, 'kondisi'),
    luas_ac_m2: bil(f, 'luas_ac_m2'),
    kwh_bulan: bil(f, 'kwh_bulan'),
    biaya_bulan: bil(f, 'biaya_bulan'),
    jam_operasi: teks(f, 'jam_operasi'),
    pic: teks(f, 'pic'),
    catatan: teks(f, 'catatan'),
    diubah_at: new Date().toISOString(),
  }
  if (!data.kode || !data.nama) return { ok: false, pesan: 'Kode dan nama aset wajib diisi.' }
  if (!/^[A-Z0-9-]+$/.test(data.kode)) return { ok: false, pesan: 'Kode hanya boleh huruf, angka, dan tanda hubung (mis. KINRA-AST-041).' }
  const s = await db()
  const { error } = kodeLama
    ? await s.from('aset').update(data).eq('kode', kodeLama)
    : await s.from('aset').insert(data)
  revalidasiAset()
  return gagalAset(error)
}

export async function hapusAset(kode: string): Promise<Hasil> {
  const t = await tolak('aset.hapus'); if (t) return t
  const { data, error } = await (await db()).from('aset').delete().eq('kode', kode).select('kode')
  revalidasiAset()
  if (!error && !data?.length) return { ok: false, pesan: 'Aset tidak terhapus. Peran Anda mungkin belum diizinkan oleh database.' }
  return gagalAset(error)
}

export async function simpanMeter(kodeLama: string | null, f: FormData): Promise<Hasil> {
  const t = await tolak('aset.ubah'); if (t) return t
  const faktor = bil(f, 'faktor_kali')
  const data = {
    kode: teks(f, 'kode')?.toUpperCase() ?? null,
    no_urut: bulat(f, 'no_urut') ?? 0,
    no_meter: teks(f, 'no_meter'),
    jenis: teks(f, 'jenis'),
    sumber_kode: teks(f, 'sumber_kode'),
    lokasi: teks(f, 'lokasi'),
    area_dilayani: teks(f, 'area_dilayani'),
    aset_kode: teks(f, 'aset_kode'),
    beban_diukur: teks(f, 'beban_diukur'),
    pic_area: teks(f, 'pic_area'),
    pic_data: teks(f, 'pic_data'),
    satuan: teks(f, 'satuan') ?? 'kWh',
    faktor_kali: faktor ?? 1,
    kapasitas: teks(f, 'kapasitas'),
    kelas_akurasi: teks(f, 'kelas_akurasi'),
    interval_pembacaan: teks(f, 'interval_pembacaan'),
    frekuensi_pencatatan: teks(f, 'frekuensi_pencatatan'),
    status: teks(f, 'status'),
    kalibrasi_terakhir: teks(f, 'kalibrasi_terakhir'),
    kalibrasi_berikutnya: teks(f, 'kalibrasi_berikutnya'),
    metode_pengiriman: teks(f, 'metode_pengiriman'),
    penyimpanan_data: teks(f, 'penyimpanan_data'),
    kandidat_seu: teks(f, 'kandidat_seu'),
    bukti_pendukung: teks(f, 'bukti_pendukung'),
    catatan: teks(f, 'catatan'),
    diubah_at: new Date().toISOString(),
  }
  if (!data.kode) return { ok: false, pesan: 'Kode meter wajib diisi.' }
  if (!/^[A-Z0-9-]+$/.test(data.kode)) return { ok: false, pesan: 'Kode hanya boleh huruf, angka, dan tanda hubung (mis. KINRA-MTR-008).' }
  if (data.faktor_kali <= 0) return { ok: false, pesan: 'Faktor kali harus lebih dari 0.' }
  const s = await db()
  const { error } = kodeLama
    ? await s.from('meter_energi').update(data).eq('kode', kodeLama)
    : await s.from('meter_energi').insert(data)
  revalidasiAset()
  return gagalAset(error)
}

export async function hapusMeter(kode: string): Promise<Hasil> {
  const t = await tolak('aset.hapus'); if (t) return t
  const { data, error } = await (await db()).from('meter_energi').delete().eq('kode', kode).select('kode')
  revalidasiAset()
  if (!error && !data?.length) return { ok: false, pesan: 'Meter tidak terhapus. Peran Anda mungkin belum diizinkan oleh database.' }
  return gagalAset(error)
}

/** Simpan stand awal/akhir satu meter pada satu bulan. Keduanya kosong = hapus bacaan (kWh tagihan historis tetap disimpan). */
export async function simpanBacaan(meter_kode: string, tahun: number, bulan: number, stand_awal: number | null, stand_akhir: number | null): Promise<Hasil> {
  const t = await tolak('aset.ubah'); if (t) return t
  if ([stand_awal, stand_akhir].some((v) => v !== null && (!Number.isFinite(v) || v < 0))) return { ok: false, pesan: 'Stand meter harus angka 0 atau lebih.' }
  if (stand_awal !== null && stand_akhir !== null && stand_akhir < stand_awal) return { ok: false, pesan: 'Stand akhir lebih kecil dari stand awal. Bila meter diganti atau berputar ulang, isi kWh bulan itu sebagai kWh tagihan dan catat penggantiannya di register meter.' }
  const s = await db()
  if (stand_awal === null && stand_akhir === null) {
    // Baris yang punya kWh tagihan tidak dihapus; cukup kosongkan standnya
    const hapus = await s.from('pembacaan_meter').delete().match({ meter_kode, tahun, bulan }).is('kwh_tagihan', null)
    const kosong = hapus.error ? hapus : await s.from('pembacaan_meter').update({ stand_awal: null, stand_akhir: null }).match({ meter_kode, tahun, bulan })
    revalidasiAset()
    return gagalAset(kosong.error)
  }
  const { error } = await s.from('pembacaan_meter').upsert({ meter_kode, tahun, bulan, stand_awal, stand_akhir })
  revalidasiAset()
  return gagalAset(error)
}

// ---------- Tinjauan energi & register SEU (migrasi 0027) ----------

function gagalSeu(e: { message: string; code?: string } | null): Hasil {
  if (e?.code === 'PGRST205' || e?.code === '42P01') return { ok: false, pesan: 'Tabel SEU belum ada. Jalankan migrasi 0027_tinjauan_energi_seu.sql di Supabase.' }
  if (e?.code === '23505') return { ok: false, pesan: 'Kode SEU sudah dipakai.' }
  return gagal(e)
}

function revalidasiSeu() {
  revalidatePath('/tinjauan')
  revalidatePath('/peta')
  revalidatePath('/')
}

export async function simpanSeu(kodeLama: string | null, f: FormData): Promise<Hasil> {
  const t = await tolak('seu.ubah'); if (t) return t
  const status = teks(f, 'status') ?? 'Kandidat'
  const data = {
    kode: teks(f, 'kode')?.toUpperCase() ?? null,
    nama: teks(f, 'nama'),
    deskripsi: teks(f, 'deskripsi'),
    aset_kode: daftar(f, 'aset_kode'),
    meter_kode: daftar(f, 'meter_kode'),
    sumber_kode: daftar(f, 'sumber_kode'),
    kriteria: daftar(f, 'kriteria'),
    status,
    variabel_kode: daftar(f, 'variabel_kode'),
    enpi_kode: teks(f, 'enpi_kode'),
    pic: teks(f, 'pic'),
    personel: teks(f, 'personel'),
    alasan: teks(f, 'alasan'),
    tinjau_berikutnya: teks(f, 'tinjau_berikutnya'),
    urutan: bulat(f, 'urutan') ?? 0,
  }
  if (!data.kode || !data.nama) return { ok: false, pesan: 'Kode dan nama SEU wajib diisi.' }
  if (!/^[A-Z0-9-]+$/.test(data.kode)) return { ok: false, pesan: 'Kode hanya boleh huruf, angka, dan tanda hubung (mis. SEU-03).' }
  if (!data.aset_kode.length && !data.sumber_kode.length) return { ok: false, pesan: 'Pilih minimal satu aset atau sumber energi yang membentuk SEU ini.' }
  if (!data.kriteria.length) return { ok: false, pesan: 'Pilih minimal satu kriteria penetapan SEU.' }
  if (status === 'Ditetapkan' && !data.alasan) return { ok: false, pesan: 'Tuliskan alasan penetapan SEU; auditor akan menanyakannya.' }
  const s = await db()
  // Perubahan status hanya untuk admin/konsultan (trigger di database tetap menjadi penjaga utama)
  const { data: lama } = kodeLama ? await s.from('seu').select('status').eq('kode', kodeLama).maybeSingle() : { data: null }
  if ((lama ? lama.status !== status : status !== 'Kandidat')) { const t2 = await tolak('seu.tetapkan'); if (t2) return { ok: false, pesan: 'Hanya admin atau konsultan yang dapat menetapkan atau mencabut SEU. Simpan sebagai Kandidat.' } }
  const { error } = kodeLama
    ? await s.from('seu').update(data).eq('kode', kodeLama)
    : await s.from('seu').insert(data)
  revalidasiSeu()
  return gagalSeu(error)
}

export async function hapusSeu(kode: string): Promise<Hasil> {
  const t = await tolak('seu.hapus'); if (t) return t
  const { data, error } = await (await db()).from('seu').delete().eq('kode', kode).select('kode')
  revalidasiSeu()
  if (!error && !data?.length) return { ok: false, pesan: 'SEU tidak terhapus. Peran Anda mungkin belum diizinkan oleh database.' }
  return gagalSeu(error)
}

export async function simpanTinjauan(id: number | null, f: FormData): Promise<Hasil> {
  const t = await tolak('seu.ubah'); if (t) return t
  const status = teks(f, 'status') === 'Disetujui' ? 'Disetujui' : 'Draft'
  const data = {
    periode_mulai: teks(f, 'periode_mulai'),
    periode_selesai: teks(f, 'periode_selesai'),
    ambang_persen: bil(f, 'ambang_persen') ?? 10,
    ambang_kumulatif: bil(f, 'ambang_kumulatif') ?? 80,
    ringkasan: teks(f, 'ringkasan'),
    status,
  }
  if (!data.periode_mulai || !data.periode_selesai) return { ok: false, pesan: 'Periode tinjauan wajib diisi.' }
  if (data.periode_selesai < data.periode_mulai) return { ok: false, pesan: 'Akhir periode harus sesudah awal periode.' }
  const s = await db()
  const { data: lama } = id ? await s.from('tinjauan_energi').select('status').eq('id', id).maybeSingle() : { data: null }
  if ((lama ? lama.status !== status : status !== 'Draft')) { const t2 = await tolak('seu.tetapkan'); if (t2) return { ok: false, pesan: 'Hanya admin atau konsultan yang dapat menyetujui tinjauan energi.' } }
  const { error } = id
    ? await s.from('tinjauan_energi').update(data).eq('id', id)
    : await s.from('tinjauan_energi').insert(data)
  revalidasiSeu()
  return gagalSeu(error)
}

// ---------- Deviasi signifikan (migrasi 0028) ----------

function gagalDeviasi(e: { message: string; code?: string } | null): Hasil {
  if (e?.code === 'PGRST205' || e?.code === '42P01') return { ok: false, pesan: 'Tabel deviasi belum ada. Jalankan migrasi 0028_deviasi.sql di Supabase.' }
  if (e?.code === '23505') return { ok: false, pesan: 'Deviasi ini sudah mulai diselidiki. Muat ulang halaman.' }
  if (e?.code === '42501') return { ok: false, pesan: 'Hanya admin atau konsultan yang dapat menutup atau membuka kembali deviasi.' }
  return gagal(e)
}

const STATUS_DEVIASI = ['Diselidiki', 'Ditanggapi', 'Ditutup', 'Bukan deviasi'] as const
const KATEGORI_DEVIASI = ['operasi', 'kerusakan', 'data', 'variabel', 'aksi', 'lainnya'] as const

/** Simpan penyelidikan deviasi. `id` null = deviasi baru dari hasil deteksi (data deteksi dikirim di `asal`). */
export async function simpanDeviasi(id: number | null, asal: { enpi_kode: string; tahun: number; bulan: number; jenis: string; arah: string; aktual: number | null; harapan: number | null; selisih_persen: number | null } | null, f: FormData): Promise<Hasil> {
  const t = await tolak('deviasi.ubah'); if (t) return t
  const status = teks(f, 'status') ?? 'Diselidiki'
  const kategori = teks(f, 'kategori')
  if (!STATUS_DEVIASI.includes(status as never)) return { ok: false, pesan: 'Status tidak dikenal.' }
  if (kategori && !KATEGORI_DEVIASI.includes(kategori as never)) return { ok: false, pesan: 'Kategori penyebab tidak dikenal.' }
  const isi = {
    status, kategori, penyebab: teks(f, 'penyebab'), tindakan: teks(f, 'tindakan'), pic: teks(f, 'pic'),
    tenggat: teks(f, 'tenggat'), aksi_kode: teks(f, 'aksi_kode'),
  }
  if (status !== 'Diselidiki' && (!isi.kategori || !isi.penyebab)) return { ok: false, pesan: 'Isi kategori dan uraian penyebab sebelum menanggapi atau menutup deviasi.' }
  if (status === 'Ditanggapi' && !isi.tindakan) return { ok: false, pesan: 'Isi tindakan yang diambil.' }
  if ((status === 'Ditutup' || status === 'Bukan deviasi')) { const t2 = await tolak('deviasi.tutup'); if (t2) return { ok: false, pesan: 'Hanya admin atau konsultan yang dapat menutup deviasi atau menyatakan bukan deviasi.' } }
  const s = await db()
  const { error } = id
    ? await s.from('deviasi').update(isi).eq('id', id)
    : asal ? await s.from('deviasi').insert({ ...asal, ...isi }) : { error: { message: 'Data deviasi tidak lengkap.' } }
  revalidatePath('/kinerja')
  revalidatePath('/peta')
  revalidatePath('/')
  return gagalDeviasi(error)
}

// ---------- Parameter konversi rupiah & CO₂ (migrasi 0030) ----------

export async function simpanParameter(kode: string, nilai: number, status: 'Data' | 'Asumsi', sumber: string): Promise<Hasil> {
  const t = await tolak('parameter.ubah'); if (t) return t
  if (!Number.isFinite(nilai) || nilai < 0) return { ok: false, pesan: 'Nilai harus angka 0 atau lebih.' }
  const { data, error } = await (await db()).from('parameter_energi')
    .update({ nilai, status, sumber: sumber.trim() || null, diubah_at: new Date().toISOString() }).eq('kode', kode).select('kode')
  revalidatePath('/', 'layout')
  if (error?.code === 'PGRST205') return { ok: false, pesan: 'Tabel parameter belum ada. Jalankan migrasi 0030_parameter_energi.sql di Supabase.' }
  if (!error && !data?.length) return { ok: false, pesan: 'Parameter tidak ditemukan atau peran Anda belum diizinkan oleh database.' }
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

/** Kolom enpi.utama sudah ada (migrasi 0025)? */
async function adaKolomUtama(s: Awaited<ReturnType<typeof db>>) {
  const { error } = await s.from('enpi').select('utama').limit(1)
  return !error
}

export async function simpanEnpi(kodeLama: string | null, f: FormData): Promise<Hasil> {
  const t = await tolak(kodeLama ? 'enpi.ubah' : 'enpi.tambah'); if (t) return t
  const metode = teks(f, 'metode')
  const data = {
    kode: teks(f, 'kode')?.toUpperCase(), nama: teks(f, 'nama'), metode,
    sumber_kode: daftar(f, 'sumber_kode'),
    meter_kode: daftar(f, 'meter_kode'),
    lingkup: teks(f, 'lingkup') === 'kawasan' ? 'kawasan' : 'kinra',
    variabel_kode: metode === 'absolut' ? [] : daftar(f, 'variabel_kode'),
    baseline_mulai: bulanKeTanggal(teks(f, 'baseline_mulai')), baseline_selesai: bulanKeTanggal(teks(f, 'baseline_selesai')),
    alasan_baseline: teks(f, 'alasan_baseline'), catatan: teks(f, 'catatan'),
    aktif: f.get('aktif') === 'on', utama: f.get('utama') === 'on', urutan: bil(f, 'urutan') ?? 0, diubah_at: new Date().toISOString(),
  }
  if (!data.kode || !data.nama || !data.metode || !data.baseline_mulai || !data.baseline_selesai) return { ok: false, pesan: 'Kode, nama, metode, dan periode baseline wajib diisi.' }
  if (!data.sumber_kode.length) return { ok: false, pesan: 'Pilih minimal satu sumber energi dalam ruang lingkup.' }
  if (teks(f, 'dasar') === 'meter' && !data.meter_kode.length) return { ok: false, pesan: 'Pilih minimal satu meter dalam ruang lingkup EnPI.' }
  if (teks(f, 'dasar') !== 'meter') data.meter_kode = []
  if (data.utama && data.lingkup !== 'kinra') return { ok: false, pesan: 'EnPI utama harus berlingkup KINRA. EnPI kawasan mencakup listrik tenant.' }
  if (data.baseline_selesai < data.baseline_mulai) return { ok: false, pesan: 'Akhir baseline harus sesudah awal baseline.' }
  if (metode === 'rasio' && data.variabel_kode.length !== 1) return { ok: false, pesan: 'Metode rasio memakai tepat satu variabel relevan.' }
  if (metode === 'regresi' && !data.variabel_kode.length) return { ok: false, pesan: 'Metode regresi butuh minimal satu variabel relevan.' }
  if (kodeLama) {
    // Penyesuaian baseline (6.5) wajib tercatat: periode atau metode berubah berarti alasannya juga harus diperbarui
    const { data: lama } = await (await db()).from('enpi').select('baseline_mulai, baseline_selesai, metode, alasan_baseline').eq('kode', kodeLama).maybeSingle()
    const berubah = lama && (lama.baseline_mulai !== data.baseline_mulai || lama.baseline_selesai !== data.baseline_selesai || lama.metode !== data.metode)
    if (berubah && (data.alasan_baseline ?? '') === (lama.alasan_baseline ?? '')) return { ok: false, pesan: 'Periode atau metode baseline berubah: perbarui alasan baseline untuk mencatat penyesuaian (klausul 6.5).' }
  }
  if (data.utama && !data.aktif) return { ok: false, pesan: 'EnPI utama harus aktif dipantau.' }
  const s = await db()
  // Hanya satu EnPI utama: lepaskan penanda dari EnPI lain lebih dulu (indeks unik di migrasi 0025)
  if (data.utama) {
    const { error: e } = await s.from('enpi').update({ utama: false }).eq('utama', true).neq('kode', kodeLama ?? data.kode)
    if (e) return { ok: false, pesan: e.code === 'PGRST204' || e.code === '42703' ? 'Kolom EnPI utama belum ada. Jalankan migrasi 0025_enpi_utama.sql di Supabase.' : e.message }
  }
  // Sebelum migrasi 0025, kolom utama belum ada: simpan tanpa kolom itu bila tidak dicentang
  const isi: Record<string, unknown> = { ...data }
  if (!data.utama) delete isi.utama
  const { error } = kodeLama
    ? await s.from('enpi').update(data.utama ? isi : { ...isi, ...(await adaKolomUtama(s) ? { utama: false } : {}) }).eq('kode', kodeLama)
    : await s.from('enpi').insert(isi)
  revalidasiKinerja()
  if (error?.code === 'PGRST204') return { ok: false, pesan: 'Kolom EnPI baru belum ada. Jalankan migrasi 0025_enpi_utama.sql dan 0026_lingkup_kinra.sql di Supabase.' }
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
  // Aksi dari usulan: tandai dengan [usulan:kode] dan tolak bila usulan yang sama sudah dipakai aksi lain
  const usulan = teks(f, 'usulan')
  if (usulan && POLA_KUNCI.test(usulan)) {
    const tag = tagUsulan(usulan)
    const { data: lain } = await (await db()).from('rencana_aksi').select('id, kode').like('catatan', `%${tag}%`)
    const pakai = (lain ?? []).find((x) => x.id !== id)
    if (pakai) return { ok: false, pesan: `Usulan ini sudah dipakai sebagai ${pakai.kode}. Ubah aksi tersebut alih-alih membuat yang baru.` }
    if (!data.catatan?.includes(tag)) data.catatan = [data.catatan, tag].filter(Boolean).join(' ')
  }
  const { error } = id ? await (await db()).from('rencana_aksi').update(data).eq('id', id) : await (await db()).from('rencana_aksi').insert(data)
  revalidasiKinerja()
  return gagal(error && { message: /duplicate key/.test(error.message) ? 'Kode aksi sudah dipakai.' : error.message })
}

/** Hubungkan beberapa aksi ke sasarannya sekaligus (mis. aksi dari usulan yang dibuat sebelum sasarannya ada) */
export async function hubungkanAksi(pasangan: { id: number; sasaran_id: number }[]): Promise<Hasil> {
  const t = await tolak('aksi.ubah'); if (t) return t
  const klien = await db()
  for (const p of pasangan) {
    if (!Number.isInteger(p.id) || !Number.isInteger(p.sasaran_id)) return { ok: false, pesan: 'Data aksi tidak valid.' }
    const { error } = await klien.from('rencana_aksi').update({ sasaran_id: p.sasaran_id, diubah_at: new Date().toISOString() }).eq('id', p.id)
    if (error) { revalidasiKinerja(); return gagal(error) }
  }
  revalidasiKinerja()
  return { ok: true }
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

/** Keterkaitan kegiatan (klausul, dokumen) dan PICA-nya (migrasi 0034). Daftar dipisah koma. */
export async function simpanKeterkaitanKegiatan(no: number, f: FormData): Promise<Hasil> {
  const t = await tolak('kegiatan.ubah'); if (t) return t
  const pecah = (k: string) => (teks(f, k) ?? '').split(/[,;\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean)
  const klausul = pecah('klausul').map((x) => x.toLowerCase())
  const dokumen_kode = pecah('dokumen_kode')
  if (klausul.some((x) => !/^\d{1,2}(\.\d{1,2})?$/.test(x))) return { ok: false, pesan: 'Format klausul tidak dikenal. Contoh: 6.3, 7.2' }
  const { data: ada } = dokumen_kode.length ? await (await db()).from('dokumen_audit').select('kode').in('kode', dokumen_kode) : { data: [] }
  const tidakAda = dokumen_kode.filter((k) => !(ada ?? []).some((d: { kode: string }) => d.kode === k))
  if (tidakAda.length) return { ok: false, pesan: `Kode dokumen tidak ditemukan di lembar Kesiapan: ${tidakAda.join(', ')}` }
  const { error } = await (await db()).from('kegiatan').update({
    klausul, dokumen_kode, kendala: teks(f, 'kendala'), tindak_lanjut: teks(f, 'tindak_lanjut'),
    tindak_pic: teks(f, 'tindak_pic'), tindak_tenggat: teks(f, 'tindak_tenggat'),
  }).eq('no', no)
  revalidatePath('/timeline')
  revalidatePath('/kesiapan/cetak')
  if (error?.code === 'PGRST204' || error?.code === '42703') return { ok: false, pesan: 'Kolom keterkaitan belum ada. Jalankan migrasi 0034_kegiatan_keterkaitan.sql di Supabase.' }
  return gagal(error)
}

// ---------- Isu & peluang ----------

export async function simpanIsu(id: number | null, f: FormData): Promise<Hasil> {
  const t = await tolak('register.ubah'); if (t) return t
  const data = {
    asal: teks(f, 'asal'), jenis: teks(f, 'jenis'), uraian: teks(f, 'uraian'),
    dampak: bil(f, 'dampak'), kemungkinan: bil(f, 'kemungkinan'),
    tindakan: teks(f, 'tindakan'), evaluasi: teks(f, 'evaluasi'), pic: teks(f, 'pic'),
    bagian: teks(f, 'bagian'), proses: teks(f, 'proses'), target: teks(f, 'target'),
    dampak_residual: bil(f, 'dampak_residual'), kemungkinan_residual: bil(f, 'kemungkinan_residual'),
    diubah_at: new Date().toISOString(),
  }
  if (!data.uraian || !data.dampak || !data.kemungkinan) return { ok: false, pesan: 'Uraian, dampak, dan kemungkinan wajib diisi.' }
  if ((data.dampak_residual === null) !== (data.kemungkinan_residual === null)) return { ok: false, pesan: 'Isi dampak dan kemungkinan residual bersama-sama, atau kosongkan keduanya.' }
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

const statusTemuan = async (id: string | null) =>
  id ? (((await (await db()).from('temuan').select('status').eq('id', id).maybeSingle()).data?.status as string | undefined) ?? null) : null

/** Menutup atau membuka kembali temuan hanya untuk peran penutup (admin & konsultan), sama dengan trigger 0045. */
const cekGantiStatusTemuan = async (lama: string | null, baru: string) =>
  (baru === 'Tertutup') !== (lama === 'Tertutup') ? tolak('temuan.tutup') : null

export async function simpanTemuan(id: string | null, f: FormData): Promise<Hasil> {
  const t = await tolak(id ? 'temuan.ubah' : 'temuan.tambah'); if (t) return t
  // Pilihan status yang dinonaktifkan tidak ikut terkirim: pertahankan status lama, jangan jatuh ke 'Terbuka'
  const lama = await statusTemuan(id)
  const status = teks(f, 'status') ?? lama ?? 'Terbuka'
  const tc = await cekGantiStatusTemuan(lama, status); if (tc) return tc
  const data = {
    nomor: teks(f, 'nomor'), jenis_audit: teks(f, 'jenis_audit'), tanggal: teks(f, 'tanggal'),
    klausul_kode: teks(f, 'klausul_kode'), kategori: teks(f, 'kategori'), uraian: teks(f, 'uraian'),
    bukti: teks(f, 'bukti'), auditor: teks(f, 'auditor'), auditee: teks(f, 'auditee'),
    akar_masalah: teks(f, 'akar_masalah'), tindakan: teks(f, 'tindakan'), pic: teks(f, 'pic'),
    tenggat: teks(f, 'tenggat'), status, dokumen_id: teks(f, 'dokumen_id'),
    diubah_at: new Date().toISOString(),
  }
  if (!data.nomor || !data.uraian || !data.kategori || !data.jenis_audit) return { ok: false, pesan: 'Nomor, jenis audit, kategori, dan uraian wajib diisi.' }
  const { error } = id ? await (await db()).from('temuan').update(data).eq('id', id) : await (await db()).from('temuan').insert(data)
  revalidatePath('/temuan')
  revalidatePath('/')
  return gagal(error)
}

export async function ubahStatusTemuan(id: string, status: string): Promise<Hasil> {
  const t = await tolak('temuan.ubah'); if (t) return t
  const tc = await cekGantiStatusTemuan(await statusTemuan(id), status); if (tc) return tc
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
  revalidatePath('/', 'layout')
  return { ok: true }
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
  revalidatePath('/', 'layout')
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
  // Hanya jalur internal: tolak '//host' dan '/\host' (browser memperlakukan '\' sebagai '/')
  redirect(tujuan && /^\/(?![\/\\])/.test(tujuan) && !tujuan.includes('\\') ? tujuan : '/')
}

export async function keluar(): Promise<void> {
  await (await db()).rpc('keluar')
  ;(await cookies()).delete(COOKIE_SESI)
  redirect('/masuk')
}

export async function gantiSandi(_: unknown, f: FormData): Promise<{ pesan: string; ok?: boolean } | undefined> {
  const larang = await cekAkses('sandi.ganti'); if (larang) return { pesan: larang }
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
