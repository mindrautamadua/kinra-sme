-- Koreksi data sesuai sumber baru "Pelacak Konsumsi Energi" (dok. 004/SOP-008/KINRA/SMEn/X/2026) dan konfirmasi Bagian M/E, 10 Nov 2026:
--   1) Meter intake (KINRA-MTR-008) TERPISAH dari meter WTP (KINRA-MTR-005), baik listrik maupun air.
--      Ini membatalkan anggapan migrasi 0039 bahwa angka WTP sudah termasuk intake. kWh intake Jan 2024 – Okt 2026 diisi
--      dari sumber (Okt 2026 = 37.633,8 adalah angka sebenarnya). ENPI-04 dan ENPI-05 sudah memuat MTR-008 sejak 0039,
--      sehingga keduanya otomatis naik.
--   2) Graha Apr 2025 = 12.328,8 kWh (bukan 12.032,88 seperti koreksi di 0035).
--   3) Variabel baru air_baku1: volume air baku Water Intake I (m³), untuk EnPI pompa intake.
--   4) Dengan intake ikut dihitung, penurunan intensitas WTP 1 Feb–Jun 2026 (-12,6% s.d. -14,8%) tidak lagi melewati ambang
--      (sekarang -3,4% s.d. -6,5%). Deviasi tersebut ditandai "Bukan deviasi" dan aksi penyelidikannya dibatalkan.
-- Jalankan setelah 0042. Aman diulang.

-- 1. kWh intake
insert into pembacaan_meter (meter_kode, tahun, bulan, kwh_tagihan, catatan) values
  ('KINRA-MTR-008', 2024, 1, 27142, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2024, 2, 30469.6, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2024, 3, 46475.4, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2024, 4, 36669.4, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2024, 5, 47636.3, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2024, 6, 39246.7, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2024, 7, 41948.9, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2024, 8, 43104, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2024, 9, 45691.1, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2024, 10, 37633.8, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2024, 11, 36297.8, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2024, 12, 31220.4, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 1, 37965.6, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 2, 38947.2, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 3, 33691.2, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 4, 36222, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 5, 42361.2, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 6, 40474.8, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 7, 59248.8, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 8, 80854.8, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 9, 76083.6, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 10, 91207.2, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 11, 99398.4, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2025, 12, 107169.6, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2026, 1, 98790, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2026, 2, 89790.6, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2026, 3, 99771.6, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2026, 4, 92995.2, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2026, 5, 86568, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2026, 6, 94833.6, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2026, 7, 95928, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2026, 8, 90782.4, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2026, 9, 89835.6, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).'),
  ('KINRA-MTR-008', 2026, 10, 37633.8, 'Meter intake terpisah dari WTP (konfirmasi Bagian M/E, 10 Nov 2026).')
on conflict (meter_kode, tahun, bulan) do update
  set kwh_tagihan = excluded.kwh_tagihan, catatan = excluded.catatan;

update meter_energi set
  catatan = 'Faktor kali ×1. Meter fisik terpisah dari WTP (KINRA-MTR-005) untuk listrik dan air (konfirmasi Bagian M/E, 10 Nov 2026). kWh Jan 2024 – Okt 2026 dari sheet Konsumsi Energi.',
  diubah_at = now()
where kode = 'KINRA-MTR-008';

update meter_energi set
  catatan = 'Faktor kali ×200. Tidak termasuk pompa intake: intake diukur terpisah oleh KINRA-MTR-008 (konfirmasi Bagian M/E, 10 Nov 2026).',
  diubah_at = now()
where kode = 'KINRA-MTR-005';

-- 2. Graha Apr 2025
update pembacaan_meter set
  kwh_tagihan = 12328.8,
  catatan = 'Dikoreksi dari 120.328,8 (salah ketik); angka benar 12.328,8 menurut sumber baru dan konfirmasi 10 Nov 2026.'
where meter_kode = 'KINRA-MTR-001' and tahun = 2025 and bulan = 4;

-- 3. Variabel air baku intake
insert into variabel_relevan (kode, nama, satuan, keterangan, urutan) values
  ('air_baku1', 'Air baku Water Intake I', 'm³',
   'Volume air baku yang dipompa Water Intake I ke WTP 1 (sheet Variabel yang Relevan, baris Air Baku I). Pembagi untuk EnPI pompa intake (kWh KINRA-MTR-008 per m³ air baku).', 4)
