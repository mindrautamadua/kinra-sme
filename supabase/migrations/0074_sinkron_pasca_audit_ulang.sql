-- Sinkronisasi data aplikasi dengan formulir sah, hasil audit ulang 13 Nov 2026 (setelah 0068–0073).
-- 1) Temuan audit internal: 8 temuan dikembalikan dari Tertutup ke Verifikasi. Rekapitulasi R-10.1-01 yang ditandatangani
--    mencatat status Verifikasi; verifikasi efektivitas (SOP-024) belum dilakukan, khususnya AI-007 yang menunggu
--    data MTR-008 Okt–Des 2026. Auditor diisi nama Tim Audit Internal. Tindakan AI-006 dikoreksi (SOP Baseline belum diunggah).
-- 2) Rencana tindakan SEU F-6.2-02 Rev.1 No. 8–11 (ditetapkan BA 001/BA/KINRA/SMEn/XI/2026) dimasukkan sebagai RT-08..RT-11
--    dan ditautkan ke sasaran SE-02/SE-03. Estimasi No. 11 memakai 5% sesuai target ENPI-06 (5% × 2.038.673 = 101.934 kWh);
--    dokumen F-6.2-02 Rev.1 menulis 10% dan dikoreksi pada revisi berikutnya.
-- 3) Register Kesiapan: keterangan dokumen yang sudah Rev.1, status draft dokumen yang Rev.1-nya sah, register 9.2 dan 10.1.
-- 4) Peluang: kolom SEU terkait disamakan dengan rencana aksi (pencahayaan dan peralatan kantor bukan SEU).
-- 5) Teks usang: RT-06 (PLTS/PLTBG), catatan ENPI-02 (P-09 tidak ada), catatan ENPI-07 (porsi 2025 = 2,3%), ringkasan tinjauan energi.
-- Jalankan setelah 0073. Aman diulang.

-- 1. Temuan
update temuan set status = 'Verifikasi', diubah_at = now()
where jenis_audit = 'Internal' and status = 'Tertutup'
  and nomor in ('AI-001', 'AI-002', 'AI-003', 'AI-004', 'AI-005', 'AI-007', 'AI-008', 'AI-012');

update temuan set auditor = 'Tim Audit Internal SMEn: Lidwina Vidya (Lead Auditor), Jeri Azwan, Pindi Filsa, Fazar Anggita'
where jenis_audit = 'Internal' and auditor = 'Tim Audit Internal SMEn';

update temuan set tindakan = 'Tanda sah dicabut dari 22 berkas; nomor 43 dokumen disamakan dengan Daftar Induk; dokumen pengganti Rev.1 diunggah. Belum selesai: unggah SOP Baseline (011/MN) ke SOP-010; catat revisi Rev.1 di Log Perubahan, Log Penarikan, Log Distribusi, dan Daftar Induk (F-7.5).'
where nomor = 'AI-006';

update temuan set tindakan = tindakan || ' Verifikasi efektivitas penggantian pompa: kWh MTR-008 per m³ air baku minimal 3 bulan sesudah penggantian (Okt–Des 2026).'
where nomor = 'AI-007' and tindakan not like '%Verifikasi efektivitas%';

-- 2. Rencana tindakan SEU
insert into rencana_aksi (kode, sasaran_id, uraian, deskripsi, seu_terkait, sasaran_teks, pic, sumber_daya, mulai, tenggat, estimasi_hemat_kwh, metode_verifikasi, status, catatan, sumber, tanggal_identifikasi)
select v.kode, s.id, v.uraian, v.deskripsi, v.seu_terkait, v.sasaran_teks, 'Bagian M/E', v.sumber_daya, v.mulai::date, v.tenggat::date, v.estimasi, v.metode, 'Rencana', v.catatan,
       'Formulir Rencana Tindakan 6.2 003/SOP-008/KINRA/SMEn/X/2026 Rev.1 · No. ' || v.no, '2026-11-13'::date
