-- Variabel relevan "tenant" diisi dari Rekapan Laporan Distribusi Air Bersih (sheet 2024 air besih,
-- 2025 air besih Realisasi, 2026 air besih Realisasi): jumlah kolom tenant dengan pemakaian air > 0 m3 per bulan.
-- Kontraktor tidak dihitung. Kolom "PLTS" di sheet 2026 dikeluarkan karena kemungkinan unit KINRA sendiri.
-- Catatan: tenant yang tercatat memakai air belum tentu berproduksi penuh. Ganti dengan daftar resmi tenant
-- beroperasi bila tersedia (dapat diketik langsung di halaman Kinerja Energi).
--
-- Jalankan setelah 0007. Aman diulang: data bulanan yang sudah diubah dari aplikasi tidak ditimpa.

insert into variabel_relevan (kode, nama, satuan, keterangan, urutan) values
  ('tenant', 'Tenant beroperasi', 'unit', 'Jumlah tenant dengan pemakaian air bersih > 0 m³ pada bulan tersebut (dari rekap distribusi air; kontraktor dan PLTS tidak dihitung)', 1)
on conflict (kode) do update set keterangan = excluded.keterangan;

insert into variabel_bulanan (tahun, bulan, variabel_kode, nilai) values
  (2024, 1, 'tenant', 12),
  (2024, 2, 'tenant', 12),
  (2024, 3, 'tenant', 12),
  (2024, 4, 'tenant', 12),
  (2024, 5, 'tenant', 13),
  (2024, 6, 'tenant', 13),
  (2024, 7, 'tenant', 13),
  (2024, 8, 'tenant', 13),
  (2024, 9, 'tenant', 13),
  (2024, 10, 'tenant', 14),
  (2024, 11, 'tenant', 14),
  (2024, 12, 'tenant', 15),
  (2025, 1, 'tenant', 15),
  (2025, 2, 'tenant', 15),
  (2025, 3, 'tenant', 15),
  (2025, 4, 'tenant', 15),
  (2025, 5, 'tenant', 15),
  (2025, 6, 'tenant', 15),
  (2025, 7, 'tenant', 16),
  (2025, 8, 'tenant', 16),
  (2025, 9, 'tenant', 16),
  (2025, 10, 'tenant', 16),
  (2025, 11, 'tenant', 16),
  (2025, 12, 'tenant', 17),
  (2026, 1, 'tenant', 17),
  (2026, 2, 'tenant', 17),
  (2026, 3, 'tenant', 17),
  (2026, 4, 'tenant', 18),
  (2026, 5, 'tenant', 18),
  (2026, 6, 'tenant', 19),
  (2026, 7, 'tenant', 19),
  (2026, 8, 'tenant', 20),
  (2026, 9, 'tenant', 21),
  (2026, 10, 'tenant', 22)
on conflict (tahun, bulan, variabel_kode) do nothing;
