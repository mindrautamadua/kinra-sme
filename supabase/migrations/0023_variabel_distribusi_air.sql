-- Variabel relevan "air_olahan" diisi dari Rekapan Laporan Distribusi Air Bersih (sheet 2024 air besih,
-- 2025 air besih Realisasi, 2026 air besih Realisasi; kolom TOTAL KESELURUHAN, WTP I).
-- Angka yang dipakai adalah realisasi terukur, bukan tagihan minimum (sheet e-min).
-- WTP II (BTM, stand meter terpisah 2026) belum dimasukkan sampai cakupan listriknya jelas.
--
-- Juga menambah EnPI-03 percobaan: listrik kawasan dinormalisasi volume distribusi air (regresi, baseline 2025).
-- EnPI-02 (absolut) tidak diubah agar sasaran yang memakainya tetap utuh.
--
-- Jalankan setelah 0007. Aman diulang: data bulanan yang sudah diubah dari aplikasi tidak ditimpa.

insert into variabel_relevan (kode, nama, satuan, keterangan, urutan) values
  ('air_olahan', 'Distribusi air bersih WTP I', 'm³', 'Total distribusi air bersih WTP I per bulan (tenant + unit sendiri + kontraktor), realisasi terukur', 2)
on conflict (kode) do update set nama = excluded.nama, satuan = excluded.satuan, keterangan = excluded.keterangan;

insert into variabel_bulanan (tahun, bulan, variabel_kode, nilai) values
  (2024, 1, 'air_olahan', 172571),
  (2024, 2, 'air_olahan', 177827),
  (2024, 3, 'air_olahan', 205791.2),
  (2024, 4, 'air_olahan', 199826),
  (2024, 5, 'air_olahan', 253954),
  (2024, 6, 'air_olahan', 211439),
  (2024, 7, 'air_olahan', 213722.6),
  (2024, 8, 'air_olahan', 218195.6),
  (2024, 9, 'air_olahan', 224589),
  (2024, 10, 'air_olahan', 214250.6),
  (2024, 11, 'air_olahan', 214033),
  (2024, 12, 'air_olahan', 206717.6),
  (2025, 1, 'air_olahan', 218989),
  (2025, 2, 'air_olahan', 210455),
  (2025, 3, 'air_olahan', 197358),
  (2025, 4, 'air_olahan', 195214),
  (2025, 5, 'air_olahan', 226242),
  (2025, 6, 'air_olahan', 228643),
  (2025, 7, 'air_olahan', 267717),
  (2025, 8, 'air_olahan', 307490),
  (2025, 9, 'air_olahan', 282271),
  (2025, 10, 'air_olahan', 330363),
  (2025, 11, 'air_olahan', 388599),
  (2025, 12, 'air_olahan', 433701),
  (2026, 1, 'air_olahan', 583150),
  (2026, 2, 'air_olahan', 583077),
  (2026, 3, 'air_olahan', 638274),
  (2026, 4, 'air_olahan', 615520),
  (2026, 5, 'air_olahan', 646446),
  (2026, 6, 'air_olahan', 643033),
  (2026, 7, 'air_olahan', 685819),
  (2026, 8, 'air_olahan', 711603),
  (2026, 9, 'air_olahan', 652977),
  (2026, 10, 'air_olahan', 657789)

on conflict (tahun, bulan, variabel_kode) do nothing;

insert into enpi (kode, nama, sumber_kode, metode, variabel_kode, baseline_mulai, baseline_selesai, alasan_baseline, catatan, urutan) values
  ('ENPI-03', 'Listrik kawasan ternormalisasi distribusi air', '{pln,pltbg,plts}', 'regresi', '{air_olahan}', '2025-01-01', '2025-12-01',
   'Tahun penuh terakhir sebelum penerapan SMEn, sama dengan EnPI-02 agar dapat dibandingkan.',
   'PERCOBAAN. Volume air dipakai sebagai penanda aktivitas tenant, bukan beban listrik langsung (listrik WTP sekitar 1% listrik kawasan). Distribusi air 2026 jauh di atas rentang baseline 2025, sehingga harapan 2026 adalah ekstrapolasi; jangan klaim penghematan dari EnPI ini sebelum ada baseline yang mencakup kondisi operasi baru.',
   3)
on conflict (kode) do nothing;
