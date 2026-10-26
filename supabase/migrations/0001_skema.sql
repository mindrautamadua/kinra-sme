-- Dashboard Sistem Manajemen Energi (SMEn) PT KINRA
-- Skema inti: klausul ISO 50001, monitoring kesiapan dokumen audit, berkas (Storage),
-- data energi bulanan, timeline pendampingan, register isu/peluang, temuan audit.
--
-- Jalankan di Supabase SQL Editor (sekali). Aman diulang: memakai IF NOT EXISTS / OR REPLACE.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Referensi
-- ---------------------------------------------------------------------------

create table if not exists klausul (
  kode      text primary key,          -- '4.1', '9.2', 'P' (persiapan awal)
  induk     text not null,             -- '4' … '10', 'P'
  judul     text not null,
  urutan    int  not null
);

create table if not exists sumber_energi (
  kode       text primary key,         -- 'pln', 'pltbg', 'plts', 'dexlite'
  nama       text not null,
  satuan     text not null,            -- 'kWh', 'liter'
  faktor_tj  numeric not null,         -- konversi 1 satuan -> Terajoule
  terbarukan boolean not null default false,
  urutan     int not null,
  catatan    text
);

-- ---------------------------------------------------------------------------
-- Monitoring kesiapan audit
-- ---------------------------------------------------------------------------

do $$ begin
  create type status_dokumen as enum ('belum', 'draft', 'review', 'disetujui', 'final');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kelompok_dokumen as enum ('persiapan', 'manual', 'sop', 'formulir', 'rekaman');
exception when duplicate_object then null; end $$;

create table if not exists dokumen_audit (
  id              uuid primary key default gen_random_uuid(),
  kode            text unique not null,
  kelompok        kelompok_dokumen not null,
  klausul_kode    text not null references klausul(kode),
  nama            text not null,
  nomor_dokumen   text,
  pic             text,
  status          status_dokumen not null default 'belum',
  tenggat         date,
  tanggal_terima  date,
  link_eksternal  text,
  keterangan      text,
  sumber_files    text[] not null default '{}',   -- path relatif di folder sumber-data (untuk pemetaan unggahan awal)
  dibuat_at       timestamptz not null default now(),
  diubah_at       timestamptz not null default now()
);
create index if not exists dokumen_audit_klausul_idx on dokumen_audit (klausul_kode);
create index if not exists dokumen_audit_status_idx on dokumen_audit (status);

create table if not exists riwayat_status (
  id           bigint generated always as identity primary key,
  dokumen_id   uuid not null references dokumen_audit(id) on delete cascade,
  dari         status_dokumen,
  ke           status_dokumen not null,
  catatan      text,
  at           timestamptz not null default now()
);
create index if not exists riwayat_status_dokumen_idx on riwayat_status (dokumen_id, at desc);

create or replace function catat_perubahan_status() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into riwayat_status (dokumen_id, dari, ke)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status);
  end if;
  return new;
end $$;

drop trigger if exists dokumen_audit_status_trg on dokumen_audit;
create trigger dokumen_audit_status_trg
  after insert or update on dokumen_audit
  for each row execute function catat_perubahan_status();

-- after-trigger tidak bisa mengubah NEW; diubah_at diisi trigger before terpisah
create or replace function sentuh_diubah_at() returns trigger
language plpgsql set search_path = public as $$
begin new.diubah_at := now(); return new; end $$;

drop trigger if exists dokumen_audit_sentuh_trg on dokumen_audit;
create trigger dokumen_audit_sentuh_trg
  before update on dokumen_audit
  for each row execute function sentuh_diubah_at();

-- Berkas di Supabase Storage (bucket 'smen-dokumen')
create table if not exists berkas (
  id           uuid primary key default gen_random_uuid(),
  dokumen_id   uuid references dokumen_audit(id) on delete set null,
  path         text unique not null,           -- key objek di bucket
  nama_file    text not null,
  folder       text not null default 'Unggahan',
  mime         text,
  ukuran       bigint,
  sumber_path  text unique,                    -- path asli di sumber-data (unggahan awal)
  diunggah_at  timestamptz not null default now()
);
create index if not exists berkas_dokumen_idx on berkas (dokumen_id);
create index if not exists berkas_folder_idx on berkas (folder);

-- ---------------------------------------------------------------------------
-- Data energi
-- ---------------------------------------------------------------------------

create table if not exists energi_bulanan (
  tahun        int  not null check (tahun between 2020 and 2035),
  bulan        int  not null check (bulan between 1 and 12),
  sumber_kode  text not null references sumber_energi(kode),
  nilai        numeric not null check (nilai >= 0),
  catatan      text,
  diubah_at    timestamptz not null default now(),
  primary key (tahun, bulan, sumber_kode)
);

-- ---------------------------------------------------------------------------
-- Timeline pendampingan
-- ---------------------------------------------------------------------------

