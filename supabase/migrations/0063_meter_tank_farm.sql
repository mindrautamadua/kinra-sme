-- Meter listrik Tank Farm (KINRA-MTR-009), dari sumber "Pelacak Konsumsi Energi" (dok. 004/SOP-008/KINRA/SMEn/X/2026)
-- versi OneDrive 12 Nov 2026 (siang). Sumber menambahkan baris "Tank Farm" (kWh) Jan 2024 – Okt 2026.
-- Pengguna mengonfirmasi (12 Nov 2026) bahwa Tank Farm dikelola KINRA, sehingga masuk lingkup SMEn:
--   1) Meter baru KINRA-MTR-009, terhubung ke aset Kantor Tank Farm (KINRA-AST-035). Nomor meter, merek,
--      dan faktor kali belum diketahui (sementara 1, angka sumber dianggap kWh tagihan).
--   2) kWh Tank Farm: 2024 = 177.144,4; 2025 = 121.425,4; 2026 Jan–Okt = 136.618,4.
--   3) ENPI-04 (listrik pemakaian sendiri KINRA) ditambah meter KINRA-MTR-009. Data tersedia sejak Jan 2024,
--      jadi baseline dan periode pelaporan dihitung ulang dengan cakupan yang sama (penyesuaian batas, 6.5).
-- Catatan sumber: penyisipan baris merusak dua rumus di workbook (rasio Air Baku I 2026 di sheet Variabel yang
-- Relevan kini Tank Farm/Air Baku I, dan rasio baris 88 sheet Konsumsi Energi kini WTP/Tank Farm). Aplikasi tidak
-- memakai rumus tersebut. Jalankan setelah 0062. Aman diulang.

-- 1. Meter
insert into meter_energi (kode, no_urut, no_meter, sumber_kode, lokasi, area_dilayani, aset_kode, beban_diukur, satuan, faktor_kali, frekuensi_pencatatan, metode_pengiriman, catatan) values
  ('KINRA-MTR-009', 9, null, 'pln', 'Tank Farm', 'Tank Farm', 'KINRA-AST-035',
   'Kawasan Tank Farm (kantor, pos security, ruang tunggu, ruang boiler, pompa buffer/transfer tangki timbun)',
   'kWh', 1, 'Bulanan', 'Manual',
   'Dikelola KINRA (konfirmasi pengguna, 12 Nov 2026). NOMOR METER, MEREK, DAN FAKTOR KALI BELUM DIKONFIRMASI M/E (sementara 1). kWh Jan 2024 – Okt 2026 dari sheet Konsumsi Energi, baris Tank Farm.')
on conflict (kode) do nothing;

-- 2. kWh Tank Farm
insert into pembacaan_meter (meter_kode, tahun, bulan, kwh_tagihan, catatan) values
  ('KINRA-MTR-009', 2024, 1, 16687.2, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2024, 2, 12055.4, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2024, 3, 16382.4, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2024, 4, 11947.2, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2024, 5, 14988, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2024, 6, 11229.6, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2024, 7, 14438.6, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2024, 8, 13008, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2024, 9, 13922.4, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2024, 10, 17126.4, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2024, 11, 19346.4, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2024, 12, 16012.8, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 1, 15998.4, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 2, 7380, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 3, 7519.2, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 4, 6674.4, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 5, 6506.4, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 6, 6624, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 7, 7814.4, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 8, 10596, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 9, 15753.6, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 10, 12292.6, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 11, 10312.8, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2025, 12, 13953.6, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2026, 1, 14314.4, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2026, 2, 14246.4, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2026, 3, 12216, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2026, 4, 13348.8, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2026, 5, 11683.2, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2026, 6, 11632.8, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2026, 7, 12547.2, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2026, 8, 15727.2, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2026, 9, 14973.6, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).'),
  ('KINRA-MTR-009', 2026, 10, 15928.8, 'Sheet Konsumsi Energi, baris Tank Farm (versi OneDrive 12 Nov 2026).')
on conflict (meter_kode, tahun, bulan) do update
  set kwh_tagihan = excluded.kwh_tagihan, catatan = excluded.catatan;

-- 3. ENPI-04 mencakup Tank Farm
update enpi set meter_kode = array_append(meter_kode, 'KINRA-MTR-009'), diubah_at = now()
where kode = 'ENPI-04' and not ('KINRA-MTR-009' = any(meter_kode));

update enpi set
  catatan = concat_ws(' ', nullif(catatan, ''),
    'Penyesuaian batas (12 Nov 2026): meter Tank Farm KINRA-MTR-009 ditambahkan karena Tank Farm dikelola KINRA; data Jan 2024 – Okt 2026 tersedia sehingga baseline dan pelaporan memakai cakupan yang sama.'),
  diubah_at = now()
where kode = 'ENPI-04' and coalesce(catatan, '') not like '%KINRA-MTR-009%';
