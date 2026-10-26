-- Kinerja energi (ISO 50001 klausul 6.2, 6.4, 6.5; ISO 50006):
--   variabel relevan + data bulanannya, definisi EnPI & baseline energi (EnB),
--   sasaran & target energi, dan rencana aksi beserta verifikasi penghematan.
--
-- Jalankan setelah 0006 (butuh peran_sesi()). Aman diulang.

-- ---------------------------------------------------------------------------
-- Variabel relevan: faktor terukur yang memengaruhi konsumsi energi
-- (mis. jumlah tenant beroperasi, volume air olahan, jam operasi).
-- ---------------------------------------------------------------------------

create table if not exists variabel_relevan (
  kode        text primary key check (kode ~ '^[a-z0-9_]+$'),
  nama        text not null,
  satuan      text not null,
  keterangan  text,
  urutan      int  not null default 0
);

create table if not exists variabel_bulanan (
  tahun          int  not null check (tahun between 2020 and 2035),
  bulan          int  not null check (bulan between 1 and 12),
  variabel_kode  text not null references variabel_relevan(kode) on delete cascade on update cascade,
  nilai          numeric not null,
  diubah_at      timestamptz not null default now(),
  primary key (tahun, bulan, variabel_kode)
);

-- ---------------------------------------------------------------------------
-- EnPI & EnB. Metode:
--   absolut  konsumsi dibanding bulan yang sama pada periode baseline
--   rasio    konsumsi / variabel (intensitas), dinormalisasi dengan rasio baseline
--   regresi  model linier konsumsi = b0 + Σ bi·variabel_i dari periode baseline
-- sumber_kode = sumber energi yang masuk ruang lingkup EnPI (lihat tabel sumber_energi).
-- ---------------------------------------------------------------------------

create table if not exists enpi (
  kode              text primary key check (kode ~ '^[A-Z0-9-]+$'),
  nama              text not null,
  sumber_kode       text[] not null check (cardinality(sumber_kode) > 0),
  metode            text not null check (metode in ('absolut', 'rasio', 'regresi')),
  variabel_kode     text[] not null default '{}',
  baseline_mulai    date not null,
  baseline_selesai  date not null,
  alasan_baseline   text,
  catatan           text,
  aktif             boolean not null default true,
  urutan            int not null default 0,
  diubah_at         timestamptz not null default now(),
  check (baseline_selesai >= baseline_mulai),
  check (metode = 'absolut' or cardinality(variabel_kode) > 0),
  check (metode <> 'rasio' or cardinality(variabel_kode) = 1)
);

-- ---------------------------------------------------------------------------
-- Sasaran & target energi, rencana aksi (6.2)
-- ---------------------------------------------------------------------------

create table if not exists sasaran (
  id             bigint generated always as identity primary key,
  kode           text unique not null,                -- 'S-01'
  uraian         text not null,
  enpi_kode      text references enpi(kode) on delete set null on update cascade,
  target_persen  numeric check (target_persen between 0 and 100),   -- target perbaikan EnPI vs baseline
  tahun_target   int check (tahun_target between 2024 and 2035),
  pic            text,
  status         text not null default 'Aktif' check (status in ('Draft', 'Aktif', 'Tercapai', 'Tidak tercapai')),
  catatan        text,
  diubah_at      timestamptz not null default now()
);

create table if not exists rencana_aksi (
  id                       bigint generated always as identity primary key,
  kode                     text unique not null,      -- 'RA-01'
  sasaran_id               bigint references sasaran(id) on delete set null,
  peluang_kode             text references peluang(kode) on delete set null on update cascade,
  uraian                   text not null,
  pic                      text,
  sumber_daya              text,
  mulai                    date,
  tenggat                  date,
  estimasi_hemat_kwh       numeric check (estimasi_hemat_kwh >= 0),
  metode_verifikasi        text,
  status                   text not null default 'Rencana' check (status in ('Rencana', 'Berjalan', 'Selesai', 'Ditunda', 'Batal')),
  hemat_terverifikasi_kwh  numeric,
  tanggal_verifikasi       date,
  catatan                  text,
  diubah_at                timestamptz not null default now()
);

create index if not exists rencana_aksi_sasaran_idx on rencana_aksi (sasaran_id);

