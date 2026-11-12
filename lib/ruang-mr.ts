/**
 * Ruang MR: bahan persiapan audit eksternal untuk Management Representative (MR/Steering Committee) PT KINRA.
 * Disusun dari peran MR pada SKPTS No. KINRA/SKPTS/47/2026 (27 Oktober 2026), Lampiran I butir 2,
 * dipetakan ke klausul ISO 50001:2018 yang akan ditanyakan auditor lembaga sertifikasi.
 *
 * Jawaban adalah contoh respons yang diharapkan, bukan pernyataan bahwa KINRA sudah memenuhi persyaratan.
 * MR wajib mencocokkannya dengan kondisi aktual dan dokumen terkendali sebelum audit.
 */

export const SK_MR = {
  nomor: 'KINRA/SKPTS/47/2026',
  tanggal: '27 Oktober 2026',
  penandatangan: 'Plt. Direktur PT KINRA',
  jabatan: 'Kepala Bagian Manajemen Risiko & TI',
  peranTim: 'MR/Steering Committee',
  uraian: 'Mengarahkan, mengoordinasikan, dan mengawasi pelaksanaan SMEn, mengevaluasi pencapaian sasaran dan target energi, mengidentifikasi hambatan penerapan, memberikan rekomendasi perbaikan kepada manajemen puncak, serta memantau penyelesaian tindak lanjut hasil audit dan evaluasi kinerja energi.',
  atasan: 'Pengarah Manajemen Puncak (Plt. Direktur dan SEVP Operation)',
  bawahan: 'Manajer Energi/Koordinator Energi, Sekretaris/Dokumen Kontrol, anggota tim, dan PIC fungsi',
}

export type KodeFungsi = 'arah' | 'sasaran' | 'hambatan' | 'rekomendasi' | 'audit' | 'kinerja' | 'celah'

/** Kelompok pertanyaan pada sebuah ruang persiapan audit (Ruang MR, Ruang Manajemen Risiko & TI). */
export type Fungsi = {
  kode: string
  no: string
  judul: string
  /** Potongan kalimat SK yang menjadi dasar fungsi ini */
  dasar: string
  klausul: string
  inti: string
}

export const FUNGSI_MR: (Fungsi & { kode: KodeFungsi })[] = [
  { kode: 'arah', no: '01', judul: 'Mengarahkan, mengoordinasikan & mengawasi SMEn', dasar: 'mengarahkan, mengoordinasikan, dan mengawasi pelaksanaan SMEn',
    klausul: '4.3, 4.4, 5.1, 5.2, 5.3, 7.4, 7.5', inti: 'Anda pemilik gambaran besar: lingkup, kebijakan, struktur tim, dan cara SMEn dijalankan sehari-hari.' },
  { kode: 'sasaran', no: '02', judul: 'Mengevaluasi pencapaian sasaran & target energi', dasar: 'mengevaluasi pencapaian sasaran dan target energi',
    klausul: '6.2, 6.4, 6.5, 9.1, 10.2', inti: 'Anda harus bisa menjawab "sudah tercapai atau belum, dan buktinya apa" untuk setiap sasaran.' },
  { kode: 'hambatan', no: '03', judul: 'Mengidentifikasi hambatan penerapan', dasar: 'mengidentifikasi hambatan penerapan',
    klausul: '4.1, 6.1, 7.1, 7.2, 7.3', inti: 'Auditor ingin melihat bahwa kendala dikenali sejak dini, dicatat, dan ada tindakannya.' },
  { kode: 'rekomendasi', no: '04', judul: 'Memberi rekomendasi perbaikan kepada manajemen puncak', dasar: 'memberikan rekomendasi perbaikan kepada manajemen puncak',
    klausul: '5.1, 9.3, 10.2', inti: 'Jembatan Anda ke direksi adalah tinjauan manajemen: masukan lengkap, keputusan tercatat, tindak lanjut terlacak.' },
  { kode: 'audit', no: '05', judul: 'Memantau tindak lanjut hasil audit', dasar: 'memantau penyelesaian tindak lanjut hasil audit',
    klausul: '9.2, 10.1', inti: 'Setiap temuan audit internal harus punya akar masalah, tindakan, PIC, tenggat, dan verifikasi efektivitas.' },
  { kode: 'kinerja', no: '06', judul: 'Memantau tindak lanjut evaluasi kinerja energi', dasar: 'memantau penyelesaian tindak lanjut … evaluasi kinerja energi',
    klausul: '6.3, 6.6, 8.1, 9.1, 10.1', inti: 'Ketika EnPI memburuk atau ada deviasi signifikan, Anda yang memastikan diselidiki dan ditutup.' },
  { kode: 'celah', no: '07', judul: 'Pertanyaan menjebak & celah SK', dasar: 'uraian peran MR dan diktum SK',
    klausul: '5.3, 9.2', inti: 'Pertanyaan yang muncul karena rumusan SK belum lengkap. Siapkan jawaban yang konsisten dengan Manajer Energi.' },
]

