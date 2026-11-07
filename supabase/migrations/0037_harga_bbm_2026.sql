-- Harga BBM terkini untuk tampilan rupiah (bukan untuk EnPI: EnPI BBM dihitung dalam liter).
-- Sumber: sheet "Konsumsi Energi" (Pelacak Konsumsi Energi), Okt 2026 = biaya ÷ liter:
--   Dexlite Rp27.128.200 ÷ 1.121 L = Rp24.200/L (2024–2025 ±Rp13.500/L; naik sejak Apr 2026)
--   Bensin  Rp19.710.000 ÷ 1.209 L = Rp16.303/L (Jan–Jun 2026 ±Rp12.500/L; naik sejak Jul 2026, sejalan dengan Pertamax)
-- Kenaikan sejalan dengan harga BBM nonsubsidi 2026. Konfirmasi produk yang dibeli (Dexlite atau Pertamina Dex, Pertamax).
-- Perbarui lagi di halaman Data Energi bila harga berubah. Jalankan setelah 0036. Aman diulang.

insert into parameter_energi (kode, nama, nilai, satuan, status, sumber, urutan) values
  ('harga_dexlite', 'Harga BBM Dexlite', 24200, 'Rp/liter', 'Data',
   'Sheet Konsumsi Energi, Okt 2026 (Rp27.128.200 ÷ 1.121 L). Naik dari ±Rp13.500/L sejak Apr 2026; konfirmasi produk (Dexlite atau Pertamina Dex).', 3),
  ('harga_bensin', 'Harga BBM bensin', 16303, 'Rp/liter', 'Data',
   'Sheet Konsumsi Energi, Okt 2026 (Rp19.710.000 ÷ 1.209 L). Naik dari ±Rp12.500/L sejak Jul 2026, sejalan dengan harga Pertamax.', 5)
on conflict (kode) do update
  set nilai = excluded.nilai, status = excluded.status, sumber = excluded.sumber, diubah_at = now();
