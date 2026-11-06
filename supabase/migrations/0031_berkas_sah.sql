-- Penanda "versi sah" per berkas evidence.
--
-- Satu item kesiapan bisa berisi beberapa berkas (draf Word, PDF bertanda tangan, lampiran, foto).
-- Berkas bertanda sah adalah versi yang ditunjukkan ke auditor. Item hanya dapat berstatus Final bila
-- punya minimal satu berkas sah (diperiksa aplikasi), dan skor "siap audit" = Final + berkas sah.
--
-- Hak ubah penanda mengikuti policy update tabel berkas (migrasi 0010): admin, konsultan, Tim KINRA.
-- Jalankan setelah 0010. Aman diulang.

alter table berkas add column if not exists sah boolean not null default false;
alter table berkas add column if not exists sah_oleh text;
alter table berkas add column if not exists sah_at timestamptz;

create index if not exists berkas_sah_idx on berkas (dokumen_id) where sah;

-- Pencatat penandaan diisi dari sesi
create or replace function cap_berkas_sah() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.sah is distinct from old.sah then
    new.sah_oleh := case when new.sah then nama_sesi() else null end;
    new.sah_at := case when new.sah then now() else null end;
  end if;
  return new;
end $$;

drop trigger if exists cap_berkas_sah on berkas;
create trigger cap_berkas_sah before update on berkas
  for each row execute function cap_berkas_sah();

-- Migrasi 0010 tidak memberi hak update pada berkas. Izinkan hanya kolom penanda sah.
grant update (sah) on berkas to anon, authenticated;
drop policy if exists ubah on berkas;
create policy ubah on berkas for update to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]))
  with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