create table if not exists kegiatan (
  no           int primary key,
  nama         text not null,
  fasilitator  text,
  metode       text,
  peserta      text,
  sesi         jsonb not null default '[]'   -- [{ "tanggal": "2026-10-20", "jam": "10 - 11" }]
);

-- ---------------------------------------------------------------------------
-- Register isu internal/eksternal (Formulir 4.1) & peluang peningkatan (6.1)
-- ---------------------------------------------------------------------------

create table if not exists isu (
  id           bigint generated always as identity primary key,
  asal         text not null check (asal in ('Internal', 'Eksternal')),
  jenis        text not null check (jenis in ('Risiko', 'Peluang')),
  uraian       text not null,
  dampak       int  not null check (dampak between 1 and 5),
  kemungkinan  int  not null check (kemungkinan between 1 and 5),
  skor         int  generated always as (dampak * kemungkinan) stored,
  tindakan     text,
  evaluasi     text,
  pic          text,
  diubah_at    timestamptz not null default now()
);

create table if not exists peluang (
  kode          text primary key,             -- 'P-01'
  uraian        text not null,
  variabel      text,
  metode        text,
  pemilik       text,
  skor_energi   int check (skor_energi between 1 and 5),
  skor_roi      int check (skor_roi between 1 and 5),
  prioritas     numeric generated always as ((skor_energi + skor_roi) / 2.0) stored,
  estimasi_kwh  numeric,
  status        text not null default 'Belum dinilai',
  diubah_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit: temuan & tindakan perbaikan
-- ---------------------------------------------------------------------------

create table if not exists temuan (
  id             uuid primary key default gen_random_uuid(),
  nomor          text unique not null,                       -- 'AI-001'
  jenis_audit    text not null check (jenis_audit in ('Internal', 'TÜV Stage 1', 'TÜV Stage 2')),
  tanggal        date not null default current_date,
  klausul_kode   text references klausul(kode),
  kategori       text not null check (kategori in ('Mayor', 'Minor', 'Observasi', 'OFI')),
  uraian         text not null,
  bukti          text,
  auditor        text,
  auditee        text,
  akar_masalah   text,
  tindakan       text,
  pic            text,
  tenggat        date,
  status         text not null default 'Terbuka' check (status in ('Terbuka', 'Proses', 'Verifikasi', 'Tertutup')),
  dokumen_id     uuid references dokumen_audit(id) on delete set null,
  dibuat_at      timestamptz not null default now(),
  diubah_at      timestamptz not null default now()
);
create index if not exists temuan_status_idx on temuan (status);

-- ---------------------------------------------------------------------------
-- View ringkasan kesiapan per klausul
-- ---------------------------------------------------------------------------

create or replace view kesiapan_klausul with (security_invoker = true) as
select
  k.kode, k.induk, k.judul, k.urutan,
  count(d.id)                                              as jumlah,
  count(d.id) filter (where d.status = 'final')            as final,
  count(d.id) filter (where d.status = 'disetujui')        as disetujui,
  count(d.id) filter (where d.status = 'review')           as review,
  count(d.id) filter (where d.status = 'draft')            as draft,
  count(d.id) filter (where d.status = 'belum')            as belum,
  count(d.id) filter (where d.tenggat < current_date and d.status not in ('final', 'disetujui')) as terlambat
from klausul k
left join dokumen_audit d on d.klausul_kode = k.kode
group by k.kode, k.induk, k.judul, k.urutan;

-- ---------------------------------------------------------------------------
-- Akses: aplikasi berjalan TANPA login (sesuai keputusan awal).
-- Peran anon boleh membaca & menulis semua tabel aplikasi.
-- Ganti kebijakan ini dengan 'authenticated' saat login diaktifkan.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['klausul','sumber_energi','dokumen_audit','riwayat_status','berkas',
                           'energi_bulanan','kegiatan','isu','peluang','temuan'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists akses_terbuka on %I', t);
    execute format('create policy akses_terbuka on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

grant select on kesiapan_klausul to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket publik agar berkas tampil cepat lewat CDN (URL publik, cache panjang).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('smen-dokumen', 'smen-dokumen', true, 209715200)   -- 200 MB per berkas
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists smen_baca on storage.objects;
create policy smen_baca on storage.objects for select to anon, authenticated
  using (bucket_id = 'smen-dokumen');

drop policy if exists smen_unggah on storage.objects;
create policy smen_unggah on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'smen-dokumen');

drop policy if exists smen_ubah on storage.objects;
create policy smen_ubah on storage.objects for update to anon, authenticated
  using (bucket_id = 'smen-dokumen') with check (bucket_id = 'smen-dokumen');

drop policy if exists smen_hapus on storage.objects;
create policy smen_hapus on storage.objects for delete to anon, authenticated
  using (bucket_id = 'smen-dokumen');