export type TanyaMr = {
  id: string
  fungsi: string
  klausul: string[]
  tanya: string
  jawab: string[]
  bukti: string
  /** Halaman aplikasi tempat bukti atau angkanya bisa ditunjukkan */
  halaman: { href: string; label: string }[]
  /** Kesalahan umum yang sebaiknya dihindari saat menjawab */
  hindari?: string
  /** Stage audit yang paling mungkin menanyakan */
  stage: 'Stage 1' | 'Stage 2' | 'Stage 1 & 2'
}

export const TANYA_MR: TanyaMr[] = [
  // 01 · Mengarahkan, mengoordinasikan & mengawasi
  { id: 'A1', fungsi: 'arah', klausul: ['5.3'], stage: 'Stage 1 & 2',
    tanya: 'Apa peran Anda dalam SMEn, dan atas dasar apa Anda ditunjuk?',
    jawab: [
      `Saya ditunjuk sebagai MR/Steering Committee melalui SK Direktur No. ${SK_MR.nomor} tanggal ${SK_MR.tanggal}, Lampiran I.`,
      'Peran saya: mengarahkan, mengoordinasikan, dan mengawasi pelaksanaan SMEn; mengevaluasi pencapaian sasaran; mengidentifikasi hambatan; memberi rekomendasi perbaikan ke manajemen puncak; dan memantau tindak lanjut audit serta evaluasi kinerja energi.',
      'Saya melapor kepada Pengarah Manajemen Puncak (Plt. Direktur dan SEVP Operation). Pelaksanaan teknis dikoordinasikan Manajer Energi.',
    ],
    bukti: 'SK No. KINRA/SKPTS/47/2026 beserta Lampiran I dan II, bagan organisasi tim SMEn.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit (5.3)' }],
    hindari: 'Menyebut tugas teknis (menghitung EnPI, menetapkan SEU) sebagai tugas Anda. Itu tugas Manajer Energi menurut SK.' },
  { id: 'A2', fungsi: 'arah', klausul: ['4.3', '4.4'], stage: 'Stage 1',
    tanya: 'Apa ruang lingkup dan batasan SMEn KINRA? Mengapa tenant tidak termasuk?',
    jawab: [
      'Diktum Ketiga SK: kegiatan pengembangan, pengelolaan, dan pelayanan di KEK Sei Mangkei yang berada dalam kendali operasional PT KINRA, termasuk administrasi, gedung, infrastruktur, fasilitas kawasan (WTP, penerangan, tata udara, utilitas).',
      'Energi yang dipakai tenant di dalam pabriknya berada di luar kendali operasional KINRA, sehingga tidak masuk lingkup. EnPI kawasan yang memuat tenant hanya dipantau sebagai informasi, sasaran ditetapkan per EnPI lingkup KINRA.',
      'Lingkup terdokumentasi di Manual SMEn dan konsisten dengan batas meter yang dipakai di data energi.',
    ],
    bukti: 'Manual SMEn (lingkup & batasan), peta batas kawasan, daftar meter lingkup KINRA.',
    halaman: [{ href: '/aliran-energi', label: 'Aliran Energi' }, { href: '/aset', label: 'Aset & Meter' }],
    hindari: 'Menjawab lingkup "seluruh kawasan" lalu tidak bisa menunjukkan data energi tenant. Lingkup harus sama dengan data yang dipantau.' },
  { id: 'A3', fungsi: 'arah', klausul: ['5.1'], stage: 'Stage 2',
    tanya: 'Bagaimana Anda tahu manajemen puncak benar-benar terlibat, bukan sekadar menandatangani?',
    jawab: [
      'Manajemen puncak menandatangani kebijakan energi dan SK tim, memimpin tinjauan manajemen, dan menyetujui sasaran serta anggaran program energi.',
      'Diktum Kedelapan SK menugaskan manajemen puncak menyediakan sumber daya dan memutuskan sasaran, program, risiko, peluang, dan temuan audit; keputusan itu tercatat di notulen tinjauan manajemen.',
    ],
    bukti: 'Kebijakan energi bertanda tangan, notulen tinjauan manajemen, persetujuan anggaran/RKAP program energi.',
    halaman: [{ href: '/direksi', label: 'Ringkasan Direksi' }],
    hindari: 'Menjawab atas nama direksi. Cukup tunjukkan bukti keterlibatan; auditor akan mewawancarai direksi sendiri.' },
  { id: 'A4', fungsi: 'arah', klausul: ['5.2'], stage: 'Stage 1 & 2',
    tanya: 'Apa isi kebijakan energi dan bagaimana Anda memastikan karyawan memahaminya?',
    jawab: [
      'Kebijakan memuat komitmen peningkatan kinerja energi berkelanjutan, ketersediaan informasi dan sumber daya untuk mencapai sasaran, pemenuhan persyaratan hukum, serta dukungan pengadaan dan desain yang mempertimbangkan kinerja energi.',
      'Disosialisasikan oleh Anggota Tim SDM/Komunikasi; pemahaman diuji lewat daftar hadir sosialisasi dan wawancara personel SEU.',
    ],
    bukti: 'Kebijakan SMEn KINRA (2026) bertanda tangan, bukti sosialisasi dan daftar hadir.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit (5.2)' }],
    hindari: 'Tidak hafal minimal empat komitmen wajib dalam kebijakan.' },
  { id: 'A5', fungsi: 'arah', klausul: ['5.3', '7.4'], stage: 'Stage 2',
    tanya: 'Bagaimana Anda mengoordinasikan tim yang anggotanya dari banyak bagian?',
    jawab: [
      'Melalui rapat tim SMEn terjadwal; agenda dan notulen disiapkan Sekretaris/Dokumen Kontrol.',
      'Setiap tindak lanjut rapat punya PIC dan tenggat, dan statusnya dipantau di rapat berikutnya. Diktum Ketujuh mewajibkan pemilik proses menyediakan data, akses, dan bukti.',
    ],
    bukti: 'Jadwal dan notulen rapat tim SMEn, daftar tindak lanjut.',
    halaman: [{ href: '/timeline', label: 'Timeline & PICA' }] },
  { id: 'A6', fungsi: 'arah', klausul: ['7.5'], stage: 'Stage 1 & 2',
    tanya: 'Bagaimana Anda memastikan dokumen yang dipakai adalah versi terkini?',
    jawab: [
      'Dokumen dikendalikan Sekretaris/Dokumen Kontrol: daftar induk dokumen, nomor revisi, pengesahan, dan distribusi.',
      'Aplikasi SMEn menandai berkas "versi sah"; dokumen dianggap siap audit hanya bila berstatus Final dan memiliki berkas versi sah.',
    ],
    bukti: 'Daftar induk dokumen, riwayat revisi, berkas versi sah.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit' }, { href: '/dependensi', label: 'Peta Evidence' }],
    hindari: 'Membuka draf atau berkas lama di depan auditor. Siapkan hanya versi sah.' },
  { id: 'A7', fungsi: 'arah', klausul: ['4.1', '4.2'], stage: 'Stage 1',
    tanya: 'Isu dan pihak berkepentingan apa saja yang memengaruhi SMEn KINRA?',
    jawab: [
      'Isu internal dan eksternal (kebijakan KEK, PP 33/2023 tentang Konservasi Energi, kebutuhan tenant akan air dan listrik andal, biaya energi, keandalan PLN/PLTBG) dicatat di register isu dengan penilaian risiko 5×5.',
      'Pihak berkepentingan dan persyaratannya dipetakan, dan yang relevan menjadi persyaratan SMEn.',
    ],
    bukti: 'Register isu internal/eksternal, daftar pihak berkepentingan dan persyaratannya.',
    halaman: [{ href: '/register', label: 'Isu & Peluang' }] },

  // 02 · Evaluasi sasaran & target
  { id: 'B1', fungsi: 'sasaran', klausul: ['6.2'], stage: 'Stage 1 & 2',
    tanya: 'Apa sasaran energi KINRA, dan bagaimana sasaran itu terhubung dengan EnPI?',
    jawab: [
      'Satu sasaran per EnPI lingkup KINRA, masing-masing dengan target persen, tahun target, PIC, dan rencana aksi.',
      'Sasaran tanpa EnPI (mis. kompetensi, sosialisasi) dirumuskan sebagai target kalimat yang terukur.',
      'Pencapaian dibandingkan dengan baseline ternormalisasi, bukan konsumsi mentah.',
    ],
    bukti: 'Formulir Objective & Target (6.2), daftar rencana aksi.',
    halaman: [{ href: '/sasaran', label: 'Sasaran & Aksi' }],
    hindari: 'Menyebut target yang tidak tertulis di formulir sasaran.' },
  { id: 'B2', fungsi: 'sasaran', klausul: ['6.2', '9.1'], stage: 'Stage 2',
    tanya: 'Sampai di mana pencapaian sasaran saat ini? Tunjukkan buktinya.',
    jawab: [
      'Sebutkan angka dari panel "Angka hari ini" di halaman ini: jumlah sasaran aktif/tercapai dan perbaikan EnPI utama terhadap baseline.',
      'Pencapaian dievaluasi berkala di rapat tim dan dibawa ke tinjauan manajemen.',
    ],
    bukti: 'Lembar pencapaian sasaran per bulan, grafik EnPI aktual vs harapan dan CUSUM.',
    halaman: [{ href: '/sasaran', label: 'Sasaran & Aksi' }, { href: '/kinerja', label: 'Kinerja Energi' }] },
  { id: 'B3', fungsi: 'sasaran', klausul: ['6.4', '6.5'], stage: 'Stage 2',
    tanya: 'Bagaimana Anda tahu kinerja energi membaik, bukan sekadar karena produksi atau cuaca berubah?',
    jawab: [
      'EnPI dinormalisasi dengan variabel relevan (mis. volume air olahan WTP) memakai model regresi atau rasio terhadap baseline.',
      'Penghematan = energi harapan dari model baseline dikurangi energi aktual. Kelayakan model diuji dengan ambang ISO 50006/ASHRAE Guideline 14 (R², CV(RMSE)).',
    ],
    bukti: 'Lembar EnPI & EnB, uji kelayakan model, grafik aktual vs harapan.',
    halaman: [{ href: '/kinerja', label: 'Kinerja Energi' }, { href: '/lab-enpi', label: 'Laboratorium EnPI' }],
    hindari: 'Membandingkan kWh tahun ini vs tahun lalu tanpa normalisasi sebagai bukti peningkatan.' },
  { id: 'B4', fungsi: 'sasaran', klausul: ['10.2'], stage: 'Stage 2',
    tanya: 'Apa bukti peningkatan kinerja energi yang bisa Anda tunjukkan untuk sertifikasi?',
    jawab: [
      'ISO 50003 mensyaratkan peningkatan kinerja energi yang terbukti. Bukti utama: EnPI utama lebih efisien dari baseline dan CUSUM menurun.',
      'Didukung rencana aksi yang selesai dengan penghematan terverifikasi (kWh) dan metode verifikasinya.',
    ],
    bukti: 'Laporan kinerja energi, rekap penghematan terverifikasi per aksi.',
    halaman: [{ href: '/kinerja', label: 'Kinerja Energi' }, { href: '/sasaran', label: 'Sasaran & Aksi' }],
    hindari: 'Mengklaim penghematan dari aksi yang belum diverifikasi.' },
  { id: 'B5', fungsi: 'sasaran', klausul: ['6.2'], stage: 'Stage 2',
    tanya: 'Bila sasaran tidak tercapai, apa yang Anda lakukan?',
    jawab: [
      'Penyebab dianalisis bersama Manajer Energi dan PIC; rencana aksi disesuaikan (PIC, sumber daya, jadwal) dan dicatat.',
      'Bila perlu sumber daya tambahan atau perubahan target, saya membawa rekomendasinya ke manajemen puncak lewat tinjauan manajemen.',
    ],
    bukti: 'Catatan evaluasi sasaran, revisi rencana aksi, notulen tinjauan manajemen.',
    halaman: [{ href: '/sasaran', label: 'Sasaran & Aksi' }] },
  { id: 'B6', fungsi: 'sasaran', klausul: ['6.5'], stage: 'Stage 2',
    tanya: 'Kapan baseline energi direvisi, dan siapa yang memutuskan?',
    jawab: [
      'Baseline direvisi bila EnPI tidak lagi mencerminkan kinerja, ada perubahan besar pada faktor statis (mis. penambahan fasilitas atau perubahan proses WTP), atau sesuai metode yang ditetapkan.',
      'Usulan revisi disiapkan Manajer Energi dan PIC Perubahan Signifikan Energi; alasan dan tanggal revisi didokumentasikan.',
    ],
    bukti: 'Catatan perubahan baseline dan alasannya.',
    halaman: [{ href: '/kinerja', label: 'Kinerja Energi' }],
    hindari: 'Mengubah baseline tanpa alasan tertulis supaya angka terlihat lebih baik.' },

  // 03 · Hambatan
  { id: 'C1', fungsi: 'hambatan', klausul: ['6.1'], stage: 'Stage 2',
    tanya: 'Hambatan apa yang Anda temukan dalam penerapan SMEn, dan apa tindakannya?',
    jawab: [
      'Sebutkan 2–3 hambatan nyata (mis. meter belum lengkap/terkalibrasi, data bulanan terlambat, kompetensi personel SEU) beserta tindakan, PIC, dan statusnya.',
      'Hambatan dicatat sebagai kendala dan tindak lanjut (PICA) di timeline, atau sebagai risiko di register isu.',
    ],
    bukti: 'Daftar kendala & PICA, register risiko, notulen rapat.',
    halaman: [{ href: '/timeline', label: 'Timeline & PICA' }, { href: '/register', label: 'Isu & Peluang' }],
    hindari: 'Menjawab "tidak ada hambatan". Auditor menganggapnya tanda pemantauan lemah.' },
  { id: 'C2', fungsi: 'hambatan', klausul: ['6.1'], stage: 'Stage 1 & 2',
    tanya: 'Bagaimana risiko dan peluang SMEn ditentukan dan ditangani?',
    jawab: [
      'Risiko dan peluang diturunkan dari isu (4.1) dan persyaratan pihak berkepentingan (4.2), dinilai dengan matriks 5×5, lalu yang signifikan diberi tindakan.',
      'Peluang peningkatan kinerja energi dari tinjauan energi masuk daftar peluang dan diprioritaskan menjadi rencana aksi.',
    ],
    bukti: 'Register isu & risiko, daftar peluang peningkatan.',
    halaman: [{ href: '/register', label: 'Isu & Peluang' }] },
  { id: 'C3', fungsi: 'hambatan', klausul: ['7.1'], stage: 'Stage 2',
    tanya: 'Apakah sumber daya SMEn cukup? Bagaimana Anda tahu?',
    jawab: [
      'Kebutuhan sumber daya (SDM, anggaran, alat ukur, sistem informasi) dinilai dari rencana aksi dan diusulkan ke manajemen puncak.',
      'Kecukupan diukur dari tidak adanya aksi yang tertunda karena sumber daya; aksi yang terlambat ditelusuri penyebabnya.',
    ],
    bukti: 'Usulan anggaran, persetujuan, realisasi; status rencana aksi.',
    halaman: [{ href: '/sasaran', label: 'Sasaran & Aksi' }] },
  { id: 'C4', fungsi: 'hambatan', klausul: ['7.2', '7.3'], stage: 'Stage 2',
    tanya: 'Bagaimana kompetensi personel yang memengaruhi SEU dipastikan?',
    jawab: [
      'Anggota Tim SDM/Komunikasi mengoordinasikan identifikasi kebutuhan kompetensi, pelatihan, dan sosialisasi.',
      'Personel SEU (operator WTP, teknisi kelistrikan) punya matriks kompetensi dan rekaman pelatihan; kesadaran diuji lewat wawancara.',
    ],
    bukti: 'Matriks kompetensi, rekaman pelatihan, daftar hadir sosialisasi.',
    halaman: [{ href: '/tinjauan', label: 'Tinjauan Energi & SEU' }] },

  // 04 · Rekomendasi ke manajemen puncak
  { id: 'D1', fungsi: 'rekomendasi', klausul: ['9.3'], stage: 'Stage 2',
    tanya: 'Kapan tinjauan manajemen terakhir dilakukan, dan apa saja masukannya?',
    jawab: [
      'Sebutkan tanggal dari jadwal tinjauan manajemen di Timeline.',
      'Masukan wajib 9.3: status tindakan tinjauan sebelumnya; perubahan isu, persyaratan hukum, dan risiko/peluang; kinerja energi dan EnPI; pencapaian sasaran; hasil audit dan status ketidaksesuaian; kecukupan sumber daya; hasil evaluasi kepatuhan; usulan peningkatan.',
    ],
    bukti: 'Laporan/materi tinjauan manajemen dan notulennya.',
    halaman: [{ href: '/timeline', label: 'Timeline' }, { href: '/direksi', label: 'Ringkasan Direksi' }],
    hindari: 'Materi tinjauan masih berstatus DRAFT saat audit Stage 2. Pastikan sudah final dan bertanda tangan.' },
  { id: 'D2', fungsi: 'rekomendasi', klausul: ['9.3'], stage: 'Stage 2',
    tanya: 'Apa keputusan tinjauan manajemen, dan bagaimana tindak lanjutnya dipantau?',
    jawab: [
      'Keluaran 9.3: keputusan tentang peluang peningkatan, perubahan kebijakan/sasaran/EnPI/EnB, kebutuhan sumber daya, dan integrasi SMEn ke proses bisnis.',
      'Setiap keputusan diberi PIC dan tenggat, dan statusnya menjadi masukan tinjauan berikutnya.',
    ],
    bukti: 'Notulen tinjauan manajemen dengan daftar keputusan dan tindak lanjut.',
    halaman: [{ href: '/timeline', label: 'Timeline & PICA' }] },
  { id: 'D3', fungsi: 'rekomendasi', klausul: ['5.1', '9.3'], stage: 'Stage 2',
    tanya: 'Rekomendasi perbaikan apa yang sudah Anda sampaikan ke manajemen puncak?',
    jawab: [
      'Sebutkan contoh konkret, mis. usulan VSD pompa WTP, perbaikan meter, penambahan anggaran, atau penyesuaian sasaran, beserta keputusan direksinya.',
      'Rekomendasi disampaikan melalui tinjauan manajemen atau memo, dan tercatat.',
    ],
    bukti: 'Notulen tinjauan manajemen, memo rekomendasi, kajian peluang.',
    halaman: [{ href: '/pompa-vsd', label: 'Simulasi Pompa & VSD' }, { href: '/register', label: 'Isu & Peluang' }],
    hindari: 'Rekomendasi hanya lisan tanpa catatan.' },
  { id: 'D4', fungsi: 'rekomendasi', klausul: ['10.2'], stage: 'Stage 2',
    tanya: 'Bagaimana SMEn dibuktikan terus membaik dari waktu ke waktu?',
    jawab: [
      'Peningkatan berkelanjutan dibuktikan lewat dua sisi: kinerja energi (EnPI membaik terhadap baseline) dan kecocokan, kecukupan, serta efektivitas SMEn (temuan tertutup, proses makin matang).',
      'Siklus PDCA berjalan: tinjauan energi → sasaran → aksi → pemantauan → audit → tinjauan manajemen → perbaikan.',
    ],
    bukti: 'Tren EnPI, register temuan, notulen tinjauan manajemen.',
    halaman: [{ href: '/peta', label: 'Peta SMEn' }, { href: '/kinerja', label: 'Kinerja Energi' }] },

  // 05 · Tindak lanjut audit
  { id: 'E1', fungsi: 'audit', klausul: ['9.2'], stage: 'Stage 1 & 2',
    tanya: 'Bagaimana program audit internal SMEn disusun dan dijalankan?',
    jawab: [
      'Auditor internal ditetapkan di Lampiran II SK (Ketua Auditor dan tiga auditor) dengan kompetensi ISO 50001:2018 dan teknik audit.',
      'Program audit menetapkan tujuan, kriteria, lingkup, metode, jadwal, auditor, dan pelaporan; audit mengacu ISO 19011:2018.',
      'Audit internal mencakup seluruh klausul dan seluruh lingkup sebelum Stage 2.',
    ],
    bukti: 'Program dan rencana audit internal, checklist, laporan audit, bukti kompetensi auditor.',
    halaman: [{ href: '/tanya-jawab', label: 'Tanya Jawab Audit' }, { href: '/temuan', label: 'Temuan Audit' }] },
  { id: 'E2', fungsi: 'audit', klausul: ['10.1'], stage: 'Stage 2',
    tanya: 'Berapa temuan audit internal yang masih terbuka, dan mengapa?',
    jawab: [
      'Sebutkan angka dari panel "Angka hari ini": temuan terbuka dan yang melewati tenggat.',
      'Untuk setiap temuan terbuka: akar masalah, tindakan, PIC, tenggat. Yang terlambat sudah saya eskalasi dan tercatat.',
    ],
    bukti: 'Register temuan dengan status, tenggat, dan catatan eskalasi.',
    halaman: [{ href: '/temuan', label: 'Temuan Audit' }],
    hindari: 'Tidak tahu jumlah temuan terbuka. Ini pertanyaan hampir pasti untuk MR.' },
  { id: 'E3', fungsi: 'audit', klausul: ['10.1'], stage: 'Stage 2',
    tanya: 'Bagaimana Anda memastikan tindakan korektif benar-benar efektif?',
    jawab: [
      'Temuan ditutup hanya setelah verifikasi efektivitas: bukti pelaksanaan diperiksa dan masalah tidak berulang dalam periode pemantauan.',
      'Verifikasi dilakukan auditor internal atau pihak yang tidak melaksanakan tindakannya.',
    ],
    bukti: 'Rekaman verifikasi dan keputusan penutupan temuan.',
    halaman: [{ href: '/temuan', label: 'Temuan Audit' }],
    hindari: 'Menutup temuan hanya karena tindakan sudah dilakukan, tanpa cek efektivitas.' },
  { id: 'E4', fungsi: 'audit', klausul: ['10.1'], stage: 'Stage 2',
    tanya: 'Ceritakan satu ketidaksesuaian dari awal sampai tertutup.',
    jawab: [
      'Pilih satu temuan nyata dan ceritakan urutannya: uraian temuan → koreksi segera → analisis akar masalah (mis. 5-why) → tindakan korektif → verifikasi → penutupan → pembelajaran ke proses lain.',
    ],
    bukti: 'Satu berkas temuan lengkap dari awal sampai tertutup.',
    halaman: [{ href: '/temuan', label: 'Temuan Audit' }],
    hindari: 'Belum menyiapkan contoh. Pilih contohnya sebelum audit.' },

  // 06 · Tindak lanjut evaluasi kinerja energi
  { id: 'F1', fungsi: 'kinerja', klausul: ['9.1'], stage: 'Stage 2',
    tanya: 'Apa yang terjadi bila ada deviasi signifikan kinerja energi?',
    jawab: [
      'Deviasi terdeteksi otomatis bila selisih bulanan melebihi ambang atau CUSUM memburuk beberapa bulan berturut-turut.',
      'Setiap deviasi diselidiki pemilik proses (penyebab, kategori, tindakan) dalam batas waktu yang ditetapkan, lalu diverifikasi dan ditutup. Saya memantau yang belum ditanggapi.',
    ],
    bukti: 'Register deviasi signifikan dengan hasil penyelidikan.',
    halaman: [{ href: '/kinerja', label: 'Kinerja Energi (deviasi)' }] },
  { id: 'F2', fungsi: 'kinerja', klausul: ['6.3'], stage: 'Stage 1 & 2',
    tanya: 'Apa SEU KINRA dan mengapa itu yang dipilih?',
    jawab: [
      'SEU ditetapkan dari tinjauan energi dengan kriteria porsi konsumsi besar dan/atau potensi peningkatan kinerja yang besar (analisis Pareto).',
      'Sebutkan SEU yang ditetapkan beserta porsinya (mis. pompa WTP), variabel relevan, dan personel yang memengaruhinya.',
      'Penetapan teknisnya oleh Manajer Energi; saya memastikan tinjauan dilakukan dan diperbarui berkala.',
    ],
    bukti: 'Laporan tinjauan energi, register SEU.',
    halaman: [{ href: '/tinjauan', label: 'Tinjauan Energi & SEU' }, { href: '/alur-wtp', label: 'Alur Proses WTP' }] },
  { id: 'F3', fungsi: 'kinerja', klausul: ['6.6'], stage: 'Stage 2',
    tanya: 'Bagaimana keakuratan data energi dijamin?',
    jawab: [
      'PIC Data Energi/PIC Meter memastikan data lengkap, akurat, dan tertelusur, serta alat ukur dipelihara dan dikalibrasi.',
      'Rencana pengumpulan data memuat meter, frekuensi bacaan, faktor kali, dan PIC; aplikasi memeriksa bulan kosong dan bacaan janggal.',
    ],
    bukti: 'Rencana pengumpulan data energi, jadwal & sertifikat kalibrasi meter, rekaman bacaan.',
    halaman: [{ href: '/aset', label: 'Aset & Meter' }, { href: '/energi', label: 'Data Energi' }],
    hindari: 'Tidak bisa menunjukkan status kalibrasi meter utama.' },
  { id: 'F4', fungsi: 'kinerja', klausul: ['8.1'], stage: 'Stage 2',
    tanya: 'Bagaimana SEU dikendalikan dalam operasi sehari-hari?',
    jawab: [
      'Kriteria operasi dan pemeliharaan SEU ditetapkan dalam SOP (mis. pola operasi pompa WTP, setelan VSD) dan dikomunikasikan ke operator.',
      'Anggota Tim Operasional/Fasilitas dan Teknik/Pemeliharaan memantau kepatuhan dan melaporkan penyimpangan.',
    ],
    bukti: 'SOP operasi SEU, log operasi, rekaman pemeliharaan.',
    halaman: [{ href: '/alur-wtp', label: 'Alur Proses WTP' }] },
  { id: 'F5', fungsi: 'kinerja', klausul: ['8.2', '8.3'], stage: 'Stage 2',
    tanya: 'Bagaimana kinerja energi dipertimbangkan saat desain dan pengadaan?',
    jawab: [
      'PIC Desain dan Pengembangan mengevaluasi alternatif desain hemat energi pada fasilitas baru atau modifikasi.',
      'Anggota Tim Pengadaan memasukkan kriteria efisiensi energi dalam spesifikasi dan menginformasikan ke pemasok bahwa kinerja energi menjadi salah satu kriteria evaluasi.',
    ],
    bukti: 'Spesifikasi pengadaan dengan kriteria energi, catatan evaluasi desain.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit (8.2, 8.3)' }] },

  // 07 · Celah SK & pertanyaan menjebak
  { id: 'G1', fungsi: 'celah', klausul: ['5.3'], stage: 'Stage 1 & 2',
    tanya: 'Apa wewenang Anda sebagai MR? Di SK hanya tertulis tugas.',
    jawab: [
      'Menimbang huruf a SK menegaskan tim memiliki tugas, tanggung jawab, dan wewenang yang jelas. Dalam praktik wewenang saya: meminta data, akses, dan bukti dari pemilik proses (Diktum Ketujuh), menetapkan agenda dan tindak lanjut rapat tim, serta mengeskalasi kendala dan temuan terlambat ke manajemen puncak.',
      'Bila sudah ada, tunjukkan lampiran uraian wewenang atau revisi SK (Diktum Kesembilan mengizinkan pembaruan).',
    ],
    bukti: 'SK dan, bila ada, lampiran uraian wewenang/revisi SK.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit (5.3)' }],
    hindari: 'Menjawab "wewenang saya tidak diatur". Siapkan rumusan wewenang tertulis sebelum audit.' },
  { id: 'G2', fungsi: 'celah', klausul: ['5.3'], stage: 'Stage 2',
    tanya: 'Siapa yang melaporkan kinerja SMEn ke manajemen puncak: Anda atau Manajer Energi?',
    jawab: [
      'Manajer Energi menyusun laporan kinerja energi berkala (Diktum Ketujuh). Saya mereview, menambahkan evaluasi pencapaian sasaran dan rekomendasi, lalu membawanya ke manajemen puncak, terutama dalam tinjauan manajemen.',
      'Jawaban ini harus sama persis dengan jawaban Manajer Energi bila ditanya terpisah.',
    ],
    bukti: 'Laporan kinerja energi berkala dan notulen penyampaiannya.',
    halaman: [{ href: '/direksi', label: 'Ringkasan Direksi' }],
    hindari: 'Jawaban MR dan Manajer Energi berbeda. Samakan sebelum audit.' },
  { id: 'G3', fungsi: 'celah', klausul: ['9.2'], stage: 'Stage 2',
    tanya: 'Ketua Auditor juga Sekretaris/Dokumen Kontrol SMEn. Bagaimana independensi audit dijamin?',
    jawab: [
      'Diktum Keenam SK melarang auditor mengaudit pekerjaan atau proses yang menjadi tanggung jawabnya sendiri.',
      'Dalam program audit, klausul 7.5 (pengendalian informasi terdokumentasi) dan kesekretariatan diaudit oleh auditor lain, bukan oleh Ketua Auditor.',
    ],
    bukti: 'Rencana audit internal yang menunjukkan penugasan auditor per klausul.',
    halaman: [{ href: '/temuan', label: 'Temuan Audit' }],
    hindari: 'Rencana audit menugaskan Ketua Auditor ke klausul 7.5.' },
  { id: 'G4', fungsi: 'celah', klausul: ['5.3'], stage: 'Stage 1',
    tanya: 'Siapa saja anggota Steering Committee?',
    jawab: [
      'Di SK, "MR/Steering Committee" adalah satu peran pengarah dan pengawas pelaksanaan, yang dijalankan bersama Pengarah Manajemen Puncak dalam forum rapat tim dan tinjauan manajemen.',
      'Keputusan strategis tetap di manajemen puncak (Diktum Kedelapan).',
    ],
    bukti: 'SK Lampiran I, notulen rapat pengarah.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit (5.3)' }] },
  { id: 'G5', fungsi: 'celah', klausul: ['5.3'], stage: 'Stage 1',
    tanya: 'ISO 50001:2018 tidak lagi mewajibkan MR. Mengapa KINRA masih memakainya?',
    jawab: [
      'Benar, versi 2018 meminta manajemen puncak menetapkan tim manajemen energi dan menugaskan tanggung jawab serta wewenang (5.3). KINRA memilih menetapkan satu MR sebagai penghubung tim dengan manajemen puncak agar koordinasi lintas bagian jelas.',
      'Tanggung jawab yang disyaratkan 5.3 a–f tetap tercakup di peran MR, Manajer Energi, dan tim.',
    ],
    bukti: 'SK tim SMEn dan pemetaan peran ke 5.3.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit (5.3)' }] },
  { id: 'G6', fungsi: 'celah', klausul: ['9.1'], stage: 'Stage 2',
    tanya: 'Konsumsi listrik naik dibanding tahun lalu. Bagaimana Anda bisa bilang kinerja energi membaik?',
    jawab: [
      'Konsumsi absolut bisa naik karena variabel relevan naik (mis. volume air olahan atau jumlah tenant). Yang dinilai adalah kinerja ternormalisasi: energi aktual dibandingkan energi harapan dari model baseline pada kondisi yang sama.',
      'Tunjukkan jembatan perubahan konsumsi (dekomposisi) di halaman Kinerja Energi yang memisahkan efek aktivitas dari efek efisiensi.',
    ],
    bukti: 'Grafik dekomposisi perubahan energi, EnPI ternormalisasi.',
    halaman: [{ href: '/kinerja', label: 'Kinerja Energi' }],
    hindari: 'Panik dan membenarkan bahwa kinerja memburuk tanpa melihat data ternormalisasi.' },
]

