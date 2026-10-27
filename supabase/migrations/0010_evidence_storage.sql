-- Evidence diunggah langsung ke aplikasi (Supabase Storage) agar bisa dilihat tanpa membuka OneDrive.
-- Tautan OneDrive dihapus dari aplikasi; kolom `dokumen_audit.link_eksternal` dibiarkan (tidak dipakai) agar data lama tidak hilang.
-- Bucket PRIVAT: berkas hanya bisa dibuka lewat signed URL yang dibuat server untuk pengguna yang login.
-- Jalankan setelah 0006. Aman diulang. Sinkron dengan lib/akses.ts ('dokumen.ubah').

-- ---------------------------------------------------------------------------
-- Tabel metadata berkas (bisa sudah ada dari 0001 bila 0004 tidak dijalankan)
-- ---------------------------------------------------------------------------

create table if not exists berkas (
  id           uuid primary key default gen_random_uuid(),
  dokumen_id   uuid references dokumen_audit(id) on delete set null,
  path         text unique not null,           -- key objek di bucket: <dokumen_id>/<uuid>-<nama>
  nama_file    text not null,
  folder       text not null default 'Unggahan',
  mime         text,
  ukuran       bigint,
  diunggah_at  timestamptz not null default now()
);
alter table berkas add column if not exists diunggah_oleh text;
create index if not exists berkas_dokumen_idx on berkas (dokumen_id);

alter table berkas enable row level security;
drop policy if exists akses_terbuka on berkas;
drop policy if exists baca on berkas;
create policy baca on berkas for select to anon, authenticated using ((select peran_sesi()) is not null);
drop policy if exists tambah on berkas;
create policy tambah on berkas for insert to anon, authenticated
  with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
drop policy if exists hapus on berkas;
create policy hapus on berkas for delete to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
drop policy if exists ubah on berkas;
grant select, insert, delete on berkas to anon, authenticated;

-- Nama pengunggah diisi otomatis dari sesi
create or replace function isi_pengunggah() returns trigger
language plpgsql set search_path = public as $$
begin
  new.diunggah_oleh := coalesce(nama_sesi(), new.diunggah_oleh);
  return new;
end $$;
drop trigger if exists berkas_pengunggah on berkas;
create trigger berkas_pengunggah before insert on berkas
  for each row execute function isi_pengunggah();

-- ---------------------------------------------------------------------------
-- Bucket privat, 50 MB per berkas
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('smen-evidence', 'smen-evidence', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- Storage meneruskan header request ke Postgres, jadi peran_sesi() membaca token `x-sesi` yang sama.
drop policy if exists evidence_baca on storage.objects;
create policy evidence_baca on storage.objects for select to anon, authenticated
  using (bucket_id = 'smen-evidence' and (select peran_sesi()) is not null);

drop policy if exists evidence_unggah on storage.objects;
create policy evidence_unggah on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'smen-evidence' and (select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));

drop policy if exists evidence_hapus on storage.objects;
create policy evidence_hapus on storage.objects for delete to anon, authenticated
  using (bucket_id = 'smen-evidence' and (select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
