-- Penyesuaian jadwal audit internal dan tinjauan manajemen.
--   * Internal Audit (kegiatan no 10, tonggak 'ia') hanya sampai 13 Nov 2026: sesi 5, 6, 12, 13 Nov (13 - 16).
--     Sesi 19, 20, dan 24 Nov dihapus.
--   * Tinjauan Manajemen (kegiatan no 11, tonggak 'tm') dimajukan dari 24 Nov 2026 ke 17 Nov 2026, jam tetap 15 - 16.
--   * Tenggat rekaman R-9.2-02 (laporan audit internal) menjadi 13 Nov dan R-9.3-01 (notulen RTM) menjadi 17 Nov,
--     hanya bila masih memakai tanggal lama.
-- Jalankan setelah 0051. Aman diulang.

update kegiatan
set sesi = '[{"tanggal": "2026-11-05", "jam": "13 - 16"}, {"tanggal": "2026-11-06", "jam": "13 - 16"}, {"tanggal": "2026-11-12", "jam": "13 - 16"}, {"tanggal": "2026-11-13", "jam": "13 - 16"}]'::jsonb
where no = 10;

update kegiatan
set sesi = '[{"tanggal": "2026-11-17", "jam": "15 - 16"}]'::jsonb
where no = 11;

update dokumen_audit
set tenggat = '2026-11-13'::date
where kode = 'R-9.2-02' and tenggat = '2026-11-24'::date;

update dokumen_audit
set tenggat = '2026-11-17'::date
where kode = 'R-9.3-01' and tenggat = '2026-11-24'::date;
