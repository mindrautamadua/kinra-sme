-- Audit Internal SMEn dilaksanakan Selasa, Kamis, Jumat / 10, 12, 13 November 2026 (surat pemberitahuan audit internal),
-- Tim Audit: Lidwina Vidya (Lead Auditor), Jeri Azwan, Pindi Filsa, Fazar Anggita.
-- 1) Jadwal kegiatan 10 (Internal Audit) disamakan dengan pelaksanaan.
-- 2) Temuan audit internal dicatat (termasuk hasil telaah isi dokumen evidence terhadap data aplikasi, 13 Nov 2026).
--    Tindakan korektif berupa dokumen Rev.1 (13 Nov 2026) yang disahkan melalui Berita Acara Pengesahan Revisi Dokumen SMEn.
--    Status 'Verifikasi' = tindakan selesai, menunggu verifikasi Lead Auditor setelah BA ditandatangani.
-- Jalankan setelah 0070. Aman diulang (nomor temuan unik).

-- 1. Jadwal audit internal
update kegiatan set sesi = '[{"tanggal": "2026-11-10", "jam": "09 - selesai"}, {"tanggal": "2026-11-12", "jam": "09 - selesai"}, {"tanggal": "2026-11-13", "jam": "09 - selesai"}]'::jsonb
where no = 10;

-- 2. Temuan
insert into temuan (nomor, jenis_audit, tanggal, klausul_kode, kategori, uraian, bukti, auditor, auditee, akar_masalah, tindakan, pic, tenggat, status) values
('AI-001', 'Internal', '2026-11-13', '4.3', 'Minor',
 'Formulir Ruang Lingkup & Batasan berstatus final tetapi isinya masih menyebut dirinya draf, belum melampirkan daftar meter, SEU, dan menyatakan tidak ada pengecualian, padahal listrik tenant, PLTBG, PLTS, WTP II/BTM, dan IPAL II berada di luar lingkup.',
 'F-4.3-01 Rev.0 (001/MN-002/KINRA/SMEn/X/2026).', 'Tim Audit Internal SMEn', 'Dokumen Kontrol / MR',
 'Formulir disusun sebelum batas meter dan SEU ditetapkan; belum ada pemutakhiran setelah keputusan lingkup.',
 'F-4.3-01 Rev.1: lampiran 9 meter, 40 aset, SEU-01/SEU-02, dan tabel pengecualian beserta alasan.', 'Dokumen Kontrol', '2026-11-13', 'Verifikasi'),
('AI-002', 'Internal', '2026-11-13', '6.3', 'Minor',
 'SEU ditetapkan per sumber energi kawasan (PLN termasuk tenant, PLTBG, Dexlite, PJU) di formulir SEU, analisis data energi, dan kriteria pengendalian operasional, tidak sesuai penetapan SEU-01 WTP I (MTR-005 + MTR-008) dan SEU-02 WWTP IPAL I (MTR-004).',
 'F-6.3-01, R-6.3-01 / A.D 6.1, R-8.1-01 Rev.0.', 'Tim Audit Internal SMEn', 'Manajer Energi / Bagian M/E',
 'Tinjauan energi awal memakai data PLN kawasan karena bacaan meter aset belum lengkap.',
 'F-6.3-01, A.D 6.1 / R-6.3-01, dan R-8.1-01 Rev.1 disusun ulang dari bacaan 9 meter KINRA; data kawasan hanya konteks.', 'Manajer Energi', '2026-11-13', 'Verifikasi'),
