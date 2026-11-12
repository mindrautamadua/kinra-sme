-- IPAL II tidak dikelola KINRA (konfirmasi pengguna, 12 Nov 2026), jadi berada di luar lingkup SMEn.
--   1) Variabel air_ipal2_inlet dan air_ipal2_outlet dari 0060 dihapus. Data bulanannya ikut terhapus (on delete cascade).
--   2) Keterangan air_ipal_inlet dan alasan SEU-02 disesuaikan: variabel EnPI WWTP cukup inlet IPAL I,
--      sejalan dengan meter KINRA-MTR-004 yang tidak naik sejak IPAL II beroperasi (Jun 2026).
-- Jalankan setelah 0060. Aman diulang.

delete from variabel_relevan where kode in ('air_ipal2_inlet', 'air_ipal2_outlet');

update variabel_relevan set
  keterangan = 'Volume inlet IPAL I per bulan (sheet Variabel yang Relevan). Variabel EnPI WWTP/IPAL (meter KINRA-MTR-004). IPAL II (beroperasi sejak Jun 2026) tidak dikelola KINRA dan berada di luar lingkup SMEn.'
where kode = 'air_ipal_inlet';

update seu
set alasan = replace(alasan,
  'air_ipal_inlet; data 2024 – Okt 2026, belum termasuk IPAL II yang beroperasi sejak Jun 2026',
  'air_ipal_inlet; data 2024 – Okt 2026; IPAL II tidak dikelola KINRA sehingga tidak termasuk')
where kode = 'SEU-02'
  and alasan like '%belum termasuk IPAL II yang beroperasi sejak Jun 2026%';
