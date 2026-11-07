-- Variabel relevan baru untuk SEU-01 WTP 1: air yang benar-benar diolah WTP 1 (tanpa air WTP 2/BTM).
-- Sumber: Rekapan Laporan Distribusi Air Bersih (kolom TOTAL KESELURUHAN) dikurangi distribusi BTM (tabel BTM, sheet 2026).
-- BTM (Bangun Tirta Medan) adalah WTP 2 milik pihak ketiga; KINRA membeli airnya (konfirmasi Bagian M/E, 7 Nov 2026).
--
-- Nov 2025 – Jan 2026 SENGAJA dikosongkan: BTM sudah menyuplai sejak sebelum Jan 2026, tetapi seluruhnya tertagih di Jan 2026,
-- sehingga pembagian air WTP 1 per bulan tidak diketahui (distribusi Nov–Des 2025 sudah melebihi kapasitas WTP 1 500 m³/jam).
-- 2024 – Okt 2025 sama dengan distribusi total (belum ada suplai BTM).
--
-- Dipakai halaman Laboratorium EnPI. Migrasi ini TIDAK mengubah ENPI-05; perubahan ENPI-05 menyusul setelah tanggal pasang VSD
-- dikonfirmasi. Jalankan setelah 0037. Aman diulang.

insert into variabel_relevan (kode, nama, satuan, keterangan, urutan) values
  ('air_wtp1', 'Air diolah WTP 1 (tanpa BTM)', 'm³',
   'Distribusi air bersih total dikurangi air WTP 2 (BTM, dibeli dari pihak ketiga). Nov 2025 – Jan 2026 kosong karena air BTM periode itu tertagih sekaligus di Jan 2026. Ganti dengan meter air baku digital WTP 1 bila datanya tersedia.', 3)
on conflict (kode) do update set nama = excluded.nama, satuan = excluded.satuan, keterangan = excluded.keterangan;

insert into variabel_bulanan (tahun, bulan, variabel_kode, nilai) values
  (2024, 1, 'air_wtp1', 172571),
  (2024, 2, 'air_wtp1', 177827),
  (2024, 3, 'air_wtp1', 205791.2),
  (2024, 4, 'air_wtp1', 199826),
  (2024, 5, 'air_wtp1', 253954),
  (2024, 6, 'air_wtp1', 211439),
  (2024, 7, 'air_wtp1', 213722.6),
  (2024, 8, 'air_wtp1', 218195.6),
  (2024, 9, 'air_wtp1', 224589),
  (2024, 10, 'air_wtp1', 214250.6),
  (2024, 11, 'air_wtp1', 214033),
  (2024, 12, 'air_wtp1', 206717.6),
  (2025, 1, 'air_wtp1', 218989),
  (2025, 2, 'air_wtp1', 210455),
  (2025, 3, 'air_wtp1', 197358),
  (2025, 4, 'air_wtp1', 195214),
  (2025, 5, 'air_wtp1', 226242),
  (2025, 6, 'air_wtp1', 228643),
  (2025, 7, 'air_wtp1', 267717),
  (2025, 8, 'air_wtp1', 307490),
  (2025, 9, 'air_wtp1', 282271),
  (2025, 10, 'air_wtp1', 330363),
  (2026, 2, 'air_wtp1', 348361),
  (2026, 3, 'air_wtp1', 384476),
  (2026, 4, 'air_wtp1', 344857),
  (2026, 5, 'air_wtp1', 318437),
  (2026, 6, 'air_wtp1', 356533),
  (2026, 7, 'air_wtp1', 352225),
  (2026, 8, 'air_wtp1', 326505),
  (2026, 9, 'air_wtp1', 316868),
  (2026, 10, 'air_wtp1', 306111)
on conflict (tahun, bulan, variabel_kode) do update set nilai = excluded.nilai, diubah_at = now();
