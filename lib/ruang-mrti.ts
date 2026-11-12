/**
 * Ruang Manajemen Risiko & TI: bahan persiapan audit untuk Bagian Manajemen Risiko & TI sebagai auditee.
 * Dasar: unit 9 "Manajemen Risiko & TI" pada materi audit internal SMEn KINRA 2026 (klausul 4.1, 4.2, 6.1, 6.6,
 * 7.5, 8.1, 9.1, 10.1), ditambah peran personel bagian ini di SK No. KINRA/SKPTS/47/2026:
 * Kepala Bagian sebagai MR/Steering Committee, Kepala Sub Bagian Manajemen Risiko sebagai Sekretaris/Dokumen
 * Kontrol SMEn sekaligus Ketua Auditor internal.
 *
 * Jawaban adalah contoh respons yang diharapkan, bukan pernyataan bahwa KINRA sudah memenuhi persyaratan.
 */
import type { Fungsi, TanyaMr } from './ruang-mr'

export const BAGIAN_MRTI = {
  nama: 'Bagian Manajemen Risiko & TI',
  unitAudit: 9,
  /** Pola pencocokan nama bagian/auditee/PIC pada data aplikasi */
  pola: /risiko|\bti\b|teknologi informasi/i,
  peranSk: [
    { jabatan: 'Kepala Bagian Manajemen Risiko & TI', peran: 'MR/Steering Committee' },
    { jabatan: 'Kepala Sub Bagian Manajemen Risiko', peran: 'Sekretaris/Dokumen Kontrol SMEn dan Ketua Auditor internal' },
  ],
  ringkas: 'Auditor memeriksa bagian ini dari dua sisi: sebagai pengelola risiko dan data/sistem informasi yang menopang SMEn, dan sebagai unit kerja biasa yang wajib memahami kebijakan energi dan sasarannya sendiri.',
}

export const KELOMPOK_MRTI: Fungsi[] = [
  { kode: 'umum', no: '01', judul: 'Kesadaran & peran bagian dalam SMEn', dasar: 'semua unit kerja dalam lingkup SMEn',
    klausul: '5.2, 5.3, 6.2, 7.3', inti: 'Pertanyaan pembuka untuk setiap auditee: tahu kebijakan energi, tahu peran bagiannya, tahu sasaran bagiannya.' },
  { kode: 'risiko', no: '02', judul: 'Konteks, risiko & peluang', dasar: 'unit 9 materi audit internal · klausul 4.1, 4.2, 6.1',
    klausul: '4.1, 4.2, 6.1', inti: 'Inti tugas bagian: isu dan persyaratan pihak berkepentingan masuk ke profil risiko, dinilai, diberi perlakuan, dan dipantau.' },
  { kode: 'data', no: '03', judul: 'Data energi & sistem informasi', dasar: 'unit 9 materi audit internal · klausul 6.6, 9.1',
    klausul: '6.6, 9.1', inti: 'Auditor menelusuri angka EnPI mundur sampai ke bacaan meter. TI harus bisa menunjukkan bahwa jalurnya utuh, valid, dan aman.' },
  { kode: 'dokumen', no: '04', judul: 'Informasi terdokumentasi digital', dasar: 'unit 9 materi audit internal · klausul 7.5',
    klausul: '7.5', inti: 'Hak akses, versi sah, cadangan, dan pemulihan dokumen serta rekaman SMEn yang disimpan secara digital.' },
  { kode: 'operasi', no: '05', judul: 'Pengendalian operasi & pengadaan TI', dasar: 'unit 9 materi audit internal · klausul 8.1, 8.3',
    klausul: '8.1, 8.3', inti: 'Perangkat TI juga pengguna energi. Auditor bisa menanyakan ruang server, AC presisi, UPS, dan kriteria energi saat membeli perangkat.' },
  { kode: 'perbaikan', no: '06', judul: 'Ketidaksesuaian, insiden data & audit', dasar: 'unit 9 materi audit internal · klausul 9.2, 10.1',
    klausul: '9.2, 10.1', inti: 'Gangguan data dan temuan audit untuk bagian ini harus ditangani sampai akar masalah dan diverifikasi.' },
  { kode: 'celah', no: '07', judul: 'Pertanyaan menjebak', dasar: 'rangkap peran personel bagian di SK',
    klausul: '5.3, 7.5, 9.2', inti: 'Muncul karena personel bagian ini memegang peran kunci SMEn sekaligus menjadi auditee.' },
]

