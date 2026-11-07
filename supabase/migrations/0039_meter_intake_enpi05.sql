-- Meter intake WTP 1, ENPI-05 dengan baseline 2025, register deviasi WTP 1, dan rencana aksi LED PJU.
-- Konfirmasi Bagian M/E (7 Nov 2026):
--   * Meter WTP No. 250392323 (KINRA-MTR-005) dan meter intake No. 215266996 (ruang trafo IPAL) adalah dua meter fisik;
--     angka WTP di sheet Konsumsi Energi s.d. Okt 2026 adalah gabungan keduanya.
--   * VSD pompa distribusi dipasang bertahap: 10 Okt 2022, 29 Jan 2024, Agu 2025 (2 beroperasi, 1 standby, masih aktif).
--     VSD sudah menjadi bagian kondisi baseline 2025, sehingga bukan aksi peningkatan terhadap EnB.
-- Jalankan setelah 0038. Aman diulang.

-- 1. Meter intake (faktor kali belum dikonfirmasi: sementara 1)
insert into meter_energi (kode, no_urut, no_meter, sumber_kode, lokasi, area_dilayani, aset_kode, beban_diukur, satuan, faktor_kali, frekuensi_pencatatan, metode_pengiriman, catatan) values
  ('KINRA-MTR-008', 8, '215266996', 'pln', 'Ruang trafo IPAL', 'Intake WTP 1 (pompa air baku)', 'KINRA-AST-005', 'Pompa intake / air baku WTP 1', 'kWh', 1, 'Bulanan', 'Manual',
   'FAKTOR KALI BELUM DIKONFIRMASI (sementara 1). S.d. Okt 2026 kWh intake digabung dalam angka WTP (KINRA-MTR-005); mulai Nov 2026 dicatat terpisah.')
on conflict (kode) do nothing;

update meter_energi set
  beban_diukur = 'Proses dan pompa distribusi WTP 1 (3 VSD: 2 beroperasi, 1 standby)',
  catatan = concat_ws(' ', nullif(catatan, ''), 'S.d. Okt 2026 angka tagihan di sheet Konsumsi Energi termasuk meter intake KINRA-MTR-008. Mulai Nov 2026 isi stand meter ini tanpa intake.'),
  diubah_at = now()
where kode = 'KINRA-MTR-005' and coalesce(catatan, '') not like '%termasuk meter intake%';