('AI-003', 'Internal', '2026-11-13', '6.6', 'Minor',
 'Data energi tidak lengkap dan tidak konsisten: register meter hanya 7 meter (tanpa MTR-008 Intake dan MTR-009 Tank Farm), inlet WWTP 2026 memuat IPAL II, Air Baku I 2024 menyalin 2025, total tahunan hanya Jan–Okt, rencana pengumpulan data masih generik.',
 'PA-12, PA-13 / F-6.2-03, F-6.6-01 Rev.0.', 'Tim Audit Internal SMEn', 'Bagian M/E (PIC data energi)',
 'Lembar kerja disalin dari templat dan diisi manual tanpa rekonsiliasi dengan data aplikasi.',
 'PA-12, PA-13 / F-6.2-03, dan F-6.6-01 Rev.1 diisi dari data aplikasi (9 meter, IPAL I saja, total 12 bulan).', 'Bagian M/E', '2026-11-13', 'Verifikasi'),
('AI-004', 'Internal', '2026-11-13', '6.4', 'Minor',
 'Formulir EnPI dan baseline tidak memuat EnPI yang berlaku; nilai EnB berlabel 2025 ternyata total Jan–Sep 2025; rekaman EnB dan log perubahannya belum ada (formulir masih templat).',
 'F-6.4-01, R-6.5-01 Rev.0.', 'Tim Audit Internal SMEn', 'Manajer Energi',
 'EnPI dan baseline ditetapkan di aplikasi tetapi formulir tidak diperbarui.',
 'F-6.4-01 dan R-6.5-01 Rev.1: 8 EnPI aktif dengan EnB 2025, nilai bulanan, dan log perubahan EnB.', 'Manajer Energi', '2026-11-13', 'Verifikasi'),
('AI-005', 'Internal', '2026-11-13', '6.2', 'Minor',
 'Belum ada target kinerja energi untuk SEU (ENPI-05, ENPI-06); pencapaian sasaran November diisi "Tercapai" sebelum periode berakhir; estimasi penghematan penerangan dihitung dua kali (P-02/P-10).',
 'T.E, F-6.2-01 (10 formulir), F-6.2-02, F-6.2-04 Rev.0.', 'Tim Audit Internal SMEn', 'MR / seluruh bagian',
 'Sasaran disusun per bagian berfokus kepatuhan; pengisian pencapaian dilakukan di muka.',
 'T.E dan F-6.2-02 Rev.1 memuat target dan rencana tindakan SEU (ditetapkan melalui BA); pencapaian November dikosongkan; estimasi penerangan digabung.', 'MR', '2026-11-13', 'Verifikasi'),
('AI-006', 'Internal', '2026-11-13', '7.5', 'Minor',
 'Rekaman berupa templat kosong atau draf ditandai versi sah, beberapa berkas salah unggah (R-6.3-02, F-8.1-01, SOP-010, F-7.5-11/14/15/16), dan nomor dokumen di register tidak sesuai Daftar Induk Dokumen.',
 'Register Kesiapan Audit; Daftar Induk Dokumen 001/SOP-013.', 'Tim Audit Internal SMEn', 'Dokumen Kontrol',
 'Penandaan versi sah dilakukan saat unggah tanpa pemeriksaan isi.',
 'Tanda sah dicabut dari 22 berkas; nomor 43 dokumen disamakan dengan Daftar Induk; dokumen pengganti Rev.1 diunggah. SOP Baseline (011/MN) diunggah ke SOP-010.', 'Dokumen Kontrol', '2026-11-20', 'Proses'),
('AI-007', 'Internal', '2026-11-13', '8.1', 'Minor',
 'Penggantian pompa intake WTP I (PMP-IPAB-04) dari 110 kW ke 37 kW pada Oktober 2026 tidak tercatat dalam pengendalian perubahan maupun pertimbangan desain/pengadaan.',
 'F-8.1-01 (berkas salah unggah), R-8.2-01 Rev.0; bacaan MTR-008 Okt 2026 62.088 kWh.', 'Tim Audit Internal SMEn', 'Bagian M/E',
 'Perubahan peralatan dilakukan melalui jalur pemeliharaan tanpa menautkan prosedur perubahan SMEn.',
 'F-8.1-01 Rev.1 (rekaman perubahan pompa intake dan penambahan meter) dan R-8.2-01 Rev.1.', 'Bagian M/E', '2026-11-13', 'Verifikasi'),