export const TANYA_MRTI: TanyaMr[] = [
  // 01 · Kesadaran & peran bagian
  { id: 'R1', fungsi: 'umum', klausul: ['5.2', '7.3'], stage: 'Stage 2',
    tanya: 'Apa isi kebijakan energi KINRA, dan apa kontribusi bagian Anda terhadapnya?',
    jawab: [
      'Kebijakan berkomitmen pada peningkatan kinerja energi berkelanjutan, ketersediaan informasi dan sumber daya, pemenuhan persyaratan hukum, serta pengadaan dan desain yang mempertimbangkan kinerja energi.',
      'Kontribusi bagian: memastikan risiko SMEn terkelola, menyediakan sistem informasi dan data energi yang andal, mengendalikan dokumen SMEn, serta memakai energi secara hemat di area kerja sendiri (perangkat TI, AC, penerangan).',
    ],
    bukti: 'Kebijakan SMEn bertanda tangan, daftar hadir sosialisasi personel bagian.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit (5.2)' }],
    hindari: 'Staf bagian tidak tahu kebijakan energi sama sekali. Auditor sering bertanya ke staf, bukan hanya ke kepala bagian.' },
  { id: 'R2', fungsi: 'umum', klausul: ['5.3'], stage: 'Stage 1 & 2',
    tanya: 'Siapa dari bagian Anda yang terlibat dalam tim SMEn, dan apa perannya?',
    jawab: [
      'Menurut SK No. KINRA/SKPTS/47/2026: Kepala Bagian Manajemen Risiko & TI sebagai MR/Steering Committee; Kepala Sub Bagian Manajemen Risiko sebagai Sekretaris/Dokumen Kontrol SMEn dan Ketua Auditor internal.',
      'Fungsi TI mendukung PIC Data Energi dalam penyediaan sistem pencatatan dan penyimpanan data.',
    ],
    bukti: 'SK tim SMEn Lampiran I dan II.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit (5.3)' }] },
  { id: 'R3', fungsi: 'umum', klausul: ['6.2'], stage: 'Stage 2',
    tanya: 'Apakah bagian Anda punya sasaran energi? Bagaimana pencapaiannya?',
    jawab: [
      'Sebutkan sasaran yang dicantumkan untuk bagian ini di Formulir Objective & Target (lihat "Fakta hari ini"), mis. sosialisasi, keandalan data energi, atau penghematan di area kerja.',
      'Pencapaian dipantau berkala dan dilaporkan ke Manajer Energi.',
    ],
    bukti: 'Formulir Objective & Target bagian, lembar pencapaian.',
    halaman: [{ href: '/sasaran', label: 'Sasaran & Aksi' }],
    hindari: 'Mengatakan "sasaran energi urusan bagian teknik saja".' },
  { id: 'R4', fungsi: 'umum', klausul: ['7.3'], stage: 'Stage 2',
    tanya: 'Apa akibatnya bila bagian Anda tidak menjalankan persyaratan SMEn?',
    jawab: [
      'Klausul 7.3 meminta personel memahami dampak ketidaksesuaian. Contoh: data energi yang hilang atau salah membuat EnPI tidak valid, deviasi tidak terdeteksi, dan klaim penghematan tidak dapat diverifikasi; risiko yang tidak dipantau bisa menggagalkan sasaran.',
    ],
    bukti: 'Materi sosialisasi/kesadaran SMEn.',
    halaman: [{ href: '/peta', label: 'Peta SMEn' }] },

  // 02 · Konteks, risiko & peluang
  { id: 'R5', fungsi: 'risiko', klausul: ['4.1', '4.2'], stage: 'Stage 1 & 2',
    tanya: 'Bagaimana isu internal/eksternal dan persyaratan pihak berkepentingan masuk ke manajemen risiko?',
    jawab: [
      'Isu (mis. regulasi konservasi energi PP 33/2023, keandalan pasokan PLN/PLTBG, kebutuhan tenant akan air dan listrik, biaya energi) dan persyaratan pihak berkepentingan dicatat di register isu, lalu dinilai dengan matriks risiko 5×5 yang sama dengan profil risiko perusahaan.',
      'Register ditinjau berkala dan saat ada perubahan kawasan (tenant baru, fasilitas baru, perubahan regulasi).',
    ],
    bukti: 'Register isu internal/eksternal, daftar pihak berkepentingan, profil risiko perusahaan.',
    halaman: [{ href: '/register', label: 'Isu & Peluang' }] },
  { id: 'R6', fungsi: 'risiko', klausul: ['6.1'], stage: 'Stage 2',
    tanya: 'Bagaimana risiko SMEn dinilai? Apa kriteria "signifikan"?',
    jawab: [
      'Skor = dampak × kemungkinan (1–5 masing-masing). Kategori: sedang mulai skor 5, tinggi mulai 10, ekstrem mulai 15.',
      'Risiko signifikan wajib punya perlakuan, PIC, target, dan dinilai ulang sebagai risiko residual setelah perlakuan.',
    ],
    bukti: 'Formulir Risiko 6.1 dengan skor inheren dan residual.',
    halaman: [{ href: '/register', label: 'Isu & Peluang' }],
    hindari: 'Kriteria penilaian di register SMEn berbeda dengan pedoman manajemen risiko perusahaan tanpa penjelasan.' },
  { id: 'R7', fungsi: 'risiko', klausul: ['6.1'], stage: 'Stage 2',
    tanya: 'Tunjukkan satu risiko tinggi dan buktikan perlakuannya berjalan.',
    jawab: [
      'Pilih satu risiko tinggi dari register: uraian, skor awal, tindakan, PIC, bukti pelaksanaan, skor residual, dan evaluasi efektivitasnya.',
    ],
    bukti: 'Baris register risiko dan bukti pelaksanaan tindakannya.',
    halaman: [{ href: '/register', label: 'Isu & Peluang' }],
    hindari: 'Risiko tinggi tanpa tindakan atau tanpa evaluasi. Cek angka di "Fakta hari ini".' },
  { id: 'R8', fungsi: 'risiko', klausul: ['6.1'], stage: 'Stage 2',
    tanya: 'Bagaimana peluang peningkatan kinerja energi dikelola, bukan hanya risikonya?',
    jawab: [
      'Peluang dari register isu dan dari tinjauan energi dicatat di daftar peluang, diberi skor dampak energi dan ROI, diprioritaskan, lalu yang terpilih menjadi rencana aksi di bawah sasaran.',
    ],
    bukti: 'Daftar peluang peningkatan beserta prioritasnya.',
    halaman: [{ href: '/register', label: 'Isu & Peluang' }, { href: '/sasaran', label: 'Sasaran & Aksi' }] },

  // 03 · Data energi & sistem informasi
  { id: 'R9', fungsi: 'data', klausul: ['6.6'], stage: 'Stage 2',
    tanya: 'Bagaimana TI mendukung pengumpulan data energi?',
    jawab: [
      'Data energi dicatat di aplikasi SMEn KINRA: bacaan stand meter bulanan dengan faktor kali, data konsumsi per sumber, dan variabel relevan. Aplikasi menghitung EnPI, CUSUM, dan deviasi secara otomatis.',
      'Jelaskan alur data sesuai kondisi aktual: dari catatan lapangan atau lembar kerja pencatatan, diinput PIC Data Energi, lalu tersimpan di basis data dengan jejak siapa dan kapan mengubah.',
    ],
    bukti: 'Rencana pengumpulan data energi, tampilan bacaan meter dan jejak perubahan.',
    halaman: [{ href: '/aset', label: 'Aset & Meter' }, { href: '/energi', label: 'Data Energi' }] },
  { id: 'R10', fungsi: 'data', klausul: ['6.6', '9.1'], stage: 'Stage 2',
    tanya: 'Bagaimana Anda memastikan data energi valid sebelum dianalisis?',
    jawab: [
      'Aplikasi memeriksa kualitas data otomatis: bulan kosong, stand mundur, stand tidak bersambung, selisih dengan tagihan, lonjakan, anjlok, dan pergeseran pola.',
      'Temuan kualitas data ditindaklanjuti PIC Data Energi: dikoreksi dengan catatan, atau dijelaskan bila memang kondisi nyata.',
    ],
    bukti: 'Laporan kualitas data meter dan catatan koreksinya.',
    halaman: [{ href: '/aset', label: 'Aset & Meter (kualitas data)' }],
    hindari: 'Mengoreksi angka tanpa catatan alasan. Auditor menganggapnya manipulasi data.' },
  { id: 'R11', fungsi: 'data', klausul: ['6.6'], stage: 'Stage 2',
    tanya: 'Tunjukkan penelusuran satu angka EnPI sampai ke bacaan meter.',
    jawab: [
      'Buka EnPI di Kinerja Energi → pilih bulan → lihat energi aktual → telusuri ke meter penyusunnya di Aset & Meter → stand awal, stand akhir, faktor kali → bukti fisik (foto/form bacaan, tagihan).',
    ],
    bukti: 'Rekaman bacaan meter dan bukti fisik bacaan.',
    halaman: [{ href: '/kinerja', label: 'Kinerja Energi' }, { href: '/aset', label: 'Aset & Meter' }],
    hindari: 'Belum pernah latihan penelusuran. Lakukan sekali sebelum audit bersama PIC Data Energi.' },
  { id: 'R12', fungsi: 'data', klausul: ['6.6'], stage: 'Stage 2',
    tanya: 'Bagaimana akurasi alat ukur dijamin?',
    jawab: [
      'Setiap meter tercatat dengan kelas akurasi, jadwal kalibrasi terakhir dan berikutnya. Meter yang lewat jadwal ditindaklanjuti PIC Meter.',
      'Bagian TI menjaga agar data kalibrasi tersimpan dan dapat ditunjukkan.',
    ],
    bukti: 'Daftar meter, sertifikat dan jadwal kalibrasi.',
    halaman: [{ href: '/aset', label: 'Aset & Meter' }] },

  // 04 · Informasi terdokumentasi digital
  { id: 'R13', fungsi: 'dokumen', klausul: ['7.5'], stage: 'Stage 1 & 2',
    tanya: 'Siapa yang boleh melihat dan mengubah data serta dokumen SMEn?',
    jawab: [
      'Aplikasi SMEn memakai login per pengguna dengan empat peran: Admin, Konsultan, Tim KINRA, dan Pembaca. Hak setiap peran diatur dalam matriks akses dan dikunci di basis data (row level security), bukan hanya di tampilan.',
      'Pembaca hanya melihat; persetujuan dokumen dan penetapan SEU dibatasi pada peran tertentu; pengelolaan pengguna hanya Admin.',
    ],
    bukti: 'Matriks hak akses (halaman Panduan), daftar pengguna aktif.',
    halaman: [{ href: '/panduan', label: 'Panduan (matriks hak akses)' }],
    hindari: 'Akun bersama dengan sandi yang diketahui banyak orang untuk peran yang bisa mengubah data.' },
  { id: 'R14', fungsi: 'dokumen', klausul: ['7.5'], stage: 'Stage 2',
    tanya: 'Bagaimana Anda tahu dokumen yang dibuka adalah versi yang berlaku?',
    jawab: [
      'Berkas evidence disimpan terpusat di aplikasi; berkas versi berlaku ditandai "versi sah". Dokumen dihitung siap audit hanya bila berstatus Final dan memiliki berkas versi sah.',
      'Versi lama tetap tersimpan sebagai arsip, tidak dihapus.',
    ],
    bukti: 'Daftar dokumen dengan status dan penanda versi sah.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit' }] },
  { id: 'R15', fungsi: 'dokumen', klausul: ['7.5'], stage: 'Stage 2',
    tanya: 'Bagaimana data dan dokumen SMEn dicadangkan, dan pernahkah diuji pemulihannya?',
    jawab: [
      'Jelaskan mekanisme cadangan sesuai kondisi aktual: cadangan basis data dan penyimpanan berkas aplikasi, salinan folder induk dokumen ISO 50001, frekuensi, dan lokasi penyimpanan.',
      'Tunjukkan rekaman uji pemulihan terakhir dan berapa lama waktu pulihnya.',
    ],
    bukti: 'Kebijakan/prosedur cadangan, log cadangan, rekaman uji pemulihan.',
    halaman: [],
    hindari: 'Belum pernah ada uji pemulihan. Lakukan dan rekam satu kali sebelum audit.' },
  { id: 'R16', fungsi: 'dokumen', klausul: ['7.5'], stage: 'Stage 2',
    tanya: 'Bagaimana dokumen eksternal (regulasi, standar) dikendalikan?',
    jawab: [
      'Dokumen eksternal (UU 30/2007, PP 33/2023, SNI ISO 50001:2018, ISO 50006) diidentifikasi, disimpan dalam folder terkendali, dan dipantau pembaruannya bersama Anggota Tim Legal/Compliance.',
    ],
    bukti: 'Daftar dokumen eksternal dan daftar kewajiban kepatuhan.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit (7.5)' }] },

  // 05 · Pengendalian operasi & pengadaan TI
  { id: 'R17', fungsi: 'operasi', klausul: ['8.1'], stage: 'Stage 2',
    tanya: 'Apakah ada fasilitas TI yang memakai energi besar, dan bagaimana dikendalikan?',
    jawab: [
      'Sebutkan kondisi aktual: ruang server/jaringan, AC presisi, UPS, dan perangkat yang menyala 24 jam. Bila tidak termasuk SEU, jelaskan bahwa porsinya kecil menurut tinjauan energi.',
      'Kendali sederhana tetap dijalankan: setelan suhu AC ruang server, jadwal mematikan perangkat yang tidak dipakai, mode hemat daya.',
    ],
    bukti: 'Tinjauan energi (porsi beban), SOP/setelan ruang server.',
    halaman: [{ href: '/tinjauan', label: 'Tinjauan Energi & SEU' }],
    hindari: 'Tidak tahu apakah ruang server masuk perhitungan tinjauan energi.' },
  { id: 'R18', fungsi: 'operasi', klausul: ['8.3'], stage: 'Stage 2',
    tanya: 'Apakah kinerja energi dipertimbangkan saat membeli perangkat TI?',
    jawab: [
      'Spesifikasi pengadaan perangkat TI (komputer, server, UPS, AC ruang server) mencantumkan kriteria efisiensi energi, mis. label hemat energi atau konsumsi daya, dikoordinasikan dengan Anggota Tim Pengadaan.',
    ],
    bukti: 'Contoh spesifikasi/TOR pengadaan perangkat TI dengan kriteria energi.',
    halaman: [] },

  // 06 · Ketidaksesuaian, insiden data & audit
  { id: 'R19', fungsi: 'perbaikan', klausul: ['10.1'], stage: 'Stage 2',
    tanya: 'Pernahkah terjadi gangguan atau kehilangan data energi? Apa tindakannya?',
    jawab: [
      'Ceritakan kejadian nyata (mis. bulan tanpa bacaan, aplikasi tidak bisa diakses, berkas hilang): koreksi segera, analisis akar masalah, tindakan pencegahan berulang, dan verifikasinya.',
      'Bila belum pernah terjadi, tunjukkan mekanisme yang siap: pelaporan insiden, pemeriksaan kualitas data otomatis, dan cadangan.',
    ],
    bukti: 'Laporan insiden dan tindakan korektif.',
    halaman: [{ href: '/aset', label: 'Aset & Meter (kualitas data)' }, { href: '/temuan', label: 'Temuan Audit' }] },
  { id: 'R20', fungsi: 'perbaikan', klausul: ['9.2', '10.1'], stage: 'Stage 2',
    tanya: 'Temuan audit internal apa untuk bagian Anda, dan bagaimana statusnya?',
    jawab: [
      'Sebutkan temuan untuk bagian ini dari register (lihat "Fakta hari ini"): uraian, akar masalah, tindakan, tenggat, dan bukti verifikasi.',
    ],
    bukti: 'Register temuan dan bukti penutupan.',
    halaman: [{ href: '/temuan', label: 'Temuan Audit' }],
    hindari: 'Tidak tahu temuan yang ditujukan ke bagian sendiri.' },

  // 07 · Pertanyaan menjebak
  { id: 'R21', fungsi: 'celah', klausul: ['9.2'], stage: 'Stage 2',
    tanya: 'Ketua Auditor internal berasal dari bagian Anda. Siapa yang mengaudit bagian Manajemen Risiko & TI?',
    jawab: [
      'Diktum Keenam SK melarang auditor mengaudit pekerjaan atau proses yang menjadi tanggung jawabnya sendiri. Karena itu bagian Manajemen Risiko & TI, termasuk pengendalian dokumen (7.5), diaudit oleh auditor lain dari Lampiran II, bukan oleh Ketua Auditor.',
    ],
    bukti: 'Rencana audit internal dengan penugasan auditor per unit.',
    halaman: [{ href: '/temuan', label: 'Temuan Audit' }],
    hindari: 'Rencana audit menugaskan Ketua Auditor ke unit atau klausul miliknya sendiri.' },
  { id: 'R22', fungsi: 'celah', klausul: ['5.3'], stage: 'Stage 2',
    tanya: 'Kepala Bagian Anda adalah MR. Bagaimana objektivitas saat MR menilai bagiannya sendiri?',
    jawab: [
      'MR mengawasi dan mengevaluasi pelaksanaan SMEn, tetapi kesesuaian bagian ini dinilai oleh auditor internal yang independen dan diputuskan dalam tinjauan manajemen oleh manajemen puncak.',
      'Temuan untuk bagian ini diperlakukan sama dengan bagian lain: register, tenggat, dan verifikasi oleh pihak lain.',
    ],
    bukti: 'Laporan audit internal dan notulen tinjauan manajemen.',
    halaman: [{ href: '/temuan', label: 'Temuan Audit' }] },
  { id: 'R23', fungsi: 'celah', klausul: ['7.5', '6.6'], stage: 'Stage 2',
    tanya: 'Aplikasi SMEn ini dibuat sendiri. Bagaimana Anda tahu hitungannya benar?',
    jawab: [
      'Rumus EnPI, baseline, dan CUSUM mengikuti ISO 50006; kelayakan model diuji dengan ambang ISO 50006/ASHRAE Guideline 14 dan ditampilkan di aplikasi.',
      'Hasil hitung pernah dicocokkan dengan perhitungan manual/lembar kerja untuk minimal satu EnPI. Tunjukkan rekaman pencocokan itu.',
    ],
    bukti: 'Rekaman verifikasi perhitungan aplikasi vs perhitungan manual.',
    halaman: [{ href: '/kinerja', label: 'Kinerja Energi' }, { href: '/lab-enpi', label: 'Laboratorium EnPI' }],
    hindari: 'Tidak ada bukti verifikasi perhitungan. Siapkan satu lembar pencocokan sebelum audit.' },
  { id: 'R24', fungsi: 'celah', klausul: ['7.5'], stage: 'Stage 2',
    tanya: 'Ada dua tempat penyimpanan dokumen (folder induk dan aplikasi). Mana yang berlaku?',
    jawab: [
      'Tetapkan dan sebutkan satu sumber yang berlaku sesuai prosedur pengendalian dokumen, mis. folder induk sebagai master dan aplikasi sebagai salinan terkendali yang ditandai versi sah, atau sebaliknya.',
      'Penting: kedua tempat harus menunjukkan versi yang sama.',
    ],
    bukti: 'Prosedur pengendalian informasi terdokumentasi, daftar induk dokumen.',
    halaman: [{ href: '/kesiapan', label: 'Kesiapan Audit' }],
    hindari: 'Versi di folder dan di aplikasi berbeda saat dibuka di depan auditor.' },
]

export const DAFTAR_PERIKSA_MRTI = [
  'Seluruh staf bagian sudah ikut sosialisasi kebijakan energi (daftar hadir ada)',
  'Sasaran/target bagian di Formulir Objective & Target diketahui dan ada catatan pencapaian',
  'Register risiko SMEn mutakhir; risiko tinggi punya tindakan, PIC, dan skor residual',
  'Kriteria penilaian risiko SMEn selaras dengan pedoman manajemen risiko perusahaan',
  'Satu contoh risiko tinggi lengkap dengan bukti perlakuan disiapkan',
  'Latihan penelusuran satu angka EnPI sampai bacaan meter sudah dilakukan',
  'Temuan kualitas data meter terbaru sudah ditindaklanjuti dengan catatan',
  'Daftar pengguna aplikasi ditinjau; akun yang tidak aktif dinonaktifkan',
  'Rekaman cadangan dan uji pemulihan data/dokumen tersedia',
  'Versi dokumen di folder induk sama dengan versi sah di aplikasi',
  'Rencana audit internal tidak menugaskan Ketua Auditor ke bagian ini',
  'Rekaman verifikasi perhitungan aplikasi vs manual untuk satu EnPI tersedia',
]
