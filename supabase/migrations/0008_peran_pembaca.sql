-- Peran baru: pembaca (hanya lihat). Jalankan setelah 0006. Aman diulang.
--
-- Tidak perlu policy baru: policy `baca` mengizinkan semua peran yang login,
-- sedangkan semua policy tulis mendaftar peran secara eksplisit sehingga pembaca otomatis ditolak.
-- Pembaca tetap bisa mengganti sandinya sendiri (lewat fungsi ganti_sandi).

alter table pengguna drop constraint if exists pengguna_peran_check;
alter table pengguna add constraint pengguna_peran_check check (peran in ('admin', 'konsultan', 'tim_kinra', 'pembaca'));
