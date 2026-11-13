-- Konsistensi data setelah audit antarhalaman (13 Nov 2026):
--   1) ENPI-04: catatan dan alasan baseline masih menyebut 7 meter (KINRA-MTR-001 s.d. 007).
--      Sejak 0039 dan 0063 cakupannya 9 meter (s.d. KINRA-MTR-009, termasuk intake dan Tank Farm).
--   2) Pompa intake WTP I (PMP-IPAB-04) diganti dari 110 kW ke 37 kW pada Okt 2026
--      (komentar sel Pelacak Konsumsi Energi, Konsumsi Energi N56). Register pompa dan catatan bacaan
--      intake Okt 2026 (62.088 kWh) belum mencatatnya.
-- Jalankan setelah 0067. Aman diulang.

-- 1. ENPI-04
update enpi set
  alasan_baseline = 'Tahun penuh terakhir dengan kWh tagihan lengkap untuk kesembilan meter aset KINRA (KINRA-MTR-001 s.d. 009, sheet Konsumsi Energi). Kenaikan konsumsi WTP sepanjang 2025 dan Bea Cukai 2 (beroperasi Nov 2025) dicatat sebagai kondisi baseline.',
  catatan = 'Jumlah konsumsi semua meter aset KINRA (KINRA-MTR-001 s.d. 009). Penyesuaian batas: meter intake KINRA-MTR-008 (0039) dan Tank Farm KINRA-MTR-009 (12 Nov 2026) ditambahkan; data keduanya tersedia sejak Jan 2024 sehingga baseline dan pelaporan memakai cakupan yang sama. Bila meter bertambah lagi, tambahkan ke daftar meter dan catat sebagai penyesuaian baseline (6.5).',
  diubah_at = now()
where kode = 'ENPI-04';

-- 2. Pompa intake
update pompa set
  daya_kw = 37,
  catatan = concat_ws(' ', nullif(catatan, ''),
    'Diganti pada Okt 2026 dari pompa 110 kW ke 37 kW (komentar sel Pelacak Konsumsi Energi). Daya di register adalah pompa yang terpasang sekarang, jadi estimasi beban untuk bulan sebelum Okt 2026 lebih rendah dari kondisi sebenarnya.'),
  diubah_at = now()
where kode = 'PMP-IPAB-04' and coalesce(catatan, '') not like '%110 kW ke 37 kW%';

update pembacaan_meter set
  catatan = 'Pelacak Konsumsi Energi versi 12 Nov 2026 (sebelumnya 37.633,8). Bulan penggantian pompa intake 110 kW ke 37 kW; bandingkan bulan-bulan sesudahnya untuk memverifikasi penghematan.'
where meter_kode = 'KINRA-MTR-008' and tahun = 2026 and bulan = 10;
