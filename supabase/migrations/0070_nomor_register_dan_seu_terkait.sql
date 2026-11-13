-- Nomor dokumen register Kesiapan disamakan dengan Daftar Induk Dokumen SMEn (001/SOP-013), hasil audit isi dokumen 13 Nov 2026,
-- dan kolom seu_terkait rencana aksi disamakan dengan SEU yang ditetapkan (SEU-01 WTP I, SEU-02 WWTP IPAL I).
-- Jalankan setelah 0069. Aman diulang.

BEGIN;

-- ===== Kebijakan & Manual =====
UPDATE dokumen_audit SET nomor_dokumen = '001/PO/KINRA/SMEn/X/2026' WHERE kode = 'MK-02';      -- Kebijakan SMEn (Daftar Induk no.1; berkas bertanda tangan sama nomornya); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '001/PO/KINRA/SMEn/X/2026' WHERE kode = 'K.B 5.1';    -- berkas identik dengan MK-02 (Kebijakan SMEn); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '002/MN/KINRA/SMEn/X/2026' WHERE kode = 'MK-01';      -- Manual SMEn (Daftar Induk no.2); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '002/MN/KINRA/SMEn/X/2026' WHERE kode = 'M.N 5.2';    -- berkas identik dengan MK-01 (Manual SMEn); register kosong

-- ===== SOP (kode aplikasi bergeser -1 dari nomor fisik; dicocokkan lewat judul dan nama berkas) =====
UPDATE dokumen_audit SET nomor_dokumen = '003/MN/KINRA/SMEn/X/2026' WHERE kode = 'SOP-002';    -- Prosedur Konteks Organisasi; berkas "003_SOP Konteks Organisasi"; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '004/MN/KINRA/SMEn/X/2026' WHERE kode = 'SOP-003';    -- Prosedur Kepemimpinan dan Komitmen; berkas "004_SOP Kepemimpinan..."; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '005/MN/KINRA/SMEn/X/2026' WHERE kode = 'SOP-004';    -- Prosedur Kebijakan Energi; berkas "005_SOP Kebijakan Energi"; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '006/MN/KINRA/SMEn/X/2026' WHERE kode = 'SOP-005';    -- Prosedur Peran, Tanggung Jawab & Wewenang; berkas "006_SOP Peran..."; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '007/MN/KINRA/SMEn/X/2026' WHERE kode = 'SOP-006';    -- Prosedur Tindakan Mengatasi Risiko & Peluang; berkas "007_SOP Tindakan..."; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '008/MN/KINRA/SMEn/X/2026' WHERE kode = 'SOP-007';    -- Prosedur Tujuan, Target Energi & Perencanaan; berkas "008_SOP Tujuan..."; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '009/MN/KINRA/SMEn/X/2026' WHERE kode = 'SOP-008';    -- Prosedur Tinjauan Energi; berkas "009_SOP Tinjauan Energi"; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '010/MN/KINRA/SMEn/X/2026' WHERE kode = 'SOP-009';    -- Prosedur Indikator Kinerja Energi EnPI; berkas "010_SOP Indikator..."; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '011/MN/KINRA/SMEn/X/2026' WHERE kode = 'SOP-010';    -- Prosedur Baseline Energi EnB (cocok dengan judul). PERHATIAN: berkas yang terunggah di SOP-010 adalah "010_SOP EnPI" (salah unggah); unggah SOP 011 Baseline
UPDATE dokumen_audit SET nomor_dokumen = '013/MN/KINRA/SMEn/X/2026' WHERE kode = 'SOP-011';    -- Prosedur Pengendalian Informasi Terdokumentasi; berkas "SOP_013_SOP Pengendalian Informasi Terdokumentasi"; register kosong
-- SOP-012 "SOP Pengendalian Dokumen": berkas SOP-BMRTI-08 (SOP perusahaan Rev.01, 15 Jun 2026), tidak ada di Daftar Induk SMEn -> tidak diubah.
--   Bila ingin diisi: UPDATE dokumen_audit SET nomor_dokumen = 'SOP-BMRTI-08' WHERE kode = 'SOP-012';
-- SOP-013 s.d. SOP-025 sudah benar (012/MN, 014/MN ... 025/MN).

