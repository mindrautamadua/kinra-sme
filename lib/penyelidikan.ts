/** Lembar penyelidikan deviasi EnPI yang diisi PIC lewat tautan khusus tanpa login (migrasi 0075). */
import type { KodeChip } from './status'

export type JenisPertanyaan = 'teks' | 'pilihan' | 'tanggal' | 'angka'
export type Pertanyaan = { id: string; teks: string; petunjuk?: string; jenis: JenisPertanyaan; opsi?: string[] }
export type Jawaban = Record<string, { nilai: string; keterangan?: string }>
export type StatusLembar = 'Belum diisi' | 'Draf' | 'Dijawab' | 'Ditinjau'

export type Lembar = {
  id: number
  kode: string
  enpi_kode: string | null
  judul: string
  ringkasan: string | null
  hipotesis: string | null
  pic_bagian: string
  pic_nama: string | null
  tenggat: string | null
  pertanyaan: Pertanyaan[]
  jawaban: Jawaban
  dijawab_nama: string | null
  dijawab_jabatan: string | null
  dijawab_at: string | null
  status: StatusLembar
  catatan_tinjauan: string | null
  ditinjau_oleh: string | null
  ditinjau_at: string | null
  token: string
  aktif: boolean
}

/** Data yang terlihat oleh pemegang tautan (tanpa token dan tanpa id). */
export type LembarPublik = Omit<Lembar, 'id' | 'token' | 'aktif' | 'ditinjau_oleh' | 'ditinjau_at'> & { enpi_nama: string | null }

/** Pertanyaan penutup yang sama untuk semua lembar; kategorinya selaras dengan register deviasi (migrasi 0028). */
export const PENUTUP: Pertanyaan[] = [
  { id: 'kategori', teks: 'Menurut Anda, penyebab utama deviasi ini termasuk kategori apa?', jenis: 'pilihan',
    opsi: ['Operasi (pola atau jam operasi berubah)', 'Kerusakan atau penurunan kondisi peralatan', 'Data (pencatatan atau pengukuran)', 'Variabel (volume, tenant, cuaca, gangguan pasokan)', 'Hasil rencana aksi', 'Lainnya'] },
  { id: 'penyebab', teks: 'Uraikan penyebab utama deviasi menurut Anda.', jenis: 'teks' },
  { id: 'tindakan', teks: 'Tindakan apa yang Anda usulkan, dan siapa yang sebaiknya melaksanakannya?', jenis: 'teks' },
  { id: 'bukti', teks: 'Bukti apa yang dapat Anda serahkan untuk mendukung jawaban ini?', jenis: 'teks',
    petunjuk: 'Misalnya log operasi, hour meter, foto meter, daftar armada, catatan pemeliharaan. Serahkan berkasnya ke Koordinator SMEn untuk diunggah.' },
]

export const STATUS_LEMBAR_CHIP: Record<StatusLembar, KodeChip> = { 'Belum diisi': 'crit', Draf: 'warn', Dijawab: 'info', Ditinjau: 'good' }

export const semuaPertanyaan = (l: { pertanyaan: Pertanyaan[] }) => [...(l.pertanyaan ?? []), ...PENUTUP]

/** Jumlah pertanyaan yang sudah dijawab (nilai tidak kosong). */
export function terjawab(l: { pertanyaan: Pertanyaan[]; jawaban: Jawaban }): { n: number; total: number } {
  const p = semuaPertanyaan(l)
  return { n: p.filter((q) => (l.jawaban?.[q.id]?.nilai ?? '').trim()).length, total: p.length }
}

/** Bersihkan jawaban dari klien: hanya id pertanyaan yang dikenal, teks dipangkas dan dibatasi panjangnya. */
export function rapikanJawaban(l: { pertanyaan: Pertanyaan[] }, j: unknown): Jawaban {
  const asal = (j && typeof j === 'object' ? j : {}) as Record<string, { nilai?: unknown; keterangan?: unknown }>
  const hasil: Jawaban = {}
  for (const q of semuaPertanyaan(l)) {
    const a = asal[q.id]
    if (!a) continue
    const nilai = typeof a.nilai === 'string' ? a.nilai.trim().slice(0, 4000) : ''
    const ket = typeof a.keterangan === 'string' ? a.keterangan.trim().slice(0, 4000) : ''
    if (nilai || ket) hasil[q.id] = ket ? { nilai, keterangan: ket } : { nilai }
  }
  return hasil
}
