-- Status kelengkapan bukti capaian per sasaran (klausul 6.2, 9.1), hasil pemeriksaan folder sumber-data 11 November 2026
-- (lihat matriks-bukti-sasaran.md). Terpisah dari berkas bukti yang diunggah (migrasi 0051): kolom ini mencatat penilaian
-- tim atas cukup-tidaknya bukti terhadap ukuran target, termasuk dokumen yang masih tersimpan di OneDrive.
--   bukti_status    : 'Lengkap' | 'Sebagian' | 'Belum'
--   bukti_tersedia  : dokumen yang sudah membuktikan (dipisah baris baru)
--   bukti_kurang    : bukti yang masih harus dikumpulkan (dipisah baris baru)
--   bukti_diperiksa : tanggal pemeriksaan terakhir
-- Jalankan setelah 0054. Aman diulang: hanya mengisi sasaran yang bukti_diperiksa-nya masih kosong atau 2026-11-11.

alter table sasaran add column if not exists bukti_status text;
alter table sasaran add column if not exists bukti_tersedia text;
alter table sasaran add column if not exists bukti_kurang text;
alter table sasaran add column if not exists bukti_diperiksa date;
alter table sasaran drop constraint if exists sasaran_bukti_status_cek;
alter table sasaran add constraint sasaran_bukti_status_cek
  check (bukti_status is null or bukti_status in ('Lengkap', 'Sebagian', 'Belum'));