insert into pembacaan_meter (meter_kode, tahun, bulan, kwh_tagihan, catatan) values
  ('KINRA-MTR-008', 2024, 1, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2024, 2, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2024, 3, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2024, 4, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2024, 5, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2024, 6, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2024, 7, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2024, 8, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2024, 9, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2024, 10, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2024, 11, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2024, 12, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 1, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 2, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 3, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 4, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 5, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 6, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 7, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 8, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 9, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 10, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 11, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2025, 12, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2026, 1, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2026, 2, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2026, 3, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2026, 4, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2026, 5, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2026, 6, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2026, 7, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2026, 8, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2026, 9, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.'),
  ('KINRA-MTR-008', 2026, 10, 0, 'Digabung ke KINRA-MTR-005: angka WTP di sheet Konsumsi Energi s.d. Okt 2026 sudah termasuk intake.')
on conflict (meter_kode, tahun, bulan) do nothing;

-- 2. EnPI: meter intake ikut ENPI-04 dan ENPI-05; ENPI-05 rasio air WTP 1, baseline 2025, EnPI utama
update enpi set meter_kode = array_append(meter_kode, 'KINRA-MTR-008'), diubah_at = now()
where kode = 'ENPI-04' and not ('KINRA-MTR-008' = any(meter_kode));

update enpi set
  nama = 'Intensitas energi WTP 1',
  metode = 'rasio', variabel_kode = '{air_wtp1}', meter_kode = '{KINRA-MTR-005,KINRA-MTR-008}',
  baseline_mulai = '2025-01-01', baseline_selesai = '2025-12-01', aktif = true,
  alasan_baseline = 'Tahun penuh terakhir dengan kWh tagihan lengkap. Nov–Des 2025 tidak punya data air WTP 1 (air BTM tertagih di Jan 2026), sehingga baseline efektif 10 bulan. Ketiga VSD pompa distribusi (2022, 2024, Agu 2025) sudah beroperasi dan menjadi bagian kondisi baseline.',
  catatan = 'kWh meter WTP 1 + intake dibagi air diolah WTP 1 (distribusi total dikurangi air WTP 2/BTM). Ganti variabel dengan meter air baku digital bila datanya tersedia. Volume 2026 sebagian di atas rentang baseline (ekstrapolasi).',
  diubah_at = now()
where kode = 'ENPI-05';

update enpi set utama = false where utama and kode <> 'ENPI-05';
update enpi set utama = true where kode = 'ENPI-05';

update seu set meter_kode = '{KINRA-MTR-005,KINRA-MTR-008}', variabel_kode = '{air_wtp1}', enpi_kode = 'ENPI-05',
  deskripsi = 'Pompa intake (air baku), pengolahan, dan pompa distribusi WTP 1 (3 VSD, 2 beroperasi). Kapasitas 500 m³/jam, 24 jam/hari. Air WTP 2 (BTM) dibeli dari pihak ketiga dan di luar lingkup.',
  diubah_at = now()
where kode = 'SEU-01';

-- 3. Register deviasi: penurunan intensitas WTP 1 Feb–Jun 2026 (terdeteksi otomatis, penyebab belum diketahui)
insert into deviasi (enpi_kode, tahun, bulan, jenis, arah, selisih_persen, status, kategori, penyebab, tindakan, pic, tenggat) values
  ('ENPI-05', 2026, 2, 'bulanan', 'hemat', -12.6, 'Diselidiki', 'lainnya', 'Belum diketahui. VSD sudah beroperasi sejak 2022, Jan 2024, dan Agu 2025 sehingga bukan penyebab baru. Kemungkinan: perubahan pola operasi pompa atau intake, efek beban lebih penuh, atau alokasi air BTM pada pembagi. Intensitas kembali ke level baseline pada Agu–Okt 2026.', 'Bandingkan log operasi pompa (jam operasi, frekuensi VSD, tekanan header) Feb–Jul vs Agu–Okt 2026; cocokkan dengan meter air baku digital dan tagihan BTM bulanan.', 'Manajer Energi', '2026-11-30'),
  ('ENPI-05', 2026, 3, 'bulanan', 'hemat', -14.8, 'Diselidiki', 'lainnya', 'Belum diketahui. VSD sudah beroperasi sejak 2022, Jan 2024, dan Agu 2025 sehingga bukan penyebab baru. Kemungkinan: perubahan pola operasi pompa atau intake, efek beban lebih penuh, atau alokasi air BTM pada pembagi. Intensitas kembali ke level baseline pada Agu–Okt 2026.', 'Bandingkan log operasi pompa (jam operasi, frekuensi VSD, tekanan header) Feb–Jul vs Agu–Okt 2026; cocokkan dengan meter air baku digital dan tagihan BTM bulanan.', 'Manajer Energi', '2026-11-30'),
  ('ENPI-05', 2026, 4, 'bulanan', 'hemat', -13.4, 'Diselidiki', 'lainnya', 'Belum diketahui. VSD sudah beroperasi sejak 2022, Jan 2024, dan Agu 2025 sehingga bukan penyebab baru. Kemungkinan: perubahan pola operasi pompa atau intake, efek beban lebih penuh, atau alokasi air BTM pada pembagi. Intensitas kembali ke level baseline pada Agu–Okt 2026.', 'Bandingkan log operasi pompa (jam operasi, frekuensi VSD, tekanan header) Feb–Jul vs Agu–Okt 2026; cocokkan dengan meter air baku digital dan tagihan BTM bulanan.', 'Manajer Energi', '2026-11-30'),
  ('ENPI-05', 2026, 5, 'bulanan', 'hemat', -12.6, 'Diselidiki', 'lainnya', 'Belum diketahui. VSD sudah beroperasi sejak 2022, Jan 2024, dan Agu 2025 sehingga bukan penyebab baru. Kemungkinan: perubahan pola operasi pompa atau intake, efek beban lebih penuh, atau alokasi air BTM pada pembagi. Intensitas kembali ke level baseline pada Agu–Okt 2026.', 'Bandingkan log operasi pompa (jam operasi, frekuensi VSD, tekanan header) Feb–Jul vs Agu–Okt 2026; cocokkan dengan meter air baku digital dan tagihan BTM bulanan.', 'Manajer Energi', '2026-11-30'),
  ('ENPI-05', 2026, 6, 'bulanan', 'hemat', -13.1, 'Diselidiki', 'lainnya', 'Belum diketahui. VSD sudah beroperasi sejak 2022, Jan 2024, dan Agu 2025 sehingga bukan penyebab baru. Kemungkinan: perubahan pola operasi pompa atau intake, efek beban lebih penuh, atau alokasi air BTM pada pembagi. Intensitas kembali ke level baseline pada Agu–Okt 2026.', 'Bandingkan log operasi pompa (jam operasi, frekuensi VSD, tekanan header) Feb–Jul vs Agu–Okt 2026; cocokkan dengan meter air baku digital dan tagihan BTM bulanan.', 'Manajer Energi', '2026-11-30')
on conflict (enpi_kode, tahun, bulan, jenis) do nothing;

-- 4. Rencana aksi: penggantian 193 lampu SON-T ke LED (calon bukti peningkatan kinerja energi)
insert into rencana_aksi (kode, peluang_kode, uraian, pic, sumber_daya, mulai, tenggat, estimasi_hemat_kwh, metode_verifikasi, status, catatan) values
  ('RA-LED-PJU', 'P-02',
   'Ganti 193 lampu SON-T 250 W dengan LED 150 W pada ruas ROW 28, ROW 43B, ROW 62 Kelapa Sawit II Barat, Jalan Oleochemical, Biodiesel Timur, dan Surfaktan Barat.',
   'Manajer Energi', 'Pengadaan lampu LED 150 W (193 unit); tim Mekanikal & Elektrikal', '2026-11-16', '2026-12-05', 77500,
   'Pasang kWh meter pada panel PJU sebelum penggantian, catat minimal 2 minggu sebelum dan sesudah pada jam nyala yang sama; cadangan: daya terpasang × jam nyala dari log timer.',
   'Rencana',
   'Estimasi 193 × 100 W × 11 jam × 365 hari ≈ 77.500 kWh/tahun (≈ Rp87 juta). Calon bukti peningkatan kinerja energi untuk audit, karena VSD WTP 1 sudah menjadi bagian baseline.')
on conflict (kode) do nothing;
