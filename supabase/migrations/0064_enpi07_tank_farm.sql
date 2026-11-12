-- Variabel relevan tonase tangki timbun dan ENPI-07 (listrik Tank Farm ternormalisasi tonase).
-- Sumber: "Pelacak Konsumsi Energi" (dok. 004/SOP-008/KINRA/SMEn/X/2026), versi OneDrive 12 Nov 2026 ±13.55 WIB,
-- sheet Variabel yang Relevan, blok "TANGKI TIMBUN – Jumlah (kg)". Lima jalur pemompaan dijumlahkan:
--   Pemompaan CPO/CPKO dari Tank Farm; Unloading Truck CPO/CPKO; Pemompaan CPO dari Buffer Tank Kereta Api ke PT INL;
--   Pemompaan CPKO dari PKSMK ke PT UOI; Pemompaan CPO dari PSMKI ke PT INL. Sel "-" dibaca 0. Disimpan dalam ton.
--   Data tersedia Jan 2025 – Okt 2026 (baris 2024 masih kosong di sumber).
-- Analisis (12 Nov 2026):
--   * Total tonase vs kWh Tank Farm (KINRA-MTR-009), 22 bulan: r = 0,91. Jalur Buffer Tank Kereta Api paling erat (r = 0,91),
--     menandakan pompa buffer kereta api ikut terukur di meter Tank Farm (belum dikonfirmasi M/E).
--   * Baseline Jan–Des 2025: kWh = 4.699,5 + 0,5315 × ton; R² = 0,80; CV(RMSE) = 16,5% (sedikit di atas 15%).
--     Rasio murni (0,99 kWh/ton) tidak layak (R² = 0,20) karena ada beban dasar ±4.700 kWh/bulan.
--   * Jan–Okt 2026: aktual 136.618 kWh vs harapan 124.216 kWh, boros ±10%. Seluruh tonase 2026 di dalam rentang baseline.
-- Tank Farm bukan SEU (porsi ±2,7% listrik KINRA); EnPI ini untuk pemantauan dan bukti hubungan konsumsi–volume (6.3, 6.4).
-- Jalankan setelah 0063. Aman diulang.

-- 1. Variabel
insert into variabel_relevan (kode, nama, satuan, keterangan, urutan) values
  ('tonase_tangki_timbun', 'Tonase pemompaan tangki timbun', 'ton',
   'Jumlah lima jalur pemompaan/bongkar CPO dan CPKO di Tank Farm per bulan (sheet Variabel yang Relevan, blok TANGKI TIMBUN, kg dibagi 1.000): dari Tank Farm, unloading truck, Buffer Tank Kereta Api ke PT INL, PKSMK ke PT UOI, PSMKI ke PT INL. Variabel ENPI-07.', 9)
on conflict (kode) do update set nama = excluded.nama, satuan = excluded.satuan, keterangan = excluded.keterangan;

insert into variabel_bulanan (tahun, bulan, variabel_kode, nilai) values
  (2025, 1, 'tonase_tangki_timbun', 15572.827),
  (2025, 2, 'tonase_tangki_timbun', 5071.129),
  (2025, 3, 'tonase_tangki_timbun', 4507.609),
  (2025, 4, 'tonase_tangki_timbun', 4991.638),
  (2025, 5, 'tonase_tangki_timbun', 4987.029),
  (2025, 6, 'tonase_tangki_timbun', 4643),
  (2025, 7, 'tonase_tangki_timbun', 8518.726),
  (2025, 8, 'tonase_tangki_timbun', 16668.717),
  (2025, 9, 'tonase_tangki_timbun', 22572.192),
  (2025, 10, 'tonase_tangki_timbun', 12469.546),
  (2025, 11, 'tonase_tangki_timbun', 7380.483),
  (2025, 12, 'tonase_tangki_timbun', 14967.775),
  (2026, 1, 'tonase_tangki_timbun', 15899.795),
  (2026, 2, 'tonase_tangki_timbun', 13148.698),
  (2026, 3, 'tonase_tangki_timbun', 10943.792),
  (2026, 4, 'tonase_tangki_timbun', 13443.754),
  (2026, 5, 'tonase_tangki_timbun', 10852.492),
  (2026, 6, 'tonase_tangki_timbun', 12443.498),
  (2026, 7, 'tonase_tangki_timbun', 15716.502),
  (2026, 8, 'tonase_tangki_timbun', 16777.071),
  (2026, 9, 'tonase_tangki_timbun', 16486.517),
  (2026, 10, 'tonase_tangki_timbun', 19572.971)
on conflict (tahun, bulan, variabel_kode) do update set nilai = excluded.nilai;

-- 2. ENPI-07
insert into enpi (kode, nama, sumber_kode, metode, variabel_kode, baseline_mulai, baseline_selesai, alasan_baseline, catatan, aktif, urutan, lingkup, meter_kode) values
  ('ENPI-07', 'Listrik Tank Farm ternormalisasi tonase', '{pln}', 'regresi', '{tonase_tangki_timbun}', '2025-01-01', '2025-12-01',
   'Tahun penuh pertama dengan kWh meter Tank Farm (KINRA-MTR-009) dan tonase pemompaan tangki timbun lengkap.',
   'kWh meter Tank Farm (KINRA-MTR-009) dimodelkan terhadap tonase pemompaan CPO/CPKO. Regresi dipilih karena ada beban dasar ±4.700 kWh/bulan (rasio murni R² 0,20). Tank Farm bukan SEU (±2,7% listrik KINRA); EnPI ini untuk pemantauan. Cakupan meter (seluruh kawasan, termasuk pompa buffer kereta api) dan sumber angka tonase belum dikonfirmasi M/E.',
   true, 7, 'kinra', '{KINRA-MTR-009}')
on conflict (kode) do update set
  nama = excluded.nama, sumber_kode = excluded.sumber_kode, metode = excluded.metode, variabel_kode = excluded.variabel_kode,
  baseline_mulai = excluded.baseline_mulai, baseline_selesai = excluded.baseline_selesai, alasan_baseline = excluded.alasan_baseline,
  catatan = excluded.catatan, lingkup = excluded.lingkup, meter_kode = excluded.meter_kode, diubah_at = now();
