-- Pengesahan dokumen Rev.1 melalui Berita Acara Pengesahan Revisi Dokumen SMEn No. 001/BA/KINRA/SMEn/XI/2026
-- tanggal 13 November 2026 (ditandatangani Lidwina Vidya, M. Indra Utama, Kennedy N.P. Sibarani, Alwin Abdi; berkas di F-7.5-08).
-- 1) Berkas Rev.1 yang diunggah 13 Nov 2026 ditandai versi sah. sah_oleh diisi trigger dari sesi; di SQL Editor
--    tidak ada sesi, sehingga diisi ulang di langkah 1b.
-- 2) Temuan audit internal berstatus Verifikasi ditutup: efektivitas diverifikasi Lead Auditor pada Rekapitulasi
--    Temuan dan Tindakan Korektif (R-10.1-01) tanggal 13 Nov 2026.
-- 3) Target EnPI lingkup KINRA ditetapkan (butir C BA, disetujui sebagaimana tercantum) dan dicatat sebagai sasaran.
-- Jalankan setelah 0071. Aman diulang.

-- 1. Berkas Rev.1
update berkas set sah = true
where not sah
  and nama_file like '%Rev.1%'
  and diunggah_at >= '2026-11-13'
  and dokumen_id is not null;

-- 1b. Catatan pengesah (trigger hanya berjalan saat kolom sah berubah)
update berkas set sah_oleh = 'BA 001/BA/KINRA/SMEn/XI/2026'
where sah and sah_oleh is null and nama_file like '%Rev.1%' and diunggah_at >= '2026-11-13';

-- 2. Temuan
update temuan set status = 'Tertutup', diubah_at = now()
where jenis_audit = 'Internal' and status = 'Verifikasi';

-- 3. Sasaran EnPI (target 2027 terhadap baseline 2025)
insert into sasaran (kode, uraian, enpi_kode, target_persen, tahun_target, pic, status, target_teks, batas_waktu, sumber, catatan) values
  ('SE-01', 'Menurunkan konsumsi listrik pemakaian sendiri KINRA dibanding baseline', 'ENPI-04', 3, 2027, 'Manajer Energi', 'Aktif',
   '≤ 5.013.164 kWh pada 2027 (baseline 2025: 5.168.211 kWh, 9 meter KINRA)', 'Desember 2027',
   'BA 001/BA/KINRA/SMEn/XI/2026', 'Ditetapkan melalui Berita Acara Pengesahan Revisi Dokumen SMEn No. 001/BA/KINRA/SMEn/XI/2026 tanggal 13 Nov 2026 (butir C). Dokumen: T.E 002/SOP-008 Rev.1.'),
  ('SE-02', 'Menurunkan intensitas energi WTP I (kWh per m³ air diolah)', 'ENPI-05', 5, 2027, 'Bagian M/E', 'Aktif',
   '≤ 0,843 kWh/m³ pada 2027 (baseline 2025: 0,888 kWh/m³)', 'Desember 2027',
   'BA 001/BA/KINRA/SMEn/XI/2026', 'Ditetapkan melalui Berita Acara Pengesahan Revisi Dokumen SMEn No. 001/BA/KINRA/SMEn/XI/2026 tanggal 13 Nov 2026 (butir C). SEU-01. Dokumen: T.E 002/SOP-008 Rev.1.'),
  ('SE-03', 'Menurunkan konsumsi listrik WWTP dengan mutu effluent tetap memenuhi baku mutu', 'ENPI-06', 5, 2027, 'Bagian M/E', 'Aktif',
   '≤ 1,749 kWh/m³ inlet IPAL I pada 2027 (baseline 2025: 1,841 kWh/m³)', 'Desember 2027',
   'BA 001/BA/KINRA/SMEn/XI/2026', 'Ditetapkan melalui Berita Acara Pengesahan Revisi Dokumen SMEn No. 001/BA/KINRA/SMEn/XI/2026 tanggal 13 Nov 2026 (butir C). SEU-02. Dokumen: T.E 002/SOP-008 Rev.1.'),
  ('SE-04', 'Mengendalikan konsumsi BBM kendaraan operasional', 'ENPI-01', 5, 2027, 'Bagian Umum / Pengelola Kendaraan', 'Aktif',
   '≤ 8.349,30 L pada 2027 (baseline 2025: 8.788,74 L)', 'Desember 2027',
   'BA 001/BA/KINRA/SMEn/XI/2026', 'Ditetapkan melalui Berita Acara Pengesahan Revisi Dokumen SMEn No. 001/BA/KINRA/SMEn/XI/2026 tanggal 13 Nov 2026 (butir C). Dokumen: T.E 002/SOP-008 Rev.1.')
on conflict (kode) do nothing;
