-- Potret harian skor kesiapan, dicatat otomatis saat laporan kesiapan dibuka (satu baris per hari, diperbarui).
-- Dipakai laporan untuk menunjukkan pergerakan sejak potret sebelumnya.
--
-- Hak akses: baca semua peran; tambah/ubah admin, konsultan, Tim KINRA; hapus admin.
-- Jalankan setelah 0006. Aman diulang.

create table if not exists potret_kesiapan (
  tanggal        date primary key,
  skor           numeric not null,   -- siap audit (Final + berkas sah), %
  kemajuan       numeric not null,   -- ada evidence, %
  n_siap         int not null,
  n_bukti        int not null,
  jumlah         int not null,
  gerbang_lulus  int not null,
  gerbang_total  int not null,
  diubah_at      timestamptz not null default now()
);

alter table potret_kesiapan enable row level security;
drop policy if exists baca on potret_kesiapan;
create policy baca on potret_kesiapan for select to anon, authenticated using ((select peran_sesi()) is not null);
drop policy if exists tambah on potret_kesiapan;
create policy tambah on potret_kesiapan for insert to anon, authenticated with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
drop policy if exists ubah on potret_kesiapan;
create policy ubah on potret_kesiapan for update to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[])) with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
drop policy if exists hapus on potret_kesiapan;
create policy hapus on potret_kesiapan for delete to anon, authenticated using ((select peran_sesi()) = 'admin');
