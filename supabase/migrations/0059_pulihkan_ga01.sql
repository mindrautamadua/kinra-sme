-- Pulihkan rekaman GA-01 (Laporan Gap Analysis) di Kesiapan Audit yang terhapus lewat aplikasi pada 11 November 2026.
-- Baris dibuat ulang dengan isian asal migrasi 0013, nama disesuaikan dengan laporan yang kini disusun
-- ("Laporan Gap Analysis dan Penutupan Gap", draf Rev.0 tanggal 11 November 2026).
-- Berkas evidence lama GA-01 (bila ada) ikut terhapus dari Storage saat item dihapus dan harus diunggah ulang.
-- Jalankan setelah 0058. Aman diulang: tidak melakukan apa pun bila GA-01 sudah ada.

insert into dokumen_audit (kode, kelompok, klausul_kode, nama, nomor_dokumen, status, keterangan)
select 'GA-01', 'persiapan'::kelompok_dokumen, 'P',
       'Laporan Gap Analysis dan Penutupan Gap (kondisi awal, kondisi kini, dan rencana penutupan terhadap ISO 50001)',
       null, 'draft'::status_dokumen,
       'Dianjurkan Panduan SMEn · Dipulihkan 11 Nov 2026 setelah terhapus · Draf Rev.0 (11 Nov 2026) menunggu pengesahan'
where not exists (select 1 from dokumen_audit where kode = 'GA-01');