('AI-008', 'Internal', '2026-11-13', '9.1', 'Minor',
 'Pemantauan EnPI terhadap EnB belum dilakukan dalam rekaman: formulir pemantauan masih templat dan ambang penyimpangan belum diisi.',
 'R-9.1-01 Rev.0.', 'Tim Audit Internal SMEn', 'Manajer Energi',
 'Rekaman pemantauan belum dihubungkan dengan data EnPI di aplikasi.',
 'R-9.1-01 Rev.1: EnPI aktual Jan–Okt 2026 vs EnB per EnPI, ambang penyimpangan 10%.', 'Manajer Energi', '2026-11-13', 'Verifikasi'),
('AI-009', 'Internal', '2026-11-13', '9.1', 'Observasi',
 'ENPI-06, ENPI-04, dan BBM menyimpang lebih dari 10% terhadap EnB pada Jan–Okt 2026 tetapi belum diselidiki dan belum tercatat di register deviasi.',
 'R-9.1-01 Rev.1; register deviasi aplikasi.', 'Tim Audit Internal SMEn', 'Manajer Energi', null,
 'Selidiki penyebab tiap deviasi dan catat di register deviasi sebelum Tinjauan Manajemen.', 'Manajer Energi', '2026-11-19', 'Terbuka'),
('AI-010', 'Internal', '2026-11-13', '7.2', 'Observasi',
 'Matriks kompetensi menampilkan nilai Actual sama dengan Target untuk seluruh personel tanpa asesmen, dan personel SEU (operator WTP I/WWTP IPAL I) belum tercantum.',
 'R-7.2-01 / S.K . 7.2 berkas 006 Rev.0.', 'Tim Audit Internal SMEn', 'SDM / Koordinator SMEn',
 'Kolom Actual diisi menyalin Target sebelum asesmen dilakukan.',
 'Matriks Rev.1: Actual dikosongkan, personel SEU ditambahkan; asesmen kompetensi dijadwalkan.', 'Bagian SDM', '2026-11-30', 'Proses'),
('AI-011', 'Internal', '2026-11-13', '6.1', 'Observasi',
 'Formulir risiko per bagian masih memuat baris contoh templat, belum ada risiko terkait SEU-01, SEU-02, dan Tank Farm, dan 18 risiko konteks (4.1) belum masuk register isu.',
 'F-6.1-01 (10 formulir), F-4.1-01.', 'Tim Audit Internal SMEn', 'Manajemen Risiko & TI / Produksi Kawasan', null,
 'F-6.1-01 Rev.1: baris contoh dihapus, 3 risiko SEU diusulkan (skor dinilai pemilik risiko); 18 risiko 4.1 dimasukkan ke register.', 'Manajemen Risiko & TI', '2026-11-19', 'Proses'),
('AI-012', 'Internal', '2026-11-13', '7.3', 'Observasi',
 'Materi kick-off menyebut konsumsi energi KINRA 2025 = 529.889,44 kWh, sedangkan data 9 meter = 5.168.210,8 kWh.',
 'R-7.3-01 Kickoff Penerapan SMEn (pptx).', 'Tim Audit Internal SMEn', 'Koordinator SMEn', null,
 'R-7.3-01 Rev.1 (koreksi angka dan rujukan Permen ESDM 8/2025).', 'Koordinator SMEn', '2026-11-13', 'Verifikasi'),
('AI-013', 'Internal', '2026-11-13', '9.3', 'Observasi',
 'Bahan tinjauan manajemen masih berisi placeholder dan notulen belum memuat keputusan.',
 'R-9.3-01 Rev.0 (slide dan notulen).', 'Tim Audit Internal SMEn', 'MR', null,
 'Slide R-9.3-01 Rev.1 diisi data aplikasi; notulen diisi setelah rapat tinjauan manajemen.', 'MR', '2026-11-19', 'Proses')
on conflict (nomor) do nothing;
