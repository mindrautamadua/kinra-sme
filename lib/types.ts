export type StatusDokumen = 'belum' | 'draft' | 'review' | 'disetujui' | 'final'
export type KelompokDokumen = 'persiapan' | 'manual' | 'sop' | 'formulir' | 'rekaman'

export type Klausul = { kode: string; induk: string; judul: string; urutan: number }

export type Dokumen = {
  id: string
  kode: string
  kelompok: KelompokDokumen
  klausul_kode: string
  nama: string
  nomor_dokumen: string | null
  pic: string | null
  status: StatusDokumen
  tenggat: string | null
  tanggal_terima: string | null
  link_eksternal: string | null
  keterangan: string | null
  diubah_at: string
}

export type RiwayatStatus = { dokumen_id: string; dari: StatusDokumen | null; ke: StatusDokumen; at: string; oleh: string | null }

export type SumberEnergi = {
  kode: string
  nama: string
  satuan: string
  faktor_tj: number
  terbarukan: boolean
  urutan: number
  catatan: string | null
}

export type EnergiBulanan = { tahun: number; bulan: number; sumber_kode: string; nilai: number }

export type Kegiatan = {
  no: number
  nama: string
  fasilitator: string | null
  metode: string | null
  peserta: string | null
  sesi: { tanggal: string; jam: string }[]
  /** Tidak ada bila migrasi 0005 belum dijalankan */
  status?: StatusKegiatan
  selesai_at?: string | null
}

export type StatusKegiatan = 'belum' | 'berjalan' | 'selesai'

export type Isu = {
  id: number
  asal: 'Internal' | 'Eksternal'
  jenis: 'Risiko' | 'Peluang'
  uraian: string
  dampak: number
  kemungkinan: number
  skor: number
  tindakan: string | null
  evaluasi: string | null
  pic: string | null
}

export type Peluang = {
  kode: string
  uraian: string
  variabel: string | null
  metode: string | null
  pemilik: string | null
  skor_energi: number | null
  skor_roi: number | null
  prioritas: number | null
  estimasi_kwh: number | null
  status: string
}

export type Temuan = {
  id: string
  nomor: string
  jenis_audit: 'Internal' | 'TÜV Stage 1' | 'TÜV Stage 2'
  tanggal: string
  klausul_kode: string | null
  kategori: 'Mayor' | 'Minor' | 'Observasi' | 'OFI'
  uraian: string
  bukti: string | null
  auditor: string | null
  auditee: string | null
  akar_masalah: string | null
  tindakan: string | null
  pic: string | null
  tenggat: string | null
  status: 'Terbuka' | 'Proses' | 'Verifikasi' | 'Tertutup'
  dokumen_id: string | null
}

export type VariabelRelevan = { kode: string; nama: string; satuan: string; keterangan: string | null; urutan: number }

export type VariabelBulanan = { tahun: number; bulan: number; variabel_kode: string; nilai: number }

export type MetodeEnpi = 'absolut' | 'rasio' | 'regresi'

export type Enpi = {
  kode: string
  nama: string
  sumber_kode: string[]
  metode: MetodeEnpi
  variabel_kode: string[]
  baseline_mulai: string
  baseline_selesai: string
  alasan_baseline: string | null
  catatan: string | null
  aktif: boolean
  urutan: number
}

export type StatusSasaran = 'Draft' | 'Aktif' | 'Tercapai' | 'Tidak tercapai'

export type Sasaran = {
  id: number
  kode: string
  uraian: string
  enpi_kode: string | null
  target_persen: number | null
  tahun_target: number | null
  pic: string | null
  status: StatusSasaran
  catatan: string | null
}

export type StatusAksi = 'Rencana' | 'Berjalan' | 'Selesai' | 'Ditunda' | 'Batal'

export type RencanaAksi = {
  id: number
  kode: string
  sasaran_id: number | null
  peluang_kode: string | null
  uraian: string
  pic: string | null
  sumber_daya: string | null
  mulai: string | null
  tenggat: string | null
  estimasi_hemat_kwh: number | null
  metode_verifikasi: string | null
  status: StatusAksi
  hemat_terverifikasi_kwh: number | null
  tanggal_verifikasi: string | null
  catatan: string | null
}