-- ===== Formulir / catatan (Daftar Catatan) =====
UPDATE dokumen_audit SET nomor_dokumen = '001/MN-002/KINRA/SMEn/X/2026'  WHERE kode = 'F-4.3-01';  -- Formulir Ruang Lingkup & Batasan (Daftar Catatan no.4); sama dengan dokumen; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '001/SOP-005/KINRA/SMEn/X/2026' WHERE kode = 'F-5.2-01';  -- Formulir Kebijakan Energi (no.6); sama dengan dokumen; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '001/SOP-007/KINRA/SMEn/X/2026' WHERE kode = 'F-6.1-01';  -- Formulir Risiko Keberhasilan SMEn (no.8); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '001/SOP-008/KINRA/SMEn/X/2026' WHERE kode = 'F-6.2-01';  -- berkas "Form Objective dan Target Manajemen" per bagian = Formulir Objective dan Target Manajemen (no.9); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '002/SOP-008/KINRA/SMEn/X/2026' WHERE kode = 'T.E';       -- Formulir Tujuan dan Target Energi (no.10); berkas "002_Formulir Tujuan dan Target Energi"; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '003/SOP-008/KINRA/SMEn/X/2026' WHERE kode = 'F-6.2-02';  -- Formulir Rencana Tindakan Peningkatan Berkelanjutan (no.11); berkas "003_..."; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '004/SOP-008/KINRA/SMEn/X/2026' WHERE kode = 'F-6.2-03';  -- Data Konsumsi Energi (no.12); register SALAH "003/SOP-008" (003 = Rencana Tindakan); berkas "004_Data Konsumsi Energi"
UPDATE dokumen_audit SET nomor_dokumen = '005/SOP-008/KINRA/SMEn/X/2026' WHERE kode = 'F-6.2-04';  -- Formulir Peluang Peningkatan Kinerja Energi (no.13); berkas "005_Formulir Peluang..."; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '001/SOP-009/KINRA/SMEn/X/2026' WHERE kode = 'F-6.3-01';  -- Formulir Penggunaan Energi Signifikan SEU (no.14); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '001/SOP-011/KINRA/SMEn/X/2026' WHERE kode = 'F-6.6-01';  -- Formulir Pengumpulan dan Analisis Data Energi (no.15); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '002/SOP-011/KINRA/SMEn/X/2026' WHERE kode = 'F-6.4-01';  -- Formulir Indikator Kinerja Energi dan Baseline (no.16); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '001/SOP-015/KINRA/SMEn/X/2026' WHERE kode = 'F-7.2-01';  -- Formulir Kompetensi & Pelatihan (no.19); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '006/SOP-015/KINRA/SMEn/X/2026' WHERE kode = 'R-7.2-01';  -- Formulir Matriks Kompetensi (no.24) = berkas utama 006 Matriks; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '001/SOP-016/KINRA/SMEn/X/2026' WHERE kode = 'F-7.3-01';  -- Formulir Kesadaran dan Komunikasi (no.25); sama dengan dokumen; register kosong
UPDATE dokumen_audit SET nomor_dokumen = '002/SOP-017/KINRA/SMEn/X/2026' WHERE kode = 'F-7.4-01';  -- Formulir Log Komunikasi Eksternal (no.27); sama dengan dokumen. Catatan audit: idealnya 002/SOP-016 (001/SOP-017 terpakai ganda) -> ubah Daftar Induk dulu bila dipindah
UPDATE dokumen_audit SET nomor_dokumen = '003/SOP-017/KINRA/SMEn/X/2026' WHERE kode = 'F-7.4-02';  -- Formulir Rekaman Komunikasi Eksternal (no.28). PERHATIAN: dokumen tertulis 001/SOP-017 -> nomor di dokumen perlu dikoreksi mengikuti Daftar Induk
UPDATE dokumen_audit SET nomor_dokumen = '001/SOP-013/KINRA/SMEn/X/2026' WHERE kode = 'F-7.5-01';  -- Formulir Informasi Terdokumentasi / Daftar Induk (no.29); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '001/SOP-013/KINRA/SMEn/X/2026' WHERE kode = 'F-7.5-02';  -- "Daftar Induk Dokumen": berkas utama = 001 Formulir Daftar Induk (sama dengan F-7.5-01); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '001/SOP-013/KINRA/SMEn/X/2026' WHERE kode = 'R-7.5-01';  -- "Daftar Induk Rekaman": berkas = 001 Formulir Daftar Induk (bagian Daftar Catatan); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '002/SOP-013/KINRA/SMEn/X/2026' WHERE kode = 'F-7.5-03';  -- Log Book Distribusi Dokumen (no.30); register kosong
UPDATE dokumen_audit SET nomor_dokumen = '003/SOP-013/KINRA/SMEn/X/2026' WHERE kode = 'F-7.5-04';  -- Bukti Penerimaan Salinan Dokumen (no.31); dokumen menulis 003/FRM-SOP-013 (format beda, angka sama)
UPDATE dokumen_audit SET nomor_dokumen = '004/SOP-013/KINRA/SMEn/X/2026' WHERE kode = 'F-7.5-05';  -- Bukti Serah Terima Dokumen (no.32)
UPDATE dokumen_audit SET nomor_dokumen = '005/SOP-013/KINRA/SMEn/X/2026' WHERE kode = 'F-7.5-06';  -- Berita Acara Pemusnahan Dokumen (no.33)
UPDATE dokumen_audit SET nomor_dokumen = '006/SOP-013/KINRA/SMEn/X/2026' WHERE kode = 'F-7.5-07';  -- Bukti serah terima Salinan Dokumen (no.34)
UPDATE dokumen_audit SET nomor_dokumen = '007/SOP-013/KINRA/SMEn/X/2026' WHERE kode = 'F-7.5-08';  -- Log Perubahan Dokumen (no.35)
UPDATE dokumen_audit SET nomor_dokumen = '008/SOP-013/KINRA/SMEn/X/2026' WHERE kode = 'F-7.5-09';  -- Log Book Penarikan Dokumen Kadaluarsa (no.36)
UPDATE dokumen_audit SET nomor_dokumen = '009/SOP-013/KINRA/SMEn/X/2026' WHERE kode = 'F-7.5-10';  -- Daftar Dokumen Eksternal (no.37)