with b(kode, status, tersedia, kurang) as (values
  -- Pola 1: sosialisasi Kebijakan Energi
  ('SB-01-1', 'Sebagian', E'Daftar hadir Training ISO 50001 26–30 Okt (003/SOP-015): Plt. Direktur, SEVP Operation\nDaftar hadir Google Form 22–30 Okt\nCatatan Pelatihan 005/SOP-015: Kebijakan SMEn 26 Okt\nSertifikat pelatihan', E'Rekap nilai tes pemahaman per peserta (≥90% nilai ≥80)\nDaftar personel sasaran sebagai penyebut 100%'),
  ('SB-02-1', 'Sebagian', E'Daftar hadir 003/SOP-015: Kasubag Keuangan\nGoogle Form + sertifikat: Dady Prasojo Saribrid, Andika Yusuf Hermawan\nCatatan Pelatihan: Kebijakan SMEn 26 Okt', E'Rekap nilai pre-test/post-test\nDaftar personel bagian sebagai penyebut 100%'),
  ('SB-03-1', 'Sebagian', E'Daftar hadir 003/SOP-015: 3 auditor dan SPI\nGoogle Form + sertifikat: Achmad Fadly, Jeri Azwan, Fazar Anggita\nCatatan Pelatihan: Kebijakan SMEn 26 Okt', E'Rekap nilai evaluasi pemahaman\nDaftar personel SPI sebagai penyebut 100%'),
  ('SB-04-1', 'Sebagian', E'Daftar hadir 003/SOP-015: Kasubag Hukum\nGoogle Form + sertifikat: Miswarindra, Mira Febriani\nCatatan Pelatihan: Kebijakan SMEn 26 Okt', E'Rekap nilai evaluasi pemahaman\nDaftar personel sasaran sebagai penyebut 100%'),
  ('SB-05-1', 'Sebagian', E'Daftar hadir 003/SOP-015: Kasubag Pengadaan & Umum, Kasubag SDM\nGoogle Form + sertifikat: Masta P. Pandiangan, Arif Susanto\nCatatan Pelatihan: Kebijakan SMEn 26 Okt', E'Rekap nilai tes pemahaman\nDaftar personel sasaran sebagai penyebut 100%'),
  ('SB-06-1', 'Sebagian', E'Daftar hadir 003/SOP-015: Kabag MR & TI, Kasubag MR\nGoogle Form + sertifikat: M. Indra Utama, Lidwina Vidya, Pindi Filsa, M. Fajrin Sembiring\nCatatan Pelatihan: Kebijakan SMEn 26 Okt', E'Rekap nilai evaluasi pemahaman\nDaftar personel sasaran sebagai penyebut 100%'),
  ('SB-07-1', 'Sebagian', E'Daftar hadir 003/SOP-015: Kasubag Pengembangan Usaha\nGoogle Form + sertifikat: Ruri Rizki Syahputri Zuhri\nCatatan Pelatihan: Kebijakan SMEn 26 Okt', E'Rekap nilai evaluasi pemahaman\nDaftar personel bagian sebagai penyebut 100%'),
  ('SB-08-1', 'Sebagian', E'Daftar hadir 003/SOP-015: Bagian Pemasaran dan Penjualan\nGoogle Form + sertifikat: Muhammad Fadillah, Nurul Abadah\nCatatan Pelatihan: Kebijakan SMEn 26 Okt', E'Rekap nilai evaluasi pemahaman\nDaftar personel bagian sebagai penyebut 100%'),
  ('SB-09-1', 'Sebagian', E'Daftar hadir 003/SOP-015: Kasubag IPAB, Bagian Tangki Timbun\nGoogle Form + sertifikat: Ronni Abdurrahman (IPAB), M. Faras Al Yasir Harahap (Tangki Timbun)\nCatatan Pelatihan: Kebijakan SMEn 26 Okt', E'Rekap nilai evaluasi pemahaman\nDaftar personel bagian sebagai penyebut 100%\nPastikan IPAB dan Tangki Timbun memang termasuk Produksi Kawasan'),
  ('SB-10-1', 'Sebagian', E'Daftar hadir 003/SOP-015: Kabag, Kasubag Fasilitas, Kasubag K&MLL, Kasubag ME, Supervisor ME\nGoogle Form + sertifikat: Bona S. Purba, Sahala, Ananda S. Lubis, Zulfan Anshari, Dediansyah Samosir, Setia Wadi, Muaz Alkarni\nCatatan Pelatihan: Kebijakan SMEn 26 Okt', E'Rekap nilai evaluasi pemahaman\nDaftar personel bagian sebagai penyebut 100%'),
  -- Pola 2: pelatihan/pengarahan SOP
  ('SB-01-2', 'Sebagian', E'Catatan Pelatihan 005/SOP-015: SOP 003–015 tanggal 2 Nov, SOP 016–025 tanggal 5 Nov', E'Daftar hadir sesi SOP 2 dan 5 Nov\nRekap nilai evaluasi kompetensi (≥90% nilai ≥80)'),
  ('SB-02-2', 'Sebagian', E'Catatan Pelatihan 005/SOP-015: SOP 003–025 tanggal 2 dan 5 Nov', E'Daftar hadir briefing SOP\nPemeriksaan sampel rekaman (≥95% memenuhi SOP)'),
  ('SB-03-2', 'Sebagian', E'Catatan Pelatihan 005/SOP-015: SOP 003–025 tanggal 2 dan 5 Nov', E'Daftar hadir sesi SOP\nRekap nilai evaluasi\nChecklist audit SMEn yang disusun SPI'),
  ('SB-04-2', 'Sebagian', E'Catatan Pelatihan 005/SOP-015: SOP 003–025 tanggal 2 dan 5 Nov', E'Daftar hadir sesi SOP\nRekap nilai evaluasi\nDaftar SOP relevan untuk bagian'),
  ('SB-05-2', 'Sebagian', E'Catatan Pelatihan 005/SOP-015: SOP 003–025 tanggal 2 dan 5 Nov', E'Daftar hadir sesi SOP\nRekap nilai evaluasi\nDaftar SOP per fungsi kerja'),
  ('SB-06-2', 'Sebagian', E'Catatan Pelatihan 005/SOP-015: SOP 003–025 tanggal 2 dan 5 Nov', E'Daftar hadir sesi SOP\nRekap nilai evaluasi'),
  ('SB-07-2', 'Sebagian', E'Catatan Pelatihan 005/SOP-015: SOP 003–025 tanggal 2 dan 5 Nov', E'Daftar hadir sesi SOP\nRekap nilai evaluasi'),
  ('SB-08-2', 'Sebagian', E'Catatan Pelatihan 005/SOP-015: SOP 003–025 tanggal 2 dan 5 Nov', E'Daftar hadir sesi SOP\nRekap nilai evaluasi'),
  ('SB-09-2', 'Sebagian', E'Catatan Pelatihan 005/SOP-015: SOP 003–025 tanggal 2 dan 5 Nov', E'Daftar hadir sesi SOP\nRekap nilai evaluasi'),
  ('SB-10-2', 'Sebagian', E'Catatan Pelatihan 005/SOP-015: SOP 003–025 tanggal 2 dan 5 Nov', E'Daftar hadir sesi SOP\nRekap nilai evaluasi'),
  -- Pola 3: penerapan/inspeksi dan sasaran khusus
  ('SB-01-3', 'Belum', null, E'Rekap inspeksi kepatuhan SOP lintas bagian (≥90%)\nLaporan tindakan korektif'),
  ('SB-02-3', 'Belum', null, E'Rekap biaya energi bulanan\nRekonsiliasi tagihan dengan meter\nAnalisis tren dan evaluasi anggaran usulan efisiensi'),
  ('SB-04-3', 'Belum', E'Formulir 7.4 Komunikasi tersedia (masih template)', E'Hasil pemeriksaan penerapan SOP (≥90%)\nRekaman komunikasi ke pihak berkepentingan\nLog tindak lanjut ketidaksesuaian'),
  ('SB-05-3', 'Belum', E'Formulir Pertimbangan Energi dalam Pengadaan 001/SOP-019 (masih berisi panduan)', E'Status evaluasi pemasok terisi\nSpesifikasi pengadaan yang memuat kriteria energi\nHasil inspeksi SOP fasilitas dan rencana tindak lanjut'),
  ('SB-06-3', 'Belum', E'Register risiko 6.1 (perencanaan, bukan hasil)', E'Evaluasi efektivitas pengendalian risiko energi\nBukti pengendalian akses dan pencadangan data energi\nPemantauan tindak lanjut risiko prioritas'),
  ('SB-07-3', 'Sebagian', E'Formulir Pertimbangan Energi dalam Desain 001/SOP-018 terisi (identifikasi SEU, peluang LED, dll.)', E'Daftar dokumen desain proyek yang ditelaah (100%)\nRekap % kriteria energi terpenuhi atau ditindaklanjuti'),
  ('SB-08-3', 'Belum', null, E'Checklist praktik hemat energi di kantor (≥90%)\nLog ketidaksesuaian dengan PIC dan tenggat'),
  ('SB-09-3', 'Belum', null, E'Checklist inspeksi SOP operasional kawasan (≥90%)\nLog ketidaksesuaian, PIC, tenggat, dan verifikasi'),
  ('SB-10-3', 'Belum', E'Formulir Pengendalian Operasional 001/SOP-017 (matriks perencanaan, bukan hasil inspeksi)', E'Checklist inspeksi berkala terisi\nRekap % kepatuhan SOP\nVerifikasi penyelesaian tindak lanjut')
)
update sasaran s
set bukti_status = b.status, bukti_tersedia = b.tersedia, bukti_kurang = b.kurang,
    bukti_diperiksa = date '2026-11-11', diubah_at = now()
from b
where s.kode = b.kode and (s.bukti_diperiksa is null or s.bukti_diperiksa = date '2026-11-11');
