-- Harga dan faktor emisi bensin untuk tampilan rupiah dan CO₂ (sumber energi bensin ditambahkan di 0035).
-- Tanpa baris ini aplikasi memakai nilai bawaan yang sama (lib/konversi.ts), tetapi nilainya tidak bisa diubah
-- dari halaman Data Energi. Jalankan setelah 0035. Aman diulang: baris yang sudah ada tidak ditimpa.

insert into parameter_energi (kode, nama, nilai, satuan, status, sumber, urutan) values
  ('harga_bensin', 'Harga BBM bensin', 12500, 'Rp/liter', 'Asumsi',
   'Rata-rata 2025 pada sheet Konsumsi Energi (Pelacak Konsumsi Energi); verifikasi dengan nota pembelian.', 5),
  ('ef_bensin', 'Faktor emisi BBM bensin', 2.31, 'kg CO₂/liter', 'Asumsi',
   'Default IPCC untuk bensin; verifikasi dengan faktor emisi nasional.', 6)
on conflict (kode) do nothing;
