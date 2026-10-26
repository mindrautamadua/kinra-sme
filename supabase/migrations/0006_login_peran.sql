-- Login sederhana berbasis tabel + 3 peran: admin, konsultan, tim_kinra.
--
-- Cara kerja: fungsi masuk() memeriksa sandi (bcrypt) dan memberi token sesi. Aplikasi mengirim token
-- di header HTTP `x-sesi` pada setiap request; policy RLS membaca peran dari token tersebut lewat peran_sesi().
-- Tanpa token yang sah, peran anon tidak bisa membaca atau menulis data apa pun.
--
-- Jalankan sekali di SQL Editor (aman diulang). Setelah itu masuk dengan admin awal di bagian paling bawah
-- dan SEGERA ganti sandinya (aplikasi akan memaksa ganti sandi saat login pertama).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------------------------

create table if not exists pengguna (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique not null check (email = lower(email)),
  nama               text not null,
  peran              text not null check (peran in ('admin', 'konsultan', 'tim_kinra')),
  sandi_hash         text not null,
  aktif              boolean not null default true,
  wajib_ganti_sandi  boolean not null default true,
  gagal_masuk        int not null default 0,
  terkunci_sampai    timestamptz,
  terakhir_masuk     timestamptz,
  dibuat_at          timestamptz not null default now()
);

create table if not exists sesi (
  token        text primary key,
  pengguna_id  uuid not null references pengguna(id) on delete cascade,
  dibuat_at    timestamptz not null default now(),
  kedaluwarsa  timestamptz not null default now() + interval '12 hours'
);
create index if not exists sesi_pengguna_idx on sesi (pengguna_id);

-- Tidak ada policy: tabel ini hanya bisa disentuh lewat fungsi security definer di bawah.
alter table pengguna enable row level security;
alter table sesi enable row level security;
revoke all on pengguna, sesi from anon, authenticated;

alter table riwayat_status add column if not exists oleh text;

-- ---------------------------------------------------------------------------
-- Sesi & peran
-- ---------------------------------------------------------------------------

create or replace function token_sesi() returns text
language sql stable as $$
  select nullif(nullif(current_setting('request.headers', true), '')::json ->> 'x-sesi', '')
$$;

create or replace function pengguna_sesi() returns pengguna
language sql stable security definer set search_path = public as $$
  select p.* from sesi s join pengguna p on p.id = s.pengguna_id
  where s.token = token_sesi() and s.kedaluwarsa > now() and p.aktif
$$;

create or replace function peran_sesi() returns text
language sql stable security definer set search_path = public as $$
  select (pengguna_sesi()).peran
$$;

create or replace function nama_sesi() returns text
language sql stable security definer set search_path = public as $$
  select (pengguna_sesi()).nama
$$;

