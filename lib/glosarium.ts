export type KategoriIstilah = 'sistem' | 'kinerja' | 'analisis' | 'audit' | 'aplikasi'

export const KATEGORI_ISTILAH: Record<KategoriIstilah, string> = {
  sistem: 'Sistem & standar',
  kinerja: 'Kinerja energi',
  analisis: 'Data & analisis',
  audit: 'Audit & perbaikan',
  aplikasi: 'Aplikasi & organisasi',
}

export type Istilah = {
  istilah: string
  /** Kepanjangan atau padanan bahasa Inggris */
  asli?: string
  arti: string
  kategori: KategoriIstilah
  klausul?: string
  /** Menu aplikasi tempat istilah ini dipakai */
  href?: string
}

export const GLOSARIUM: Istilah[] = [
  // Sistem & standar
  { istilah: 'SMEn', asli: 'Sistem Manajemen Energi / EnMS', kategori: 'sistem', klausul: '3.2.2',
    arti: 'Sistem manajemen untuk menetapkan kebijakan energi, sasaran, target energi, rencana aksi, dan proses untuk mencapainya serta meningkatkan kinerja energi.' },
  { istilah: 'ISO 50001:2018', asli: 'SNI ISO 50001:2018', kategori: 'sistem',
    arti: 'Standar internasional persyaratan sistem manajemen energi. Menjadi acuan sertifikasi SMEn KINRA oleh TÜV.' },
  { istilah: 'PDCA', asli: 'Plan – Do – Check – Act', kategori: 'sistem',
    arti: 'Siklus perbaikan berkelanjutan yang menjadi kerangka ISO 50001: rencanakan, laksanakan, periksa, tindak lanjuti.' },
  { istilah: 'Kebijakan energi', asli: 'Energy policy', kategori: 'sistem', klausul: '5.2',
    arti: 'Pernyataan resmi manajemen puncak tentang niat dan arah organisasi terkait kinerja energi, termasuk komitmen perbaikan berkelanjutan.' },
  { istilah: 'Ruang lingkup & batasan', asli: 'Scope & boundaries', kategori: 'sistem', klausul: '4.3',
    arti: 'Kegiatan, fasilitas, dan keputusan yang dicakup SMEn (ruang lingkup) serta batas fisik atau organisasinya (batasan).' },
  { istilah: 'Konteks organisasi', asli: 'Context of the organization', kategori: 'sistem', klausul: '4.1',
    arti: 'Isu internal dan eksternal yang memengaruhi kemampuan organisasi mencapai hasil SMEn yang diharapkan.', href: '/register' },
  { istilah: 'Pihak berkepentingan', asli: 'Interested party', kategori: 'sistem', klausul: '4.2',
    arti: 'Orang atau organisasi yang dapat memengaruhi, dipengaruhi, atau merasa dipengaruhi oleh keputusan terkait energi, mis. tenant, regulator, PLN.' },
  { istilah: 'Risiko & peluang', asli: 'Risks & opportunities', kategori: 'sistem', klausul: '6.1',
    arti: 'Hal yang perlu ditangani agar SMEn mencapai hasilnya, mencegah dampak yang tidak diinginkan, dan mendorong perbaikan.', href: '/register' },
  { istilah: 'Informasi terdokumentasi', asli: 'Documented information', kategori: 'sistem', klausul: '7.5',
    arti: 'Dokumen (manual, SOP, prosedur) dan rekaman (bukti pelaksanaan) yang wajib dikendalikan dan disimpan.', href: '/kesiapan' },
  { istilah: 'Tinjauan manajemen', asli: 'Management review', kategori: 'sistem', klausul: '9.3',
    arti: 'Rapat berkala manajemen puncak untuk menilai kesesuaian, kecukupan, dan efektivitas SMEn serta kinerja energi.' },

  // Kinerja energi
  { istilah: 'Kinerja energi', asli: 'Energy performance', kategori: 'kinerja', klausul: '3.4.3',
    arti: 'Hasil terukur terkait efisiensi energi, penggunaan energi, dan konsumsi energi.', href: '/kinerja' },
  { istilah: 'EnPI', asli: 'Energy Performance Indicator', kategori: 'kinerja', klausul: '6.4',
    arti: 'Ukuran atau satuan kinerja energi yang ditetapkan organisasi, mis. kWh per m³ air olahan.', href: '/kinerja' },
  { istilah: 'EnB', asli: 'Energy Baseline', kategori: 'kinerja', klausul: '6.5',
    arti: 'Acuan kuantitatif kinerja energi pada periode tertentu, dipakai sebagai pembanding untuk menghitung perbaikan.', href: '/kinerja' },
  { istilah: 'Penyesuaian baseline', asli: 'Baseline revision', kategori: 'kinerja', klausul: '6.5',
    arti: 'Perubahan baseline bila EnPI tidak lagi mencerminkan kinerja, ada perubahan besar pada proses, atau sesuai metode yang ditetapkan. Alasannya wajib dicatat.', href: '/kinerja' },
  { istilah: 'Normalisasi', asli: 'Normalization', kategori: 'kinerja', klausul: '3.4.8',
    arti: 'Penyesuaian data energi terhadap perubahan variabel relevan agar kinerja bisa dibandingkan pada kondisi setara.' },
  { istilah: 'Variabel relevan', asli: 'Relevant variable', kategori: 'kinerja', klausul: '3.4.9',
    arti: 'Faktor terukur yang memengaruhi kinerja energi secara signifikan dan rutin berubah, mis. jumlah tenant atau volume produksi.', href: '/kinerja' },
  { istilah: 'Faktor statis', asli: 'Static factor', kategori: 'kinerja', klausul: '3.4.7',
    arti: 'Faktor yang memengaruhi kinerja energi tetapi biasanya tidak berubah, mis. luas kawasan atau jenis proses.' },
  { istilah: 'SEU', asli: 'Significant Energy Use', kategori: 'kinerja', klausul: '6.3',
    arti: 'Penggunaan energi yang menyumbang konsumsi besar dan/atau berpotensi besar untuk diperbaiki.' },
  { istilah: 'Tinjauan energi', asli: 'Energy review', kategori: 'kinerja', klausul: '6.3',
    arti: 'Analisis efisiensi, penggunaan, dan konsumsi energi berbasis data untuk menetapkan SEU dan peluang perbaikan.', href: '/energi' },
  { istilah: 'Sasaran & target energi', asli: 'Objective & energy target', kategori: 'kinerja', klausul: '6.2',
    arti: 'Sasaran adalah hasil yang ingin dicapai; target energi adalah besaran perbaikan kinerja energi yang terukur dan bertenggat.', href: '/sasaran' },
  { istilah: 'Rencana aksi', asli: 'Action plan', kategori: 'kinerja', klausul: '6.2',
    arti: 'Rincian apa yang dikerjakan, sumber daya, PIC, tenggat, dan cara verifikasi hasil untuk mencapai sasaran.', href: '/sasaran' },
  { istilah: 'Konsumsi energi', asli: 'Energy consumption', kategori: 'kinerja', klausul: '3.5.2',
    arti: 'Jumlah energi yang dipakai, dicatat per bulan per sumber di aplikasi.', href: '/energi' },
  { istilah: 'Efisiensi energi', asli: 'Energy efficiency', kategori: 'kinerja', klausul: '3.5.3',
    arti: 'Rasio antara keluaran (kinerja, layanan, barang) dengan masukan energi.' },

  // Data & analisis
  { istilah: 'CUSUM', asli: 'Cumulative Sum', kategori: 'analisis',
    arti: 'Selisih kumulatif konsumsi aktual dikurangi harapan model. Garis yang terus turun berarti penghematan berkelanjutan.', href: '/kinerja' },
  { istilah: 'R²', asli: 'Koefisien determinasi', kategori: 'analisis',
    arti: 'Seberapa besar variasi konsumsi energi dijelaskan oleh variabel relevan. Model baseline layak bila R² ≥ 0,75.', href: '/kinerja' },
  { istilah: 'CV(RMSE)', asli: 'Coefficient of Variation of RMSE', kategori: 'analisis',
    arti: 'Rata-rata kesalahan prediksi model relatif terhadap rata-rata data. Model layak bila CV(RMSE) ≤ 15%.', href: '/kinerja' },
  { istilah: 'Regresi linear', asli: 'Linear regression', kategori: 'analisis',
    arti: 'Metode statistik untuk membentuk model harapan konsumsi energi dari satu atau lebih variabel relevan.', href: '/kinerja' },
  { istilah: 'TJ', asli: 'Terajoule', kategori: 'analisis',
    arti: 'Satuan energi (10¹² joule) untuk menjumlahkan sumber berbeda. 1 TJ ≈ 277.778 kWh.', href: '/energi' },
  { istilah: 'PLTBG', asli: 'Pembangkit Listrik Tenaga Biogas', kategori: 'analisis',
    arti: 'Sumber listrik dari biogas limbah sawit (POME), termasuk energi terbarukan.', href: '/energi' },
  { istilah: 'PLTS', asli: 'Pembangkit Listrik Tenaga Surya', kategori: 'analisis',
    arti: 'Sumber listrik dari panel surya, termasuk energi terbarukan.', href: '/energi' },
  { istilah: 'Pengukuran & verifikasi', asli: 'M&V', kategori: 'analisis', klausul: '9.1',
    arti: 'Cara membuktikan penghematan nyata dengan membandingkan konsumsi aktual terhadap baseline yang ternormalisasi.' },

  // Audit & perbaikan
  { istilah: 'Audit internal', asli: 'Internal audit', kategori: 'audit', klausul: '9.2',
    arti: 'Pemeriksaan terencana oleh organisasi sendiri untuk memastikan SMEn sesuai persyaratan dan diterapkan efektif.', href: '/temuan' },
  { istilah: 'Stage 1', asli: 'Audit sertifikasi tahap 1', kategori: 'audit',
    arti: 'Audit kecukupan dokumen dan kesiapan oleh badan sertifikasi (TÜV) sebelum audit penerapan.', href: '/timeline' },
  { istilah: 'Stage 2', asli: 'Audit sertifikasi tahap 2', kategori: 'audit',
    arti: 'Audit penerapan dan efektivitas SMEn di lapangan; dasar keputusan sertifikat.', href: '/timeline' },
  { istilah: 'Ketidaksesuaian', asli: 'Nonconformity (NC)', kategori: 'audit', klausul: '10.1',
    arti: 'Tidak terpenuhinya suatu persyaratan standar, prosedur, atau peraturan.', href: '/temuan' },
  { istilah: 'Mayor', asli: 'Major nonconformity', kategori: 'audit',
    arti: 'Ketidaksesuaian yang menunjukkan kegagalan sistem atau persyaratan tidak diterapkan sama sekali; dapat menunda sertifikasi.', href: '/temuan' },
  { istilah: 'Minor', asli: 'Minor nonconformity', kategori: 'audit',
    arti: 'Ketidaksesuaian sebagian atau sesekali yang tidak membuat sistem gagal.', href: '/temuan' },
  { istilah: 'Observasi', asli: 'Observation', kategori: 'audit',
    arti: 'Catatan auditor atas hal yang berpotensi menjadi ketidaksesuaian bila dibiarkan.', href: '/temuan' },
  { istilah: 'OFI', asli: 'Opportunity for Improvement', kategori: 'audit',
    arti: 'Saran perbaikan dari auditor; bukan ketidaksesuaian dan tidak wajib ditindaklanjuti.', href: '/temuan' },
  { istilah: 'Akar masalah', asli: 'Root cause', kategori: 'audit', klausul: '10.1',
    arti: 'Penyebab dasar ketidaksesuaian yang bila dihilangkan mencegah kejadian berulang.', href: '/temuan' },
  { istilah: 'Koreksi', asli: 'Correction', kategori: 'audit', klausul: '10.1',
    arti: 'Tindakan segera menghilangkan ketidaksesuaian yang terdeteksi, tanpa menyentuh penyebabnya.' },
  { istilah: 'Tindakan perbaikan', asli: 'Corrective action', kategori: 'audit', klausul: '10.1',
    arti: 'Tindakan menghilangkan akar masalah agar ketidaksesuaian tidak terulang.', href: '/temuan' },
  { istilah: 'Perbaikan berkelanjutan', asli: 'Continual improvement', kategori: 'audit', klausul: '10.2',
    arti: 'Kegiatan berulang untuk meningkatkan kinerja energi dan SMEn.' },

  // Aplikasi & organisasi
  { istilah: 'KINRA', asli: 'PT Kawasan Industri Nusantara', kategori: 'aplikasi',
    arti: 'Pengelola KEK Sei Mangkei dan pemilik SMEn ini.' },
  { istilah: 'KEK', asli: 'Kawasan Ekonomi Khusus', kategori: 'aplikasi',
    arti: 'Kawasan dengan fasilitas khusus; ruang lingkup SMEn adalah KEK Sei Mangkei.' },
  { istilah: 'Tim energi', asli: 'Energy management team', kategori: 'aplikasi', klausul: '5.3',
    arti: 'Orang yang ditunjuk manajemen puncak untuk menerapkan SMEn dan meningkatkan kinerja energi.' },
  { istilah: 'PIC', asli: 'Person in Charge', kategori: 'aplikasi',
    arti: 'Penanggung jawab sebuah dokumen, rencana aksi, atau temuan.' },
  { istilah: 'Evidence', asli: 'Bukti objektif', kategori: 'aplikasi',
    arti: 'Dokumen, foto, notulen, atau rekaman yang disimpan di OneDrive dan ditautkan ke tiap dokumen di aplikasi.', href: '/kesiapan' },
  { istilah: 'Skor kesiapan', asli: 'Readiness score', kategori: 'aplikasi',
    arti: 'Persentase berbobot status semua dokumen audit: Belum ada 0, Draft 25, Review 50, Disetujui 85, Final 100.', href: '/' },
  { istilah: 'Matriks risiko 5×5', asli: 'Risk matrix', kategori: 'aplikasi',
    arti: 'Skor kemungkinan (1–5) × dampak (1–5). Skor ≥ 15 tinggi, 8–14 sedang, di bawah 8 rendah.', href: '/register' },
]
