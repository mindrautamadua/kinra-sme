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
  keterangan: string | null
  /** Draf dokumen sedang ada di siapa (migrasi 0018); undefined bila kolom belum ada */
  posisi_draf?: string | null
  /** Siapa dan kapan terakhir mengubah posisi draf/keterangan (diisi trigger 0018) */
  catatan_oleh?: string | null
  catatan_at?: string | null
  diubah_at: string
  /** Informasi terdokumentasi wajib ISO 50001:2018 (migrasi 0015); undefined bila kolom belum ada */
  wajib_iso?: boolean
  /** Jumlah berkas evidence di Storage; tidak ada bila migrasi 0010 belum dijalankan */
  jumlah_berkas?: number
  /** Jumlah berkas bertanda versi sah (migrasi 0031) */
  jumlah_sah?: number
}

export type Berkas = {
  id: string
  dokumen_id: string | null
  path: string
  nama_file: string
  mime: string | null
  ukuran: number | null
  diunggah_oleh: string | null
  diunggah_at: string
  /** Versi sah yang ditunjukkan ke auditor (migrasi 0031) */
  sah?: boolean
  sah_oleh?: string | null
}

/** Berkas dengan signed URL (berlaku 1 jam) untuk ditampilkan */
export type BerkasTampil = Berkas & { url: string | null }

export type RiwayatStatus = { dokumen_id: string; dari: StatusDokumen | null; ke: StatusDokumen; at: string; oleh: string | null }

/** Satu peristiwa evidence: berkas diunggah. */
export type JejakBukti = { dokumen_id: string; at: string; oleh: string | null; label: string }

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
  /** Kode tonggak audit ('ia', 'tm', 's1', 's2'); tidak ada bila migrasi 0012 belum dijalankan */
  tonggak?: string | null
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

export type LingkupEnpi = 'kinra' | 'kawasan'

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
  /** Ditampilkan sebagai EnPI utama di Ringkasan & Kinerja (migrasi 0025). Hanya satu. */
  utama?: boolean
  /** 'kinra' = dalam kendali KINRA (dasar klaim kinerja); 'kawasan' = termasuk tenant, hanya konteks (migrasi 0026) */
  lingkup?: LingkupEnpi
  /** Bila terisi, energi diukur dari bacaan meter ini, bukan dari energi_bulanan (migrasi 0026) */
  meter_kode?: string[]
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

/** Aset gedung/fasilitas KINRA (migrasi 0022). */
export type Aset = {
  kode: string
  no_urut: number
  nama: string
  area: string | null
  luas_m2: number | null
  jumlah_lantai: number | null
  jumlah_ruangan: number | null
  tahun_bangun: number | null
  tanggal_bangun: string | null
  fungsi: string | null
  kondisi: string | null
  luas_ac_m2: number | null
  kwh_bulan: number | null
  biaya_bulan: number | null
  jam_operasi: string | null
  pic: string | null
  catatan: string | null
}

/** Register induk meter energi (migrasi 0022). */
export type MeterEnergi = {
  kode: string
  no_urut: number
  no_meter: string | null
  jenis: string | null
  sumber_kode: string | null
  lokasi: string | null
  area_dilayani: string | null
  aset_kode: string | null
  beban_diukur: string | null
  pic_area: string | null
  pic_data: string | null
  satuan: string
  faktor_kali: number
  kapasitas: string | null
  kelas_akurasi: string | null
  interval_pembacaan: string | null
  frekuensi_pencatatan: string | null
  status: string | null
  kalibrasi_terakhir: string | null
  kalibrasi_berikutnya: string | null
  metode_pengiriman: string | null
  penyimpanan_data: string | null
  kandidat_seu: string | null
  bukti_pendukung: string | null
  catatan: string | null
}

/** Bacaan stand meter per bulan. Konsumsi = (stand_akhir - stand_awal) x faktor_kali. */
export type PembacaanMeter = {
  meter_kode: string
  tahun: number
  bulan: number
  stand_awal: number | null
  stand_akhir: number | null
  catatan: string | null
  diubah_oleh: string | null
  diubah_at: string
}

export type StatusSeu = 'Kandidat' | 'Ditetapkan' | 'Dicabut'
export type KriteriaSeu = 'porsi' | 'potensi' | 'regulasi'

/** Register penggunaan energi signifikan (migrasi 0027). */
export type Seu = {
  kode: string
  nama: string
  deskripsi: string | null
  aset_kode: string[]
  meter_kode: string[]
  sumber_kode: string[]
  kriteria: KriteriaSeu[]
  status: StatusSeu
  variabel_kode: string[]
  enpi_kode: string | null
  pic: string | null
  personel: string | null
  alasan: string | null
  ditetapkan_oleh: string | null
  ditetapkan_at: string | null
  tinjau_berikutnya: string | null
  urutan: number
  diubah_at: string
}

/** Catatan tinjauan energi berkala beserta kriteria SEU (migrasi 0027). */
export type TinjauanEnergi = {
  id: number
  periode_mulai: string
  periode_selesai: string
  ambang_persen: number
  ambang_kumulatif: number
  ringkasan: string | null
  status: 'Draft' | 'Disetujui'
  disetujui_oleh: string | null
  disetujui_at: string | null
  diubah_at: string
}

/** Catatan penyelidikan deviasi signifikan kinerja energi (migrasi 0028). */
export type Deviasi = {
  id: number
  enpi_kode: string
  tahun: number
  bulan: number
  jenis: 'bulanan' | 'tren' | 'data'
  arah: 'boros' | 'hemat' | 'data'
  aktual: number | null
  harapan: number | null
  selisih_persen: number | null
  status: 'Diselidiki' | 'Ditanggapi' | 'Ditutup' | 'Bukan deviasi'
  kategori: 'operasi' | 'kerusakan' | 'data' | 'variabel' | 'aksi' | 'lainnya' | null
  penyebab: string | null
  tindakan: string | null
  pic: string | null
  tenggat: string | null
  aksi_kode: string | null
  dibuka_oleh: string | null
  diverifikasi_oleh: string | null
  diverifikasi_at: string | null
  dibuat_at: string
  diubah_at: string
}