-- Data pengguna yang sedang login (dipakai aplikasi)
create or replace function saya() returns table (id uuid, email text, nama text, peran text, wajib_ganti_sandi boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.nama, p.peran, p.wajib_ganti_sandi from pengguna_sesi() p where p.id is not null
$$;

-- Mengembalikan {"token": ...} bila berhasil atau {"galat": ...} bila gagal.
-- Tidak memakai raise untuk sandi salah agar penghitung percobaan gagal tetap tersimpan.
create or replace function masuk(p_email text, p_sandi text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare u pengguna; t text;
begin
  delete from sesi where kedaluwarsa < now();
  select * into u from pengguna where email = lower(trim(p_email));
  if u.id is null or not u.aktif then
    return jsonb_build_object('galat', 'Email atau sandi salah.');
  end if;
  if u.terkunci_sampai is not null and u.terkunci_sampai > now() then
    return jsonb_build_object('galat', format('Akun terkunci karena 5 kali salah sandi. Coba lagi setelah pukul %s WIB.',
      to_char(u.terkunci_sampai at time zone 'Asia/Jakarta', 'HH24.MI')));
  end if;
  if u.sandi_hash <> crypt(p_sandi, u.sandi_hash) then
    update pengguna set gagal_masuk = gagal_masuk + 1,
      terkunci_sampai = case when gagal_masuk + 1 >= 5 then now() + interval '15 minutes' end
    where id = u.id;
    return jsonb_build_object('galat', 'Email atau sandi salah.');
  end if;
  t := encode(gen_random_bytes(32), 'hex');
  insert into sesi (token, pengguna_id) values (t, u.id);
  update pengguna set gagal_masuk = 0, terkunci_sampai = null, terakhir_masuk = now() where id = u.id;
  return jsonb_build_object('token', t);
end $$;

create or replace function keluar() returns void
language sql security definer set search_path = public as $$
  delete from sesi where token = token_sesi()
$$;

create or replace function ganti_sandi(p_lama text, p_baru text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare u pengguna := pengguna_sesi();
begin
  if u.id is null then raise exception 'Sesi tidak valid' using errcode = '28000'; end if;
  if u.sandi_hash <> crypt(p_lama, u.sandi_hash) then raise exception 'Sandi lama salah' using errcode = '28P01'; end if;
  if length(p_baru) < 8 then raise exception 'Sandi baru minimal 8 karakter'; end if;
  update pengguna set sandi_hash = crypt(p_baru, gen_salt('bf')), wajib_ganti_sandi = false where id = u.id;
  delete from sesi where pengguna_id = u.id and token <> token_sesi();
end $$;

-- ---------------------------------------------------------------------------
-- Kelola pengguna (admin)
-- ---------------------------------------------------------------------------

create or replace function wajib_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(peran_sesi(), '') <> 'admin' then raise exception 'Hanya admin' using errcode = '42501'; end if;
end $$;

create or replace function daftar_pengguna() returns table (id uuid, email text, nama text, peran text, aktif boolean, terakhir_masuk timestamptz, terkunci_sampai timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform wajib_admin();
  return query select p.id, p.email, p.nama, p.peran, p.aktif, p.terakhir_masuk, p.terkunci_sampai from pengguna p order by p.peran, p.nama;
end $$;

create or replace function tambah_pengguna(p_email text, p_nama text, p_peran text, p_sandi text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare i uuid;
begin
  perform wajib_admin();
  if length(p_sandi) < 8 then raise exception 'Sandi minimal 8 karakter'; end if;
  insert into pengguna (email, nama, peran, sandi_hash)
  values (lower(trim(p_email)), trim(p_nama), p_peran, crypt(p_sandi, gen_salt('bf')))
  returning pengguna.id into i;
  return i;
end $$;

create or replace function ubah_pengguna(p_id uuid, p_nama text, p_peran text, p_aktif boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wajib_admin();
  if p_id = (pengguna_sesi()).id and (p_peran <> 'admin' or not p_aktif) then
    raise exception 'Tidak bisa menurunkan peran atau menonaktifkan akun sendiri';
  end if;
  update pengguna set nama = trim(p_nama), peran = p_peran, aktif = p_aktif where id = p_id;
  if not p_aktif then delete from sesi where pengguna_id = p_id; end if;
end $$;

create or replace function atur_ulang_sandi(p_id uuid, p_sandi text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform wajib_admin();
  if length(p_sandi) < 8 then raise exception 'Sandi minimal 8 karakter'; end if;
  update pengguna set sandi_hash = crypt(p_sandi, gen_salt('bf')), wajib_ganti_sandi = true, gagal_masuk = 0, terkunci_sampai = null where id = p_id;
  delete from sesi where pengguna_id = p_id;
end $$;

revoke all on function masuk(text, text), keluar(), ganti_sandi(text, text), saya(), daftar_pengguna(),
  tambah_pengguna(text, text, text, text), ubah_pengguna(uuid, text, text, boolean), atur_ulang_sandi(uuid, text),
  pengguna_sesi(), peran_sesi(), nama_sesi(), wajib_admin() from public;
grant execute on function masuk(text, text), keluar(), ganti_sandi(text, text), saya(), daftar_pengguna(),
  tambah_pengguna(text, text, text, text), ubah_pengguna(uuid, text, text, boolean), atur_ulang_sandi(uuid, text),
  peran_sesi(), nama_sesi() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Aturan khusus peran (dicek di trigger agar berlaku untuk perubahan apa pun)
-- ---------------------------------------------------------------------------

-- Hanya admin & konsultan yang boleh menyetujui dokumen (status Disetujui/Final)
create or replace function cek_persetujuan_dokumen() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status in ('disetujui', 'final') and (tg_op = 'INSERT' or new.status is distinct from old.status)
     and nullif(current_setting('request.headers', true), '') is not null
     and coalesce(peran_sesi(), '') not in ('admin', 'konsultan') then
    raise exception 'Hanya admin atau konsultan yang dapat mengubah status menjadi Disetujui/Final' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists dokumen_audit_persetujuan_trg on dokumen_audit;
create trigger dokumen_audit_persetujuan_trg before insert or update on dokumen_audit
  for each row execute function cek_persetujuan_dokumen();

-- Hanya admin & konsultan yang boleh menutup temuan
create or replace function cek_penutupan_temuan() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'Tertutup' and (tg_op = 'INSERT' or new.status is distinct from old.status)
     and nullif(current_setting('request.headers', true), '') is not null
     and coalesce(peran_sesi(), '') not in ('admin', 'konsultan') then
    raise exception 'Hanya admin atau konsultan yang dapat menutup temuan' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists temuan_penutupan_trg on temuan;
create trigger temuan_penutupan_trg before insert or update on temuan
  for each row execute function cek_penutupan_temuan();

-- Riwayat status mencatat siapa yang mengubah
create or replace function catat_perubahan_status() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into riwayat_status (dokumen_id, dari, ke, oleh)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, nama_sesi());
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: ganti akses terbuka dengan akses berbasis peran
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['klausul','sumber_energi','dokumen_audit','riwayat_status','berkas',
                           'energi_bulanan','kegiatan','isu','peluang','temuan'] loop
    if to_regclass(t) is null then continue; end if;
    execute format('drop policy if exists akses_terbuka on %I', t);
    execute format('drop policy if exists baca on %I', t);
    execute format('drop policy if exists tambah on %I', t);
    execute format('drop policy if exists ubah on %I', t);
    execute format('drop policy if exists hapus on %I', t);
    -- semua peran yang login boleh membaca
    execute format('create policy baca on %I for select to anon, authenticated using ((select peran_sesi()) is not null)', t);
  end loop;
end $$;

-- helper: daftar peran yang boleh menulis per tabel & operasi
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

-- Matriks akses (sinkron dengan lib/akses.ts)
select pasang_policy('klausul', 'insert', '{admin}'), pasang_policy('klausul', 'update', '{admin}'), pasang_policy('klausul', 'delete', '{admin}');
select pasang_policy('sumber_energi', 'insert', '{admin}'), pasang_policy('sumber_energi', 'update', '{admin}'), pasang_policy('sumber_energi', 'delete', '{admin}');

select pasang_policy('dokumen_audit', 'insert', '{admin,konsultan}');
select pasang_policy('dokumen_audit', 'update', '{admin,konsultan,tim_kinra}');
select pasang_policy('dokumen_audit', 'delete', '{admin}');
select pasang_policy('riwayat_status', 'insert', '{admin,konsultan,tim_kinra}');

select pasang_policy('energi_bulanan', 'insert', '{admin,tim_kinra}');
select pasang_policy('energi_bulanan', 'update', '{admin,tim_kinra}');
select pasang_policy('energi_bulanan', 'delete', '{admin,tim_kinra}');

select pasang_policy('kegiatan', 'insert', '{admin}');
select pasang_policy('kegiatan', 'update', '{admin,konsultan,tim_kinra}');
select pasang_policy('kegiatan', 'delete', '{admin}');

select pasang_policy('isu', 'insert', '{admin,konsultan,tim_kinra}');
select pasang_policy('isu', 'update', '{admin,konsultan,tim_kinra}');
select pasang_policy('isu', 'delete', '{admin}');
select pasang_policy('peluang', 'insert', '{admin,konsultan,tim_kinra}');
select pasang_policy('peluang', 'update', '{admin,konsultan,tim_kinra}');
select pasang_policy('peluang', 'delete', '{admin}');

select pasang_policy('temuan', 'insert', '{admin,konsultan}');
select pasang_policy('temuan', 'update', '{admin,konsultan,tim_kinra}');
select pasang_policy('temuan', 'delete', '{admin}');

do $$ begin
  if to_regclass('berkas') is not null then
    perform pasang_policy('berkas', 'insert', '{admin}'), pasang_policy('berkas', 'update', '{admin}'), pasang_policy('berkas', 'delete', '{admin}');
  end if;
end $$;

drop function pasang_policy(text, text, text[]);

-- ---------------------------------------------------------------------------
-- Admin awal. Sandi sementara WAJIB diganti saat login pertama.
-- Ubah email/nama di bawah sebelum menjalankan bila perlu.
-- ---------------------------------------------------------------------------

insert into pengguna (email, nama, peran, sandi_hash, wajib_ganti_sandi)
values ('admin@kinra.co.id', 'Administrator SMEn', 'admin', crypt('GantiSandi#2026', gen_salt('bf')), true)
on conflict (email) do nothing;
