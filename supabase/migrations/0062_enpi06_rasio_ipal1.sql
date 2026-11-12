-- ENPI-06 (WWTP) diubah dari absolut ke rasio kWh per m³ air limbah masuk IPAL I.
--   * Prasyarat terpenuhi: inlet IPAL I tersedia Jan 2024 – Okt 2026 (0044, 0060), dan IPAL II tidak dikelola
--     KINRA sehingga di luar lingkup (0061). Meter KINRA-MTR-004 tidak naik sejak IPAL II beroperasi (Jun 2026).
--   * Baseline tetap Jan–Des 2025: k = 2.001.848,4 kWh / 1.087.288 m³ ≈ 1,841 kWh/m³.
--     Jan–Okt 2026: 1.708.470 kWh / 1.437.857 m³ ≈ 1,188 kWh/m³.
--   * Catatan kehati-hatian: volume 2026 (124–160 ribu m³/bulan) di atas rentang baseline (68–112 ribu),
--     dan WWTP punya beban tetap besar, sehingga model rasio cenderung membesar-besarkan penghematan.
--     Pertimbangkan regresi (kWh = a + b × inlet) setelah data cukup, dan pastikan sumber angka inlet (flow meter/estimasi).
--   * Nama lama "Listrik WWTP" diganti. Rencana aksi flow meter influent tetap berlaku (verifikasi sumber debit).
-- Jalankan setelah 0061. Aman diulang.

update enpi set
  nama = 'Intensitas energi WWTP (IPAL I)',
  metode = 'rasio',
  variabel_kode = '{air_ipal_inlet}',
  meter_kode = '{KINRA-MTR-004}',
  baseline_mulai = '2025-01-01',
  baseline_selesai = '2025-12-01',
  alasan_baseline = 'Tahun penuh terakhir dengan kWh tagihan meter WWTP (KINRA-MTR-004) dan volume inlet IPAL I lengkap.',
  catatan = 'kWh meter WWTP (KINRA-MTR-004) dibagi volume air limbah masuk IPAL I. IPAL II (beroperasi sejak Jun 2026) tidak dikelola KINRA dan tidak termasuk. Volume 2026 di atas rentang baseline (ekstrapolasi) dan WWTP punya beban tetap besar, sehingga rasio cenderung membesar-besarkan penghematan; pertimbangkan regresi setelah data cukup. Verifikasi sumber angka inlet melalui flow meter influent.',
  diubah_at = now()
where kode = 'ENPI-06';

update seu
set alasan = replace(alasan,
  'Kinerja dipantau dengan ENPI-06 (absolut sementara; diganti ke kWh/m³ air limbah diolah setelah data inlet 2026 lengkap).',
  'Kinerja dipantau dengan ENPI-06 (rasio kWh/m³ air limbah masuk IPAL I, baseline 2025).')
where kode = 'SEU-02'
  and alasan like '%ENPI-06 (absolut sementara%';
