-- Konfirmasi Bagian M/E (12 Nov 2026) atas gambar alir WTP KEK Sei Mangkei:
--   1) Meter intake KINRA-MTR-008 mengukur kedua sumber air baku: pompa di Sungai Bah Tongguran dan pompa di kolam
--      Water Intake. Dulu air sungai dipompa ke kolam Water Intake; sekarang air sungai langsung dipompa ke settling pit.
--   2) Air Baku I di sheet "Variabel yang Relevan" adalah jumlah dua water meter di depan settling pit:
--      FM1a (dari kolam Water Intake) + FM1b (langsung dari sungai).
-- Jalankan setelah 0064. Aman diulang.

update meter_energi set
  area_dilayani = 'Intake WTP 1: pompa Sungai Bah Tongguran dan pompa kolam Water Intake',
  beban_diukur = 'Pompa air baku WTP 1 (4 pompa submersible: 2 di sungai, 2 di kolam Water Intake)',
  catatan = 'Faktor kali ×1 (konfirmasi Bagian M/E, 7 Nov 2026). Meter fisik terpisah dari WTP (KINRA-MTR-005), dikonfirmasi 10 Nov 2026. Mengukur kedua sumber air baku, sungai dan kolam Water Intake (konfirmasi 12 Nov 2026). Dulu air sungai masuk ke kolam Water Intake; sekarang langsung dipompa ke settling pit.',
  diubah_at = now()
where kode = 'KINRA-MTR-008';

update variabel_relevan set
  nama = 'Air baku WTP I',
  keterangan = 'Volume air baku WTP I per bulan = water meter FM1a (dari kolam Water Intake) + FM1b (langsung dari Sungai Bah Tongguran), dicatat di depan settling pit (konfirmasi Bagian M/E, 12 Nov 2026). Sheet Variabel yang Relevan, baris Air Baku I. Pembagi EnPI pompa intake (kWh KINRA-MTR-008 per m³ air baku).'
where kode = 'air_baku1';
