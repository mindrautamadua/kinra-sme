/** Matriks hak akses. Sinkron dengan policy RLS di supabase/migrations/0006_login_peran.sql, 0007, dan 0009. */
export type Peran = 'admin' | 'konsultan' | 'tim_kinra' | 'pembaca'

export const LABEL_PERAN: Record<Peran, string> = { admin: 'Admin', konsultan: 'Konsultan', tim_kinra: 'Tim KINRA', pembaca: 'Pembaca' }

export const DAFTAR_PERAN: Peran[] = ['admin', 'konsultan', 'tim_kinra', 'pembaca']

/** Semua peran yang boleh menulis. Pembaca hanya melihat. */
const SEMUA: Peran[] = ['admin', 'konsultan', 'tim_kinra']

export const AKSES = {
  'dokumen.tambah': ['admin', 'konsultan'],
  'dokumen.ubah': SEMUA,
  'dokumen.setujui': ['admin', 'konsultan'],   // status Disetujui / Final
  'dokumen.hapus': ['admin'],
  'energi.ubah': ['admin', 'tim_kinra'],        // termasuk data bulanan variabel relevan
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
  'pengguna.kelola': ['admin'],
} satisfies Record<string, Peran[]>

export type Aksi = keyof typeof AKSES

/** Label aksi untuk halaman Pengguna dan Panduan. */
export const LABEL_AKSI: Record<Aksi, string> = {
  'dokumen.tambah': 'Tambah dokumen', 'dokumen.ubah': 'Ubah dokumen & evidence', 'dokumen.setujui': 'Setujui dokumen (Disetujui/Final)',
  'dokumen.hapus': 'Hapus dokumen', 'energi.ubah': 'Input data energi & variabel relevan',
  'enpi.tambah': 'Tambah EnPI & variabel relevan', 'enpi.ubah': 'Ubah EnPI, baseline & variabel', 'enpi.hapus': 'Hapus EnPI & variabel',
  'sasaran.tambah': 'Tambah sasaran energi', 'sasaran.ubah': 'Ubah sasaran energi', 'aksi.ubah': 'Isi rencana aksi', 'sasaran.hapus': 'Hapus sasaran & aksi', 'kegiatan.ubah': 'Tandai kegiatan timeline',
  'register.ubah': 'Isi isu & peluang', 'register.hapus': 'Hapus isu', 'temuan.tambah': 'Catat temuan',
  'temuan.ubah': 'Tindak lanjut temuan', 'temuan.tutup': 'Tutup temuan', 'temuan.hapus': 'Hapus temuan', 'pengguna.kelola': 'Kelola pengguna',
}

export function boleh(peran: Peran | null | undefined, aksi: Aksi): boolean {
  return !!peran && (AKSES[aksi] as Peran[]).includes(peran)
}
