-- Koreksi nama sungai sumber air baku intake WTP I: Sungai Bah Bolon (bukan "Sungai Bah Tongguran").
-- Dikonfirmasi pengguna 13 Nov 2026; PP 29/2012 juga menyebut sungai Bah Bolon sebagai batas barat KEK Sei Mangkei.
-- Memperbaiki teks yang ditanam oleh 0065 (meter KINRA-MTR-008, variabel air_baku1) dan 0075 (lembar PD-02).
-- Jalankan setelah 0075. Aman diulang.

update meter_energi set
  area_dilayani = replace(area_dilayani, 'Bah Tongguran', 'Bah Bolon'),
  beban_diukur = replace(beban_diukur, 'Bah Tongguran', 'Bah Bolon'),
  catatan = replace(catatan, 'Bah Tongguran', 'Bah Bolon'),
  diubah_at = now()
where concat_ws(' ', area_dilayani, beban_diukur, catatan) ilike '%Bah Tongguran%';

update variabel_relevan set
  keterangan = replace(keterangan, 'Bah Tongguran', 'Bah Bolon')
where keterangan ilike '%Bah Tongguran%';

update lembar_penyelidikan set
  pertanyaan = replace(pertanyaan::text, 'Bah Tongguran', 'Bah Bolon')::jsonb,
  ringkasan = replace(ringkasan, 'Bah Tongguran', 'Bah Bolon'),
  hipotesis = replace(hipotesis, 'Bah Tongguran', 'Bah Bolon')
where concat_ws(' ', pertanyaan::text, ringkasan, hipotesis) ilike '%Bah Tongguran%';
