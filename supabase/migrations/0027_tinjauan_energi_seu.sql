-- Tinjauan energi & register SEU (ISO 50001 klausul 6.3).
--
-- tinjauan_energi : catatan tinjauan berkala beserta kriteria SEU yang dipakai (ambang porsi & kumulatif).
-- seu             : register penggunaan energi signifikan, terhubung ke aset, meter, sumber energi, variabel, dan EnPI.
--
-- Hak akses (sinkron lib/akses.ts):
--   baca semua peran; tambah/ubah admin, konsultan, Tim KINRA;
--   status 'ditetapkan' / 'dicabut' dan persetujuan tinjauan hanya admin & konsultan (trigger); hapus admin.
--
-- Jalankan setelah 0026. Aman diulang.

create table if not exists tinjauan_energi (
  id               bigint generated always as identity primary key,
  periode_mulai    date not null,
  periode_selesai  date not null,
  ambang_persen    numeric not null default 10 check (ambang_persen > 0 and ambang_persen <= 100),
  ambang_kumulatif numeric not null default 80 check (ambang_kumulatif > 0 and ambang_kumulatif <= 100),
  ringkasan        text,
  status           text not null default 'Draft' check (status in ('Draft', 'Disetujui')),
  disetujui_oleh   text,
  disetujui_at     timestamptz,
  diubah_at        timestamptz not null default now(),
  check (periode_selesai >= periode_mulai)
);

create table if not exists seu (
  kode              text primary key check (kode ~ '^[A-Z0-9-]+$'),   -- 'SEU-01'
  nama              text not null,
  deskripsi         text,
  aset_kode         text[] not null default '{}',
  meter_kode        text[] not null default '{}',
  sumber_kode       text[] not null default '{}',       -- untuk SEU non-meter, mis. BBM kendaraan
  kriteria          text[] not null default '{}' check (kriteria <@ array['porsi', 'potensi', 'regulasi']),
  status            text not null default 'Kandidat' check (status in ('Kandidat', 'Ditetapkan', 'Dicabut')),
  variabel_kode     text[] not null default '{}',
  enpi_kode         text references enpi(kode) on delete set null on update cascade,
  pic               text,
  personel          text,                                -- orang/jabatan yang pekerjaannya memengaruhi SEU (7.2)
  alasan            text,
  ditetapkan_oleh   text,
  ditetapkan_at     date,
  tinjau_berikutnya date,
  urutan            int not null default 0,
  diubah_at         timestamptz not null default now()
);

-- Penetapan/pencabutan SEU dan persetujuan tinjauan: hanya admin & konsultan; pencatat diisi dari sesi
create or replace function cek_penetapan_seu() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.status <> 'Kandidat') or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    if nullif(current_setting('request.headers', true), '') is not null
       and coalesce(peran_sesi(), '') not in ('admin', 'konsultan') then
      raise exception 'Hanya admin atau konsultan yang dapat menetapkan atau mencabut SEU' using errcode = '42501';
    end if;
    if new.status = 'Ditetapkan' then
      new.ditetapkan_oleh := coalesce(nama_sesi(), new.ditetapkan_oleh);
      new.ditetapkan_at := coalesce(new.ditetapkan_at, current_date);
    end if;
  end if;
  new.diubah_at := now();
  return new;
end $$;

drop trigger if exists cek_penetapan_seu on seu;
create trigger cek_penetapan_seu before insert or update on seu
  for each row execute function cek_penetapan_seu();

create or replace function cek_persetujuan_tinjauan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.status = 'Disetujui') or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    if nullif(current_setting('request.headers', true), '') is not null
       and coalesce(peran_sesi(), '') not in ('admin', 'konsultan') then
      raise exception 'Hanya admin atau konsultan yang dapat menyetujui tinjauan energi' using errcode = '42501';
    end if;
    if new.status = 'Disetujui' then
      new.disetujui_oleh := coalesce(nama_sesi(), new.disetujui_oleh);
      new.disetujui_at := now();
    else
      new.disetujui_oleh := null;
      new.disetujui_at := null;
    end if;
  end if;
  new.diubah_at := now();
  return new;
end $$;

drop trigger if exists cek_persetujuan_tinjauan on tinjauan_energi;
create trigger cek_persetujuan_tinjauan before insert or update on tinjauan_energi
  for each row execute function cek_persetujuan_tinjauan();

do $$
declare t text;
begin
  foreach t in array array['tinjauan_energi', 'seu'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists baca on %I', t);
    execute format('create policy baca on %I for select to anon, authenticated using ((select peran_sesi()) is not null)', t);
    execute format('drop policy if exists tambah on %I', t);
    execute format('create policy tambah on %I for insert to anon, authenticated with check ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[]))', t);
    execute format('drop policy if exists ubah on %I', t);
    execute format('create policy ubah on %I for update to anon, authenticated using ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[])) with check ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[]))', t);
    execute format('drop policy if exists hapus on %I', t);
    execute format('create policy hapus on %I for delete to anon, authenticated using ((select peran_sesi()) = ''admin'')', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Data awal. Status Kandidat: penetapan resmi dilakukan admin/konsultan setelah rapat Tim Energi.
-- ---------------------------------------------------------------------------

insert into tinjauan_energi (periode_mulai, periode_selesai, ambang_persen, ambang_kumulatif, ringkasan)
select '2026-11-01', '2027-10-31', 10, 80,
  'Tinjauan energi awal. Porsi energi sementara dari data inventaris aset (Bagian M/E) sampai bacaan meter bulanan tersedia. '
  || 'WTP dan WWTP menyumbang sekitar 95% listrik KINRA. 33 aset belum memiliki data energi, termasuk Ruang Boiler Tank Farm yang perlu dikonfirmasi kepemilikan dan bahan bakarnya.'
where not exists (select 1 from tinjauan_energi);

insert into seu (kode, nama, deskripsi, aset_kode, meter_kode, kriteria, variabel_kode, enpi_kode, pic, personel, alasan, urutan) values
  ('SEU-01', 'Instalasi pengolahan air bersih (WTP)', 'Pompa air baku, pompa distribusi, dan peralatan pengolahan air bersih kawasan.',
   '{KINRA-AST-005}', '{KINRA-MTR-005}', '{porsi,potensi}', '{air_olahan}', 'ENPI-05', 'Bagian M/E', 'Operator WTP, teknisi pompa, Kasubag M/E',
   'Sekitar 52% listrik KINRA (inventaris: 209.744 kWh/bulan). Beban pompa bervariasi dengan volume air, sehingga ada potensi penghematan melalui pengaturan operasi dan VSD.', 1),
  ('SEU-02', 'Instalasi pengolahan air limbah (WWTP)', 'Aerator, pompa, dan peralatan pengolahan air limbah industri kawasan.',
   '{KINRA-AST-019}', '{KINRA-MTR-004}', '{porsi}', '{}', null, 'Bagian M/E', 'Operator WWTP, Kasubag M/E',
   'Sekitar 43% listrik KINRA (inventaris: 171.552 kWh/bulan), beroperasi 24 jam. Variabel relevan (mis. debit air limbah masuk) belum tersedia.', 2)
on conflict (kode) do nothing;
