/** Matriks hak akses. Sinkron dengan policy RLS di supabase/migrations/0006_login_peran.sql, 0007, 0009, 0011, 0014, 0019, 0020, 0021, 0022, 0027, 0028, dan 0030. */
export type Peran = 'admin' | 'konsultan' | 'tim_kinra' | 'pembaca'

export const LABEL_PERAN: Record<Peran, string> = { admin: 'Admin', konsultan: 'Konsultan', tim_kinra: 'Tim KINRA', pembaca: 'Pembaca' }

export const DAFTAR_PERAN: Peran[] = ['admin', 'konsultan', 'tim_kinra', 'pembaca']

/** Semua peran yang boleh menulis. Pembaca hanya melihat. */
const SEMUA: Peran[] = ['admin', 'konsultan', 'tim_kinra']

export const AKSES = {
  'dokumen.tambah': SEMUA,                      // migrasi 0021
  'dokumen.wajib': ['admin', 'konsultan'],     // penanda wajib ISO 50001
  'dokumen.ubah': SEMUA,
  'dokumen.status': SEMUA,                      // status Belum ada / Draft / Final (migrasi 0019)
  'dokumen.setujui': ['admin', 'konsultan'],   // status Disetujui
  'dokumen.hapus': ['admin', 'tim_kinra'],      // migrasi 0020
  'energi.ubah': ['admin', 'tim_kinra'],        // termasuk data bulanan variabel relevan
  'aset.ubah': SEMUA,                           // aset, meter & bacaan stand (migrasi 0022)
  'aset.hapus': ['admin', 'tim_kinra'],
  'seu.ubah': SEMUA,                            // usulkan kandidat SEU & isi detail (migrasi 0027)
  'seu.tetapkan': ['admin', 'konsultan'],       // tetapkan/cabut SEU, setujui tinjauan energi
  'seu.hapus': ['admin'],
  'deviasi.ubah': SEMUA,                        // selidiki & tanggapi deviasi signifikan (migrasi 0028)
  'deviasi.tutup': ['admin', 'konsultan'],      // verifikasi: tutup / bukan deviasi
  'parameter.ubah': ['admin', 'konsultan'],     // tarif & faktor emisi (migrasi 0030)
  'enpi.tambah': ['admin', 'konsultan'],        // definisi variabel relevan & EnPI baru
  'enpi.ubah': SEMUA,                           // ubah variabel relevan, EnPI & baseline
  'enpi.hapus': ['admin'],
  'sasaran.tambah': ['admin', 'konsultan'],
  'sasaran.ubah': SEMUA,
  'aksi.ubah': SEMUA,
  'sasaran.hapus': ['admin'],                   // sasaran & rencana aksi
  'kegiatan.ubah': SEMUA,
  'register.ubah': SEMUA,
  'register.hapus': ['admin'],
  'temuan.tambah': ['admin', 'konsultan'],
  'temuan.ubah': SEMUA,
  'temuan.tutup': ['admin', 'konsultan'],
  'temuan.hapus': ['admin'],
  'formulir.isi': SEMUA,                        // buat, isi, ajukan formulir
  'formulir.setujui': ['admin', 'konsultan'],   // setujui / buka kembali formulir
  'formulir.hapus': ['admin', 'tim_kinra'],     // migrasi 0014
  'pengguna.kelola': ['admin'],
} satisfies Record<string, Peran[]>

export type Aksi = keyof typeof AKSES

/** Label aksi untuk halaman Pengguna dan Panduan. */
export const LABEL_AKSI: Record<Aksi, string> = {
  'dokumen.tambah': 'Tambah dokumen', 'dokumen.wajib': 'Tandai dokumen wajib ISO', 'dokumen.ubah': 'Ubah dokumen & evidence', 'dokumen.status': 'Ubah status dokumen (Draft/Final)', 'dokumen.setujui': 'Setujui dokumen (Disetujui)',
  'dokumen.hapus': 'Hapus dokumen', 'energi.ubah': 'Input data energi & variabel relevan',
  'aset.ubah': 'Ubah aset, meter & bacaan stand', 'aset.hapus': 'Hapus aset & meter',
  'deviasi.ubah': 'Selidiki & tanggapi deviasi', 'deviasi.tutup': 'Tutup deviasi (verifikasi)',
  'parameter.ubah': 'Ubah tarif & faktor emisi',
  'seu.ubah': 'Usulkan & isi SEU', 'seu.tetapkan': 'Tetapkan SEU & setujui tinjauan energi', 'seu.hapus': 'Hapus SEU',
  'enpi.tambah': 'Tambah EnPI & variabel relevan', 'enpi.ubah': 'Ubah EnPI, baseline & variabel', 'enpi.hapus': 'Hapus EnPI & variabel',
  'sasaran.tambah': 'Tambah sasaran energi', 'sasaran.ubah': 'Ubah sasaran energi', 'aksi.ubah': 'Isi rencana aksi', 'sasaran.hapus': 'Hapus sasaran & aksi', 'kegiatan.ubah': 'Tandai kegiatan timeline',
  'register.ubah': 'Isi isu & peluang', 'register.hapus': 'Hapus isu', 'temuan.tambah': 'Catat temuan',
  'temuan.ubah': 'Tindak lanjut temuan', 'temuan.tutup': 'Tutup temuan', 'temuan.hapus': 'Hapus temuan',
  'formulir.isi': 'Isi & ajukan formulir', 'formulir.setujui': 'Setujui formulir', 'formulir.hapus': 'Hapus isian formulir',
  'pengguna.kelola': 'Kelola pengguna',
}

export function boleh(peran: Peran | null | undefined, aksi: Aksi): boolean {
  return !!peran && (AKSES[aksi] as Peran[]).includes(peran)
}
