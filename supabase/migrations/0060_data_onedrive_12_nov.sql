-- Pembaruan data dari sumber "Pelacak Konsumsi Energi" (dok. 004/SOP-008/KINRA/SMEn/X/2026), versi OneDrive
-- yang diubah 12 Nov 2026 (±11:53 WIB). Atas arahan pengguna, dipakai data terbaru:
--   1) kWh intake (KINRA-MTR-008) Okt 2026 = 62.088 (menggantikan 37.633,8 dari 0043).
--   2) Volume IPAL I 2026 Jan–Okt: inlet dan outlet. Outlet Apr–Okt sudah dikoreksi sumber (≈ inlet).
--   3) IPAL II mulai beroperasi Juni 2026: variabel baru air_ipal2_inlet dan air_ipal2_outlet (Jun–Okt 2026).
--      Listrik WWTP (KINRA-MTR-004) tidak naik sejak Juni, jadi kemungkinan meter itu hanya mencakup IPAL I
--      (belum dikonfirmasi M/E). Karena itu IPAL II disimpan terpisah, bukan dijumlahkan ke inlet IPAL I.
--   4) Jam operasi pompa IPAL I: Pompa 8–11 Jan 2026 = 372 jam (sebelumnya 465), Pompa 12 terisi Jan–Okt 2026.
--   5) Keterangan SEU-02 diperbarui: data inlet 2026 sekarang tersedia.
-- Bensin tidak berubah (Jan 2025 – Okt 2026 sudah lengkap sejak 0035).
-- Jalankan setelah 0059. Aman diulang.

-- 1. Intake Okt 2026
insert into pembacaan_meter (meter_kode, tahun, bulan, kwh_tagihan, catatan) values
  ('KINRA-MTR-008', 2026, 10, 62088,
   'Diperbarui dari 37.633,8 sesuai Pelacak Konsumsi Energi versi 12 Nov 2026.')
on conflict (meter_kode, tahun, bulan) do update
  set kwh_tagihan = excluded.kwh_tagihan, catatan = excluded.catatan;

-- 2–3. Volume IPAL
update variabel_relevan set
  keterangan = 'Volume inlet IPAL I per bulan (sheet Variabel yang Relevan). Variabel EnPI WWTP/IPAL (meter KINRA-MTR-004). Tidak termasuk IPAL II (beroperasi sejak Jun 2026).'
where kode = 'air_ipal_inlet';

insert into variabel_relevan (kode, nama, satuan, keterangan, urutan) values
  ('air_ipal2_inlet', 'Air limbah masuk IPAL II (inlet)', 'm³',
   'Volume inlet IPAL II per bulan, beroperasi sejak Jun 2026 (sheet Variabel yang Relevan). Cakupan meter listriknya belum dikonfirmasi M/E.', 7),
  ('air_ipal2_outlet', 'Air olahan keluar IPAL II (outlet)', 'm³',
   'Volume outlet IPAL II per bulan, beroperasi sejak Jun 2026 (sheet Variabel yang Relevan).', 8)
on conflict (kode) do update set nama = excluded.nama, satuan = excluded.satuan, keterangan = excluded.keterangan;

insert into variabel_bulanan (tahun, bulan, variabel_kode, nilai) values
  (2026, 1, 'air_ipal_inlet', 95272),   (2026, 1, 'air_ipal_outlet', 95253),
  (2026, 2, 'air_ipal_inlet', 148727),  (2026, 2, 'air_ipal_outlet', 148665),
  (2026, 3, 'air_ipal_inlet', 123572),  (2026, 3, 'air_ipal_outlet', 123523),
  (2026, 4, 'air_ipal_inlet', 141752),  (2026, 4, 'air_ipal_outlet', 141724),
  (2026, 5, 'air_ipal_inlet', 147926),  (2026, 5, 'air_ipal_outlet', 147866),
  (2026, 6, 'air_ipal_inlet', 151288),  (2026, 6, 'air_ipal_outlet', 151243),
  (2026, 7, 'air_ipal_inlet', 157025),  (2026, 7, 'air_ipal_outlet', 156994),
  (2026, 8, 'air_ipal_inlet', 159621),  (2026, 8, 'air_ipal_outlet', 159557),
  (2026, 9, 'air_ipal_inlet', 154775),  (2026, 9, 'air_ipal_outlet', 154729),
  (2026, 10, 'air_ipal_inlet', 157899), (2026, 10, 'air_ipal_outlet', 157836),
  (2026, 6, 'air_ipal2_inlet', 330874),  (2026, 6, 'air_ipal2_outlet', 334182.74),
  (2026, 7, 'air_ipal2_inlet', 283343),  (2026, 7, 'air_ipal2_outlet', 286176.43),
  (2026, 8, 'air_ipal2_inlet', 291531),  (2026, 8, 'air_ipal2_outlet', 294446.31),
  (2026, 9, 'air_ipal2_inlet', 267032),  (2026, 9, 'air_ipal2_outlet', 269702.32),
  (2026, 10, 'air_ipal2_inlet', 273762), (2026, 10, 'air_ipal2_outlet', 276499.62)
on conflict (tahun, bulan, variabel_kode) do update set nilai = excluded.nilai;

-- 4. Jam operasi pompa IPAL I
insert into jam_operasi_pompa (pompa_kode, tahun, bulan, jam, keterangan) values
  ('PMP-IPAL-08', 2026, 1, 372, null),
  ('PMP-IPAL-09', 2026, 1, 372, null),
  ('PMP-IPAL-10', 2026, 1, 372, null),
  ('PMP-IPAL-11', 2026, 1, 372, null),
  ('PMP-IPAL-12', 2026, 1, 414, null),
  ('PMP-IPAL-12', 2026, 2, 647, null),
  ('PMP-IPAL-12', 2026, 3, 537, null),
  ('PMP-IPAL-12', 2026, 4, 616, null),
  ('PMP-IPAL-12', 2026, 5, 643, null),
  ('PMP-IPAL-12', 2026, 6, 658, null),
  ('PMP-IPAL-12', 2026, 7, 683, null),
  ('PMP-IPAL-12', 2026, 8, 694, null),
  ('PMP-IPAL-12', 2026, 9, 673, null),
  ('PMP-IPAL-12', 2026, 10, 687, null)
on conflict (pompa_kode, tahun, bulan) do update set jam = excluded.jam, keterangan = excluded.keterangan, diubah_at = now();

-- 5. Keterangan SEU-02
update seu
set alasan = replace(alasan,
  'air_ipal_inlet; data 2024–2025, 2026 belum diisi',
  'air_ipal_inlet; data 2024 – Okt 2026, belum termasuk IPAL II yang beroperasi sejak Jun 2026')
where kode = 'SEU-02'
  and alasan like '%air_ipal_inlet; data 2024–2025, 2026 belum diisi%';