/** Sikap MR selama audit eksternal. */
export const SIKAP_AUDIT = [
  { judul: 'Jawab yang ditanya, lalu tunjukkan bukti', isi: 'Jawaban singkat, langsung buka dokumen atau halaman aplikasinya. Jangan menambah cerita yang tidak ditanya.' },
  { judul: 'Jangan menebak', isi: 'Bila tidak tahu: "Akan kami tunjukkan buktinya" lalu panggil PIC yang tepat. Tebakan yang salah bisa menjadi temuan.' },
  { judul: 'Arahkan ke PIC', isi: 'Pertanyaan teknis EnPI/SEU ke Manajer Energi, data meter ke PIC Data Energi, dokumen ke Sekretaris/Dokumen Kontrol.' },
  { judul: 'Catat semua permintaan', isi: 'Siapkan notulis. Setiap bukti yang diminta dan dijanjikan dicatat, lalu dipenuhi sebelum closing meeting.' },
  { judul: 'Pahami kelas temuan', isi: 'Mayor: sistem tidak berjalan pada satu persyaratan (menahan sertifikasi). Minor: kelalaian sesaat. OFI: peluang perbaikan, tidak wajib ditindaklanjuti.' },
  { judul: 'Satu suara dengan tim', isi: 'Lakukan briefing pagi: samakan jawaban tentang lingkup, SEU, EnPI utama, sasaran, dan alur pelaporan.' },
]

/** Daftar periksa pribadi MR sebelum audit eksternal. */
export const DAFTAR_PERIKSA_MR = [
  'SK tim SMEn final dan bertanda tangan tersedia, termasuk lampiran',
  'Rumusan wewenang MR tertulis (lampiran SK atau revisi)',
  'Alur pelaporan kinerja ke manajemen puncak disepakati dengan Manajer Energi',
  'Kebijakan energi hafal minimal empat komitmen wajibnya',
  'Ruang lingkup & batasan bisa dijelaskan dalam dua kalimat',
  'Angka EnPI utama, jumlah sasaran, dan status pencapaiannya hafal',
  'Laporan tinjauan manajemen final (bukan DRAFT) dan notulennya bertanda tangan',
  'Program dan laporan audit internal lengkap, penugasan auditor menjaga independensi',
  'Jumlah temuan internal terbuka dan alasan keterlambatannya diketahui',
  'Satu contoh temuan lengkap dari awal sampai tertutup disiapkan',
  'Satu contoh deviasi kinerja energi yang diselidiki disiapkan',
  'Dua atau tiga hambatan penerapan beserta tindakannya bisa disebutkan',
]
