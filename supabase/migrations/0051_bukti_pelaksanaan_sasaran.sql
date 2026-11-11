-- Bukti pelaksanaan sasaran dan rencana aksi (klausul 6.2, 9.1).
--
-- Berkas bukti memakai tabel `berkas` dan bucket privat `smen-evidence` yang sama dengan evidence dokumen (migrasi 0010),
-- dengan path berawalan 'pelaksanaan/'. Satu berkas terikat ke satu sasaran ATAU satu rencana aksi, beserta periode
-- pencapaiannya (bulan, 'YYYY-MM').
--
-- Hak akses (dikunci di database, bukan hanya di aplikasi):
--   * unggah bukti pelaksanaan : admin dan tim_kinra (konsultan dan pembaca tidak)
--   * hapus bukti pelaksanaan  : admin saja
--   * evidence dokumen (Kesiapan Audit) tidak berubah: admin, konsultan, tim_kinra
-- Sasaran hanya dapat berstatus 'Tercapai' bila sudah punya minimal satu bukti pelaksanaan.
-- Jalankan setelah 0050. Aman diulang.

alter table berkas add column if not exists sasaran_id bigint references sasaran(id) on delete set null;
alter table berkas add column if not exists aksi_id bigint references rencana_aksi(id) on delete set null;
alter table berkas add column if not exists periode text check (periode is null or periode ~ '^\d{4}-(0[1-9]|1[0-2])$');
create index if not exists berkas_sasaran_idx on berkas (sasaran_id) where sasaran_id is not null;
create index if not exists berkas_aksi_idx on berkas (aksi_id) where aksi_id is not null;

-- Satu berkas hanya untuk satu pemilik
alter table berkas drop constraint if exists berkas_satu_pemilik;
alter table berkas add constraint berkas_satu_pemilik
  check (num_nonnulls(dokumen_id, sasaran_id, aksi_id) <= 1);

-- ---------------------------------------------------------------------------
-- RLS tabel berkas
-- ---------------------------------------------------------------------------
drop policy if exists tambah on berkas;
create policy tambah on berkas for insert to anon, authenticated
  with check (
    case when sasaran_id is not null or aksi_id is not null
      then (select peran_sesi()) = any ('{admin,tim_kinra}'::text[])
      else (select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[])
    end);

drop policy if exists hapus on berkas;
create policy hapus on berkas for delete to anon, authenticated
  using (
    case when sasaran_id is not null or aksi_id is not null
      then (select peran_sesi()) = 'admin'
      else (select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[])
    end);

drop policy if exists ubah on berkas;
create policy ubah on berkas for update to anon, authenticated
  using (
    case when sasaran_id is not null or aksi_id is not null
      then (select peran_sesi()) = any ('{admin,tim_kinra}'::text[])
      else (select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[])
    end)
  with check (
    case when sasaran_id is not null or aksi_id is not null
      then (select peran_sesi()) = any ('{admin,tim_kinra}'::text[])
      else (select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[])
    end);

-- ---------------------------------------------------------------------------
-- RLS Storage: objek berawalan 'pelaksanaan/' mengikuti aturan yang sama
-- ---------------------------------------------------------------------------
drop policy if exists evidence_unggah on storage.objects;
create policy evidence_unggah on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'smen-evidence' and (
    case when name like 'pelaksanaan/%'
      then (select peran_sesi()) = any ('{admin,tim_kinra}'::text[])
      else (select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[])
    end));

drop policy if exists evidence_hapus on storage.objects;
create policy evidence_hapus on storage.objects for delete to anon, authenticated
  using (bucket_id = 'smen-evidence' and (
    case when name like 'pelaksanaan/%'
      then (select peran_sesi()) = 'admin'
      else (select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[])
    end));

-- ---------------------------------------------------------------------------
-- Status 'Tercapai' wajib berbukti
-- ---------------------------------------------------------------------------
create or replace function sasaran_tercapai_berbukti() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'Tercapai'
     and (tg_op = 'INSERT' or old.status is distinct from 'Tercapai')
     and not exists (select 1 from berkas b where b.sasaran_id = new.id) then
    raise exception 'Unggah minimal satu bukti pelaksanaan sebelum menandai sasaran % Tercapai', new.kode using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists sasaran_tercapai_berbukti on sasaran;
create trigger sasaran_tercapai_berbukti before insert or update of status on sasaran
  for each row execute function sasaran_tercapai_berbukti();
