-- Formulir SMEn diisi langsung di aplikasi.
-- Templat (struktur kolom, baris contoh) ada di kode: lib/formulir/templat/*.json, dibangun dari folder `formulir/`
-- oleh scripts/impor_formulir.py. Tabel ini hanya menyimpan isian per formulir.
--
-- Alur status: draf → diajukan → disetujui. Kembali ke draf untuk revisi.
--   * Semua peran penulis (admin, konsultan, tim_kinra) boleh membuat, mengubah draf, dan mengajukan.
--   * Hanya admin & konsultan yang boleh menyetujui atau membuka kembali isian yang sudah disetujui.
--   * Isian berstatus disetujui terkunci: isinya tidak dapat diubah sebelum dikembalikan ke draf.
--
-- Jalankan setelah 0006 (butuh peran_sesi() dan nama_sesi()). Aman diulang.

create table if not exists formulir_isian (
  id             uuid primary key default gen_random_uuid(),
  templat_kode   text not null check (templat_kode ~ '^[a-z0-9-]+$'),
  judul          text not null check (length(trim(judul)) > 0),
  varian         text,
  periode        text,
  isi            jsonb not null default '{}'::jsonb,
  status         text not null default 'draf' check (status in ('draf', 'diajukan', 'disetujui')),
  dibuat_oleh    text,
  dibuat_at      timestamptz not null default now(),
  diubah_oleh    text,
  diubah_at      timestamptz not null default now(),
  diajukan_oleh  text,
  diajukan_at    timestamptz,
  disetujui_oleh text,
  disetujui_at   timestamptz
);

create index if not exists formulir_isian_templat on formulir_isian (templat_kode, diubah_at desc);

create table if not exists formulir_riwayat (
  id        bigint generated always as identity primary key,
  isian_id  uuid not null references formulir_isian(id) on delete cascade,
  dari      text,
  ke        text not null,
  catatan   text,
  oleh      text,
  at        timestamptz not null default now()
);

create index if not exists formulir_riwayat_isian on formulir_riwayat (isian_id, at desc);

-- Isi kolom audit (siapa & kapan) dari sesi, dan jaga aturan persetujuan.
create or replace function formulir_isian_jaga() returns trigger
language plpgsql security definer set search_path = public as $$
-- Tanpa header request (SQL Editor / service) dianggap penyetuju, sama seperti trigger di 0006.
declare penyetuju boolean := nullif(current_setting('request.headers', true), '') is null
                             or coalesce(peran_sesi(), '') in ('admin', 'konsultan');
begin
  if tg_op = 'INSERT' then
    new.status := 'draf';
    new.dibuat_oleh := nama_sesi();
    new.dibuat_at := now();
    new.diubah_oleh := nama_sesi();
    new.diubah_at := now();
    new.diajukan_oleh := null; new.diajukan_at := null;
    new.disetujui_oleh := null; new.disetujui_at := null;
    return new;
  end if;

  -- kolom identitas tidak boleh diubah
  new.templat_kode := old.templat_kode;
  new.dibuat_oleh := old.dibuat_oleh;
  new.dibuat_at := old.dibuat_at;

  if old.status = 'disetujui' and new.status = 'disetujui'
     and (new.isi is distinct from old.isi or new.judul is distinct from old.judul
          or new.periode is distinct from old.periode or new.varian is distinct from old.varian) then
    raise exception 'Formulir sudah disetujui. Kembalikan ke draf untuk merevisi.' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if (new.status = 'disetujui' or old.status = 'disetujui') and not penyetuju then
      raise exception 'Hanya admin atau konsultan yang dapat menyetujui atau membuka kembali formulir.' using errcode = '42501';
    end if;
    if new.status = 'diajukan' then
      new.diajukan_oleh := nama_sesi(); new.diajukan_at := now();
    elsif new.status = 'disetujui' then
      new.disetujui_oleh := nama_sesi(); new.disetujui_at := now();
    else
      new.disetujui_oleh := null; new.disetujui_at := null;
    end if;
    insert into formulir_riwayat (isian_id, dari, ke, oleh) values (new.id, old.status, new.status, nama_sesi());
  else
    new.diajukan_oleh := old.diajukan_oleh; new.diajukan_at := old.diajukan_at;
    new.disetujui_oleh := old.disetujui_oleh; new.disetujui_at := old.disetujui_at;
  end if;

  new.diubah_oleh := nama_sesi();
  new.diubah_at := now();
  return new;
end $$;

drop trigger if exists formulir_isian_jaga on formulir_isian;
create trigger formulir_isian_jaga before insert or update on formulir_isian
  for each row execute function formulir_isian_jaga();

create or replace function formulir_isian_dibuat() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into formulir_riwayat (isian_id, dari, ke, oleh) values (new.id, null, 'draf', nama_sesi());
  return new;
end $$;

drop trigger if exists formulir_isian_dibuat on formulir_isian;
create trigger formulir_isian_dibuat after insert on formulir_isian
  for each row execute function formulir_isian_dibuat();

-- ---------------------------------------------------------------------------
-- RLS (sinkron dengan lib/akses.ts: formulir.isi, formulir.setujui, formulir.hapus)
-- ---------------------------------------------------------------------------

alter table formulir_isian enable row level security;
alter table formulir_riwayat enable row level security;

drop policy if exists baca on formulir_isian;
drop policy if exists tambah on formulir_isian;
drop policy if exists ubah on formulir_isian;
drop policy if exists hapus on formulir_isian;
create policy baca on formulir_isian for select to anon, authenticated using ((select peran_sesi()) is not null);
create policy tambah on formulir_isian for insert to anon, authenticated
  with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
create policy ubah on formulir_isian for update to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]))
  with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
create policy hapus on formulir_isian for delete to anon, authenticated
  using ((select peran_sesi()) = 'admin');

-- Riwayat hanya ditulis oleh trigger (security definer); pengguna hanya membaca.
drop policy if exists baca on formulir_riwayat;
create policy baca on formulir_riwayat for select to anon, authenticated using ((select peran_sesi()) is not null);

grant select, insert, update, delete on formulir_isian to anon, authenticated;
grant select on formulir_riwayat to anon, authenticated;
