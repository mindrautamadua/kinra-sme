/** Struktur templat formulir. Sinkron dengan keluaran scripts/impor_formulir.py. */

export type Kolom = {
  label: string
  /** teks (bawaan), angka, cek (kotak centang), pilihan (opsi), rumus (dihitung, hanya baca) */
  jenis?: 'angka' | 'cek' | 'pilihan' | 'rumus'
  opsi?: string[]
  rumus?: { op: 'kali' | 'jumlah'; kolom: number[] }
}

export type Blok =
  | { jenis: 'judul'; teks: string }
  | { jenis: 'teks'; id: string; teks: string }
  | { jenis: 'cek'; id: string; teks: string; nilai: string }
  | { jenis: 'isian'; id: string; label: string; teks: string; panjang?: boolean }
  | { jenis: 'tabel'; id: string; kolom: Kolom[]; baris: string[][] }

export type Varian = { nama: string; kepala: Record<string, string>; tabel: Record<string, string[][]> }

export type Templat = {
  kode: string
  judul: string
  subjudul?: string | null
  klausul: string[]
  nomor: string
  sumber: string
  kepala: { label: string; nilai: string }[]
  blok: Blok[]
  ttd: { peran: string; jabatan: string }[]
  varian?: Varian[]
  tautan?: { href: string; label: string }
}

export type RingkasTemplat = Pick<Templat, 'kode' | 'judul' | 'klausul' | 'nomor' | 'tautan'> & { varian: string[] }

/** Isian yang disimpan di kolom jsonb `formulir_isian.isi`. */
export type IsiFormulir = {
  kepala: Record<string, string>
  /** nilai blok teks, cek, dan isian, per id blok */
  teks: Record<string, string>
  tabel: Record<string, string[][]>
  ttd: { nama: string; tanggal: string }[]
}

export type StatusFormulir = 'draf' | 'diajukan' | 'disetujui'

export type IsianFormulir = {
  id: string
  templat_kode: string
  judul: string
  varian: string | null
  periode: string | null
  isi: IsiFormulir
  status: StatusFormulir
  dibuat_oleh: string | null
  dibuat_at: string
  diubah_oleh: string | null
  diubah_at: string
  diajukan_oleh: string | null
  diajukan_at: string | null
  disetujui_oleh: string | null
  disetujui_at: string | null
}

export type RiwayatFormulir = { id: number; isian_id: string; dari: StatusFormulir | null; ke: StatusFormulir; catatan: string | null; oleh: string | null; at: string }