from (values
  ('RT-08', '8', 'SE-02', 'Optimasi set point tekanan header dan penjadwalan pompa distribusi WTP I (VSD terpasang)',
   'Menurunkan set point tekanan header sampai batas layanan titik kritis jaringan dan mengatur pola operasi pompa distribusi berdasarkan debit per jam. Tiga VSD pompa distribusi (2022, Jan 2024, Agu 2025) sudah menjadi bagian baseline 2025; penghematan hanya dari set point tekanan dan pola operasi.',
   'Ya – SEU-01 WTP I (ENPI-05)', 'ENPI-05 turun 5% dari baseline 2025 (0,888 kWh/m³ air diolah WTP I).',
   'Data tekanan titik kritis jaringan dan debit per jam, setelan VSD, operator WTP', '2026-12-01', '2027-05-31', 180504,
   'Bandingkan kWh/m³ WTP I (ENPI-05) 3 bulan sebelum dan sesudah, dinormalisasi volume air; tekanan titik kritis tetap memenuhi layanan.',
   'Estimasi awal 5% × 3.610.073 kWh (MTR-005 + MTR-008, Nov 2025–Okt 2026); perbarui setelah kajian.'),
  ('RT-09', '9', 'SE-02', 'Kajian dan verifikasi penghematan penggantian pompa intake WTP I (PMP-IPAB-04, 110 kW ke 37 kW)',
   'Memverifikasi penghematan penggantian pompa intake pada Okt 2026 dengan kWh meter intake KINRA-MTR-008 per m³ air baku, serta mengkaji kelayakan kontrol kecepatan pompa intake (belum ber-VSD).',
   'Ya – SEU-01 WTP I (ENPI-05)', 'Mendukung target ENPI-05.',
   'Bacaan meter intake KINRA-MTR-008, uji debit-tekanan pompa, kalkulator pompa VSD', '2027-01-01', '2027-04-30', null,
   'kWh intake (KINRA-MTR-008) per m³ air baku sebelum dan sesudah penggantian pompa.',
   'Data awal: Jan–Sep 2026 0,259 kWh/m³ air baku; Okt 2026 0,182 kWh/m³. Penghematan dinyatakan setelah minimal 3 bulan data sesudah penggantian.'),
  ('RT-10', '10', 'SE-03', 'Pemasangan flow meter influent dan submeter blower WWTP IPAL I',
   'Memasang flow meter influent IPAL I dan power meter pada panel blower agar angka inlet terukur (bukan estimasi) dan hasil kontrol aerasi dapat dibuktikan.',
   'Ya – SEU-02 WWTP IPAL I (ENPI-06)', 'Prasyarat target ENPI-06.',
   'Flow meter influent, power meter kelas 0,5S/1 + CT untuk panel blower, teknisi listrik', '2026-11-13', '2027-02-28', null,
   'Debit influent dan kWh blower tercatat bulanan dan terekonsiliasi dengan meter utama WWTP (KINRA-MTR-004).',
   'Sarana pengukuran; tidak ada estimasi penghematan langsung.'),
  ('RT-11', '11', 'SE-03', 'Kontrol aerasi berbasis oksigen terlarut (DO) pada blower WWTP IPAL I',
   'Mengatur operasi blower (VSD atau on-off bertahap) berdasarkan sensor DO agar aerasi tidak berlebih, dengan mutu effluent tetap memenuhi baku mutu.',
   'Ya – SEU-02 WWTP IPAL I (ENPI-06)', 'ENPI-06 turun 5% dari baseline 2025 (1,841 kWh/m³ inlet IPAL I).',
   'Sensor DO, kontrol blower (VSD/on-off bertahap), submeter blower', '2027-02-01', '2027-08-31', 101934,
   'Bandingkan kWh blower per m³ air limbah diolah sebelum dan sesudah, dengan mutu effluent tetap memenuhi baku mutu.',
   'Estimasi 5% × 2.038.673 kWh (MTR-004, Nov 2025–Okt 2026), selaras target ENPI-06. Dimulai setelah RT-10 terpasang.')
) as v(kode, no, sasaran, uraian, deskripsi, seu_terkait, sasaran_teks, sumber_daya, mulai, tenggat, estimasi, metode, catatan)
join sasaran s on s.kode = v.sasaran
where not exists (select 1 from rencana_aksi r where r.kode = v.kode);

