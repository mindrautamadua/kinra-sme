-- Register deviasi signifikan kinerja energi (ISO 50001 klausul 9.1.1: deviasi signifikan
-- kinerja energi harus diselidiki dan ditanggapi).
--
-- Deteksi dihitung di aplikasi dari model EnPI lingkup KINRA (lib/deviasi.ts). Baris di tabel ini
-- baru dibuat saat seseorang mulai menyelidiki, sehingga membuka halaman tidak menulis data.
--
-- Hak akses (sinkron lib/akses.ts): baca semua peran; selidiki & tanggapi admin, konsultan, Tim KINRA;
-- status Ditutup / Bukan deviasi hanya admin & konsultan (verifikasi, lewat trigger); hapus admin.
--
-- Jalankan setelah 0026. Aman diulang.

create table if not exists deviasi (
  id                bigint generated always as identity primary key,
  enpi_kode         text not null references enpi(kode) on delete cascade on update cascade,
  tahun             int not null check (tahun between 2020 and 2040),
  bulan             int not null check (bulan between 1 and 12),
  jenis             text not null check (jenis in ('bulanan', 'tren', 'data')),
  arah              text not null check (arah in ('boros', 'hemat', 'data')),
  aktual            numeric,
  harapan           numeric,
  selisih_persen    numeric,
  status            text not null default 'Diselidiki' check (status in ('Diselidiki', 'Ditanggapi', 'Ditutup', 'Bukan deviasi')),
  kategori          text check (kategori in ('operasi', 'kerusakan', 'data', 'variabel', 'aksi', 'lainnya')),
  penyebab          text,
  tindakan          text,
  pic               text,
  tenggat           date,
  aksi_kode         text,
  dibuka_oleh       text,
  diverifikasi_oleh text,
  diverifikasi_at   timestamptz,
  dibuat_at         timestamptz not null default now(),
  diubah_at         timestamptz not null default now(),
  unique (enpi_kode, tahun, bulan, jenis)
);

create or replace function cek_status_deviasi() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.dibuka_oleh := coalesce(nama_sesi(), new.dibuka_oleh);
  end if;
  if (tg_op = 'INSERT' and new.status in ('Ditutup', 'Bukan deviasi'))
     or (tg_op = 'UPDATE' and new.status is distinct from old.status and (new.status in ('Ditutup', 'Bukan deviasi') or old.status in ('Ditutup', 'Bukan deviasi'))) then
    if nullif(current_setting('request.headers', true), '') is not null
       and coalesce(peran_sesi(), '') not in ('admin', 'konsultan') then
      raise exception 'Hanya admin atau konsultan yang dapat menutup atau membuka kembali deviasi' using errcode = '42501';
    end if;
    if new.status in ('Ditutup', 'Bukan deviasi') then
      new.diverifikasi_oleh := coalesce(nama_sesi(), new.diverifikasi_oleh);
      new.diverifikasi_at := now();
    else
      new.diverifikasi_oleh := null;
      new.diverifikasi_at := null;
    end if;
  end if;
  new.diubah_at := now();
  return new;
end $$;

drop trigger if exists cek_status_deviasi on deviasi;
create trigger cek_status_deviasi before insert or update on deviasi
  for each row execute function cek_status_deviasi();

alter table deviasi enable row level security;
drop policy if exists baca on deviasi;
create policy baca on deviasi for select to anon, authenticated using ((select peran_sesi()) is not null);
drop policy if exists tambah on deviasi;
create policy tambah on deviasi for insert to anon, authenticated with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
drop policy if exists ubah on deviasi;
create policy ubah on deviasi for update to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]))
  with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
drop policy if exists hapus on deviasi;
create policy hapus on deviasi for delete to anon, authenticated using ((select peran_sesi()) = 'admin');
