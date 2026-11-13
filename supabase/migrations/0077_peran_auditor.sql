-- Peran baru: auditor (hanya lihat). Jalankan setelah 0042. Aman diulang.
--
-- Auditor hanya membuka menu Kesiapan Audit (termasuk detail dokumen & evidence) serta Komitmen & Kebijakan.
-- Pembatasan halaman dilakukan aplikasi (proxy.ts + lib/akses.ts HALAMAN_AUDITOR).
--
-- Tidak perlu policy baru untuk menolak penulisan: semua policy tulis mendaftar peran secara eksplisit
-- (admin, konsultan, tim_kinra), sehingga auditor otomatis ditolak, sama seperti pembaca (0008, 0042).
-- Berbeda dengan pembaca, akun auditor bersifat pribadi: boleh mengganti sandinya sendiri
-- dan wajib ganti sandi saat login pertama.

alter table pengguna drop constraint if exists pengguna_peran_check;
alter table pengguna add constraint pengguna_peran_check
  check (peran in ('admin', 'konsultan', 'tim_kinra', 'pembaca', 'auditor'));