on conflict (kode) do update set nama = excluded.nama, satuan = excluded.satuan, keterangan = excluded.keterangan;

insert into variabel_bulanan (tahun, bulan, variabel_kode, nilai) values
(2024, 1, 'air_baku1', 172541),
  (2024, 2, 'air_baku1', 178703),
  (2024, 3, 'air_baku1', 207182),
  (2024, 4, 'air_baku1', 200851),
  (2024, 5, 'air_baku1', 255529),
  (2024, 6, 'air_baku1', 212737),
  (2024, 7, 'air_baku1', 214780),
  (2024, 8, 'air_baku1', 219152),
  (2024, 9, 'air_baku1', 225834),
  (2024, 10, 'air_baku1', 212689),
  (2024, 11, 'air_baku1', 212362),
  (2024, 12, 'air_baku1', 169722),
  (2025, 1, 'air_baku1', 221179),
  (2025, 2, 'air_baku1', 212560),
  (2025, 3, 'air_baku1', 199332),
  (2025, 4, 'air_baku1', 197045),
  (2025, 5, 'air_baku1', 228472),
  (2025, 6, 'air_baku1', 230929),
  (2025, 7, 'air_baku1', 270394),
  (2025, 8, 'air_baku1', 310565),
  (2025, 9, 'air_baku1', 285094),
  (2025, 10, 'air_baku1', 333667),
  (2025, 11, 'air_baku1', 392485),
  (2025, 12, 'air_baku1', 438038),
  (2026, 1, 'air_baku1', 331300),
  (2026, 2, 'air_baku1', 351845),
  (2026, 3, 'air_baku1', 413736),
  (2026, 4, 'air_baku1', 365935),
  (2026, 5, 'air_baku1', 335075),
  (2026, 6, 'air_baku1', 382652),
  (2026, 7, 'air_baku1', 377380),
  (2026, 8, 'air_baku1', 344846),
  (2026, 9, 'air_baku1', 341232),
  (2026, 10, 'air_baku1', 341433)
on conflict (tahun, bulan, variabel_kode) do update set nilai = excluded.nilai;

-- 4. ENPI-05 dan SEU-01: perbarui keterangan
update enpi set
  catatan = 'kWh meter WTP 1 (KINRA-MTR-005) + meter intake (KINRA-MTR-008, terpisah) dibagi air diolah WTP 1. Volume 2026 sebagian di atas rentang baseline (ekstrapolasi).',
  diubah_at = now()
where kode = 'ENPI-05';

-- 5. Deviasi ENPI-05 Feb–Jun 2026 bukan deviasi setelah intake dihitung
update deviasi set
  status = 'Bukan deviasi',
  kategori = 'data',
  penyebab = 'Artefak data: kWh intake (KINRA-MTR-008) belum dihitung saat deviasi terdeteksi. Setelah intake ditambahkan (konfirmasi M/E 10 Nov 2026), selisih Feb–Jun 2026 hanya -3,4% s.d. -6,5%, di bawah ambang maks(2 × RMSE, 10%).',
  tindakan = 'Tidak perlu tindakan. Data intake Jan 2024 – Okt 2026 dimuat lewat migrasi 0043.'
where enpi_kode = 'ENPI-05' and tahun = 2026 and bulan between 2 and 6 and jenis = 'bulanan' and arah = 'hemat'
  and status in ('Diselidiki', 'Ditanggapi');

update rencana_aksi set
  status = 'Batal',
  catatan = concat_ws(' ', nullif(catatan, ''), 'Dibatalkan 10 Nov 2026: penurunan Feb–Jun 2026 ternyata karena kWh intake belum dihitung (migrasi 0043).')
where catatan like '%[usulan:deviasi-wtp-2026]%' and status in ('Rencana', 'Berjalan', 'Ditunda');

update rencana_aksi set
  catatan = concat_ws(' ', nullif(catatan, ''), 'Pembaruan 10 Nov 2026: bacaan intake terpisah sudah tersedia Jan 2024 – Okt 2026 dan variabel air_baku1 sudah ada, jadi kajian bisa dimulai lebih awal.')
where catatan like '%[usulan:pompa-intake-wtp]%' and coalesce(catatan, '') not like '%Pembaruan 10 Nov 2026%';