-- ===== Di luar Daftar Induk SMEn, nomor terbaca langsung pada dokumen =====
UPDATE dokumen_audit SET nomor_dokumen = 'KINRA/SKPTS/47/2026' WHERE kode = 'F-5.3-01';    -- SK Tim SMEn & Internal Auditor; nomor tercetak di Lampiran I SK (ditetapkan 27 Okt 2026); register kosong
UPDATE dokumen_audit SET nomor_dokumen = 'KINRA/SKPTS/47/2026' WHERE kode = 'SKPTS. 5.1';  -- berkas identik dengan F-5.3-01; register kosong

COMMIT;

-- ===== TIDAK diubah (pasangan belum jelas) =====
-- F-5.3-02 SKPTS.16 Perubahan Struktur Organisasi: kemungkinan 'KINRA/SKPTS/16/2026', tetapi berkas berupa scan tanpa teks; cek nomor di halaman 1 dahulu.
-- S.K . 7.2 Standar Kompetensi: dokumen bernomor 007/SOP-015, tetapi 007/SOP-015 belum ada di Daftar Induk (Daftar Catatan hanya 001-006/SOP-015). Tambahkan ke Daftar Induk dahulu.
-- R.P 7.2: berisi tiga formulir (002, 004, 005/SOP-015) -> satu kolom nomor tidak cukup.
-- D.H 7.2: ekspor Google Form, bukan Formulir Daftar Hadir 003/SOP-015.
-- F-6.1-02 (register "002/SOP-007"): nomor ini tidak ada di Daftar Induk; isi berkas = Formulir Peluang (Daftar Induk: 005/SOP-008, dipakai F-6.2-04). Putuskan dulu apakah 002/SOP-007 ditambahkan ke Daftar Induk.
-- F-8.1-01 (register "001/SOP-021" = Formulir Pengendalian Perubahan) berisi berkas "001_Formulir Pengendalian Operasional" (Daftar Induk: 001/SOP-017). Nama register dan berkas tidak sejalan; tidak diubah.
-- F-7.5-11/14/15/16 (nomor SMM&LK3 F1/F4/F5/F6): berkas yang diunggah ternyata duplikat formulir SMEn SOP-013; perbaiki unggahan/entri dulu.
-- PA-10 kolom keterangan menyebut "(004/SOP-008)" untuk Formulir Peluang; menurut Daftar Induk 005/SOP-008 (kolom keterangan, bukan nomor_dokumen; tidak diubah di sini).
-- Sudah benar, tidak diubah: F-4.1-01, F-4.2-01, F-4.2-02, F-5.1-01, F-9.2-01, R-9.2-04, R-9.2-06, SOP-013 s.d. SOP-025.

-- seu_terkait rencana aksi: pencahayaan, PJU, dan peralatan kantor bukan SEU
update rencana_aksi set seu_terkait = 'Tidak – pencahayaan bukan SEU (SEU-01 WTP I, SEU-02 WWTP IPAL I)' where kode in ('RT-01', 'RT-02') and seu_terkait like 'Ya%';
update rencana_aksi set seu_terkait = 'Tidak – penerangan jalan bukan SEU dan belum punya meter' where kode = 'RT-05' and seu_terkait like 'Ya%';
update rencana_aksi set seu_terkait = 'Tidak – peralatan administrasi bukan SEU' where kode = 'RT-04' and seu_terkait like 'Ya%';
update rencana_aksi set seu_terkait = 'Tidak langsung – mendukung pemantauan SEU-01 dan SEU-02' where kode in ('RT-03', 'RT-06', 'RT-07') and seu_terkait like 'Ya%';