-- ---------------------------------------------------------------------------
-- RLS (sinkron dengan lib/akses.ts)
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['variabel_relevan', 'variabel_bulanan', 'enpi', 'sasaran', 'rencana_aksi'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists baca on %I', t);
    execute format('create policy baca on %I for select to anon, authenticated using ((select peran_sesi()) is not null)', t);
  end loop;
end $$;

create or replace function pasang_policy(t text, op text, peran text[]) returns void
language plpgsql as $$
declare nama text := case op when 'insert' then 'tambah' when 'update' then 'ubah' else 'hapus' end;
        syarat text := format('(select peran_sesi()) = any (%L::text[])', peran);
begin
  execute format('drop policy if exists %I on %I', nama, t);
  if op = 'insert' then
    execute format('create policy %I on %I for insert to anon, authenticated with check (%s)', nama, t, syarat);
  elsif op = 'update' then
    execute format('create policy %I on %I for update to anon, authenticated using (%s) with check (%s)', nama, t, syarat, syarat);
  else
    execute format('create policy %I on %I for delete to anon, authenticated using (%s)', nama, t, syarat);
  end if;
end $$;

-- definisi variabel & EnPI: admin, konsultan
select pasang_policy('variabel_relevan', 'insert', '{admin,konsultan}'), pasang_policy('variabel_relevan', 'update', '{admin,konsultan}'), pasang_policy('variabel_relevan', 'delete', '{admin}');
select pasang_policy('enpi', 'insert', '{admin,konsultan}'), pasang_policy('enpi', 'update', '{admin,konsultan}'), pasang_policy('enpi', 'delete', '{admin}');
-- data bulanan variabel: sama dengan data energi
select pasang_policy('variabel_bulanan', 'insert', '{admin,tim_kinra}'), pasang_policy('variabel_bulanan', 'update', '{admin,tim_kinra}'), pasang_policy('variabel_bulanan', 'delete', '{admin,tim_kinra}');
-- sasaran: admin, konsultan; rencana aksi: semua peran
select pasang_policy('sasaran', 'insert', '{admin,konsultan}'), pasang_policy('sasaran', 'update', '{admin,konsultan}'), pasang_policy('sasaran', 'delete', '{admin}');
select pasang_policy('rencana_aksi', 'insert', '{admin,konsultan,tim_kinra}'), pasang_policy('rencana_aksi', 'update', '{admin,konsultan,tim_kinra}'), pasang_policy('rencana_aksi', 'delete', '{admin}');

drop function pasang_policy(text, text, text[]);

-- ---------------------------------------------------------------------------
-- Data awal. Tidak menimpa baris yang sudah diubah dari aplikasi.
-- Variabel di bawah adalah USULAN; ganti/hapus sesuai data yang benar-benar tersedia.
-- ---------------------------------------------------------------------------

insert into variabel_relevan (kode, nama, satuan, keterangan, urutan) values
  ('tenant', 'Tenant beroperasi', 'unit', 'Jumlah tenant yang beroperasi pada bulan tersebut (usulan, sesuaikan)', 1),
  ('air_olahan', 'Air olahan WTP', 'm³', 'Volume air bersih yang diproduksi WTP kawasan (usulan, sesuaikan)', 2)
on conflict (kode) do nothing;

-- EnPI awal tanpa variabel: langsung terisi dari data energi yang sudah ada. Baseline 2025.
insert into enpi (kode, nama, sumber_kode, metode, variabel_kode, baseline_mulai, baseline_selesai, alasan_baseline, urutan) values
  ('ENPI-01', 'Total konsumsi energi kawasan', '{pln,pltbg,plts,dexlite}', 'absolut', '{}', '2025-01-01', '2025-12-01',
   'Tahun penuh pertama dengan data lengkap semua sumber (termasuk BBM). Ganti ke metode regresi setelah data variabel relevan tersedia.', 1),
  ('ENPI-02', 'Konsumsi listrik kawasan', '{pln,pltbg,plts}', 'absolut', '{}', '2025-01-01', '2025-12-01',
   'Tahun penuh terakhir sebelum penerapan SMEn.', 2)
on conflict (kode) do nothing;
