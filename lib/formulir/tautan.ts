/**
 * Hubungan formulir dengan bagian lain aplikasi. Ditulis tangan (bukan hasil scripts/impor_formulir.py),
 * jadi aman saat templat dibangkitkan ulang.
 */

/**
 * Templat formulir → kode dokumen di lembar Kesiapan Audit (`dokumen_audit.kode`).
 * Isian yang diajukan menaikkan status dokumen ke Review, isian yang disetujui ke Disetujui,
 * dan isian yang disetujui dihitung sebagai evidence dokumen tersebut.
 */
export const DOKUMEN_TEMPLAT: Record<string, string> = {
  'isu-internal-eksternal': 'F-4.1-01',
  'pihak-berkepentingan': 'F-4.2-01',
  'ruang-lingkup': 'F-4.3-01',
  'komitmen-manajemen': 'F-5.1-01',
  'kebijakan-energi': 'F-5.2-01',
  'risiko-keberhasilan': 'F-6.1-01',
  'peluang-peningkatan': 'F-6.1-02',
  'tujuan-target-energi': 'F-6.2-01',
  'sasaran-target-bagian': 'F-6.2-01',
  'rencana-tindakan': 'F-6.2-02',
  'register-peluang': 'F-6.2-04',
  'penggunaan-energi-signifikan': 'F-6.3-01',
  'enpi-baseline': 'F-6.4-01',
  'pengumpulan-data-energi': 'F-6.6-01',
  'kompetensi-pelatihan': 'F-7.2-01',
  'kesadaran-komunikasi': 'F-7.3-01',
  'log-komunikasi-eksternal': 'F-7.4-01',
  'rekaman-komunikasi-eksternal': 'F-7.4-02',
  'informasi-terdokumentasi': 'F-7.5-01',
  'pengendalian-operasional': 'R-8.1-01',
  'pertimbangan-desain': 'R-8.2-01',
  'pertimbangan-pengadaan': 'R-8.3-01',
  'pemantauan-pengukuran': 'R-9.1-02',
  'program-audit-internal': 'R-9.2-01',
  'rencana-audit-internal': 'R-9.2-01',
  'notulen-rtm': 'R-9.3-01',
  'peningkatan-berkelanjutan': 'R-10.2-01',
}

export const templatUntukDokumen = (dokumenKode: string) =>
  Object.entries(DOKUMEN_TEMPLAT).filter(([, d]) => d === dokumenKode).map(([t]) => t)

/**
 * Tabel formulir yang isinya diambil dari data terstruktur aplikasi, bukan diketik ulang.
 * Di editor tabel ini hanya-baca; datanya diubah di halaman sumber lalu dimuat ulang ke isian.
 */
export type TabelTertaut = { tabel: string; sumber: string; href: string }

export const TABEL_TERTAUT: Record<string, TabelTertaut[]> = {
  'isu-internal-eksternal': [{ tabel: 't1', sumber: 'Register Isu', href: '/register' }],
  'peluang-peningkatan': [{ tabel: 't2', sumber: 'Register Peluang', href: '/register' }],
  'register-peluang': [{ tabel: 't1', sumber: 'Register Peluang', href: '/register' }],
  'tujuan-target-energi': [
    { tabel: 't4', sumber: 'Sasaran energi', href: '/sasaran' },
    { tabel: 't9', sumber: 'Rencana aksi', href: '/sasaran' },
  ],
  'enpi-baseline': [
    { tabel: 't2', sumber: 'Definisi EnPI', href: '/kinerja' },
    { tabel: 't4', sumber: 'Baseline energi (EnB)', href: '/kinerja' },
  ],
  'pengumpulan-data-energi': [{ tabel: 't3', sumber: 'Variabel relevan', href: '/kinerja' }],
}

export const tabelTertaut = (kode: string, tabel: string) => TABEL_TERTAUT[kode]?.find((x) => x.tabel === tabel)