-- 3. Register Kesiapan
update dokumen_audit set keterangan = 'Rev.1, berlaku 13 Nov 2026 (BA 001/BA/KINRA/SMEn/XI/2026)'
where kode in ('F-4.3-01', 'F-6.3-01', 'F-6.4-01', 'F-6.6-01', 'F-6.2-04', 'SOP-005', 'T.E', 'F-6.2-02', 'F-6.2-01', 'F-6.1-01',
               'R-8.1-01', 'R-8.2-01', 'F-8.1-01', 'R-9.1-01', 'R-10.2-01', 'R-6.5-01', 'R-7.2-01', 'S.K . 7.2', 'R-7.3-01',
               'A.D 6.1', 'R-6.3-01', 'PA-06', 'PA-07', 'PA-08', 'PA-10', 'PA-12', 'PA-13', 'F-6.2-03');
update dokumen_audit set status = 'final' where kode in ('PA-13', 'F-6.2-03', 'R-10.2-01') and status = 'draft';
update dokumen_audit set nomor_dokumen = '001/SOP-014/KINRA/SMEn/X/2026' where kode = 'PA-12' and nomor_dokumen is null;
update dokumen_audit set nomor_dokumen = '004/SOP-008/KINRA/SMEn/X/2026' where kode = 'PA-13' and nomor_dokumen is null;
update dokumen_audit set keterangan = 'Audit internal dilaksanakan 10, 12, 13 Nov 2026 (Lead Auditor Lidwina Vidya); temuan AI-001 s.d. AI-013. Unggah laporan/checklist hasil audit.'
where kode in ('R-9.2-02', 'R-9.2-04', 'R-9.2-06');
update dokumen_audit set keterangan = 'Rekapitulasi Temuan dan Tindakan Korektif Audit Internal 10, 12, 13 Nov 2026 (AI-001 s.d. AI-013).'
where kode = 'R-10.1-01';

-- 4. Peluang: SEU terkait
update peluang set seu_terkait = 'Tidak – pencahayaan bukan SEU (SEU-01 WTP I, SEU-02 WWTP IPAL I)' where kode in ('P-02', 'P-11') and seu_terkait like 'Ya%';
update peluang set seu_terkait = 'Tidak – penerangan jalan bukan SEU dan belum punya meter' where kode = 'P-10' and seu_terkait like 'Ya%';
update peluang set seu_terkait = 'Tidak – peralatan administrasi bukan SEU' where kode = 'P-14' and seu_terkait like 'Ya%';
update peluang set seu_terkait = 'Tidak langsung – mendukung pemantauan SEU-01 dan SEU-02' where kode in ('P-04', 'P-08', 'P-15') and seu_terkait like 'Ya%';

-- 5. Teks usang
update rencana_aksi set deskripsi = 'Mengembangkan dan menerapkan sistem monitoring manajemen energi berbasis web yang terintegrasi dengan bacaan 9 meter KINRA, penggunaan BBM, dan hasil pengukuran submeter. Sistem digunakan untuk memantau tren konsumsi, membandingkan realisasi terhadap baseline dan sasaran energi, serta menyediakan laporan kinerja energi secara berkala. Data PLTS dan PLTBG (pihak ketiga) hanya ditampilkan sebagai konteks kawasan.'
where kode = 'RT-06' and deskripsi like '%PLTS, PLTBG%';
update enpi set catatan = replace(catatan, ' (peluang P-09)', '') where kode in ('ENPI-02', 'ENPI-03') and catatan like '%P-09%';
update enpi set catatan = replace(catatan, '±2,7% listrik KINRA', '±2,3% listrik KINRA 2025') where kode = 'ENPI-07' and catatan like '%±2,7%%';
update tinjauan_energi set ringkasan = 'Tinjauan energi 2025–2026 dari bacaan 9 meter KINRA. WTP I (meter 005 + 008) 54,8% dan WWTP IPAL I (meter 004) 38,7% listrik KINRA 2025, ditetapkan sebagai SEU-01 dan SEU-02 (93,5%). Tank Farm 2,3% (ENPI-07, bukan SEU). Ruang Boiler Tank Farm masih perlu dikonfirmasi kepemilikan dan bahan bakarnya.'
where ringkasan like 'Tinjauan energi awal. Porsi energi sementara dari data inventaris%';
