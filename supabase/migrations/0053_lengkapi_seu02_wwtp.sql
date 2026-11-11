-- Lengkapi register SEU-02 (Instalasi pengolahan air limbah / WWTP) agar kesiapan auditnya tidak lagi bolong
-- pada kolom "Variabel relevan", "EnPI", dan "Data EnPI" (halaman Tinjauan Energi & SEU).
--
--   * Variabel relevan: air_ipal_inlet (air limbah masuk IPAL I, m³/bulan; migrasi 0044, data 2024–2025).
--   * EnPI: ENPI-06 "Listrik WWTP" (meter KINRA-MTR-004, baseline Jan–Des 2025; migrasi 0035).
--     ENPI-06 tetap absolut sementara: data inlet 2026 belum diisi, sehingga model rasio kWh/m³ belum dapat dibentuk.
--   * Alasan: kalimat lama "Variabel relevan ... belum tersedia" diganti keterangan yang sesuai.
--
-- Status SEU-02 tidak diubah (penetapan tetap jejak admin/konsultan). Kolom "Submeter" tetap belum terpenuhi:
-- butuh submeter fisik (mis. blower/aerator), bukan perubahan data.
-- Jalankan setelah 0052. Aman diulang.

update seu
set variabel_kode = case when 'air_ipal_inlet' = any (variabel_kode) then variabel_kode else array_append(variabel_kode, 'air_ipal_inlet') end
where kode = 'SEU-02'
  and exists (select 1 from variabel_relevan where kode = 'air_ipal_inlet');

update seu
set enpi_kode = 'ENPI-06'
where kode = 'SEU-02'
  and enpi_kode is null
  and exists (select 1 from enpi where kode = 'ENPI-06');

update seu
set alasan = replace(alasan,
  'Variabel relevan (mis. debit air limbah masuk) belum tersedia.',
  'Variabel relevan: debit air limbah masuk IPAL I (air_ipal_inlet; data 2024–2025, 2026 belum diisi). '
  || 'Kinerja dipantau dengan ENPI-06 (absolut sementara; diganti ke kWh/m³ air limbah diolah setelah data inlet 2026 lengkap).')
where kode = 'SEU-02'
  and alasan like '%Variabel relevan (mis. debit air limbah masuk) belum tersedia.%';
