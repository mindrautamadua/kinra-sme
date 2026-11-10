-- Perbaikan cacat logika hasil tinjauan aplikasi (10 Nov 2026). Jalankan setelah 0044. Aman diulang.
--   1) Temuan Tertutup hanya dapat DIBUKA KEMBALI oleh admin & konsultan (sebelumnya hanya menutup yang dijaga).
--   2) Dokumen Disetujui hanya dapat DITURUNKAN statusnya oleh admin & konsultan; status Final/Disetujui wajib punya
--      berkas versi sah (sebelumnya hanya dicek aplikasi); penanda wajib ISO hanya admin & konsultan.
--   3) Berkas baru selalu berstatus belum sah (penanda sah hanya lewat tombol "Versi sah", trigger 0031).
--   4) Isian formulir yang sudah disetujui hanya dapat dihapus admin.
--   5) Kunci login: hitungan gagal direset setelah masa kunci habis (sebelumnya satu salah sandi langsung mengunci lagi).
--      Akun pembaca bersama dikunci 1 menit setelah 10 kali gagal, agar satu orang tidak bisa mengunci semua bagian lama.
--   6) Minimal satu admin aktif harus tersisa.
--   7) Fungsi internal pengguna_sesi() (mengembalikan hash sandi), token_sesi(), wajib_admin() tidak bisa dipanggil lewat API.
-- Semua pemeriksaan peran hanya berlaku untuk permintaan lewat API (request.headers terisi), bukan SQL Editor.

-- 1. Temuan
create or replace function cek_penutupan_temuan() returns trigger
language plpgsql set search_path = public as $$
begin
  if nullif(current_setting('request.headers', true), '') is not null
     and coalesce(peran_sesi(), '') not in ('admin', 'konsultan')
     and ((new.status = 'Tertutup' and (tg_op = 'INSERT' or old.status is distinct from 'Tertutup'))
       or (tg_op = 'UPDATE' and old.status = 'Tertutup' and new.status is distinct from 'Tertutup')) then
    raise exception 'Hanya admin atau konsultan yang dapat menutup atau membuka kembali temuan' using errcode = '42501';
  end if;
  return new;
end $$;

-- 2. Dokumen
create or replace function cek_persetujuan_dokumen() returns trigger
language plpgsql set search_path = public as $$
declare peran text;
begin
  if nullif(current_setting('request.headers', true), '') is null then return new; end if;
  peran := coalesce(peran_sesi(), '');
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status = 'disetujui' and peran not in ('admin', 'konsultan') then
      raise exception 'Hanya admin atau konsultan yang dapat mengubah status menjadi Disetujui' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and old.status = 'disetujui' and peran not in ('admin', 'konsultan') then
      raise exception 'Dokumen yang sudah Disetujui hanya dapat diubah statusnya oleh admin atau konsultan' using errcode = '42501';
    end if;
    if new.status = 'final' and peran not in ('admin', 'konsultan', 'tim_kinra') then
      raise exception 'Peran Anda tidak dapat mengubah status menjadi Final' using errcode = '42501';
    end if;
    if new.status in ('final', 'disetujui') and tg_op = 'UPDATE'
       and not exists (select 1 from berkas b where b.dokumen_id = new.id and b.sah) then
      raise exception 'Tandai dulu minimal satu berkas evidence sebagai versi sah sebelum status Final/Disetujui' using errcode = '23514';
    end if;
  end if;
  if (tg_op = 'INSERT' and new.wajib_iso or tg_op = 'UPDATE' and new.wajib_iso is distinct from old.wajib_iso)
     and peran not in ('admin', 'konsultan') then
    raise exception 'Hanya admin atau konsultan yang dapat mengubah penanda dokumen wajib ISO' using errcode = '42501';
  end if;
  return new;
end $$;

-- 3. Berkas baru belum sah
create or replace function berkas_baru_belum_sah() returns trigger
language plpgsql set search_path = public as $$
begin
  if nullif(current_setting('request.headers', true), '') is not null then
    new.sah := false; new.sah_oleh := null; new.sah_at := null;
  end if;
  return new;
end $$;
drop trigger if exists berkas_baru_belum_sah on berkas;
create trigger berkas_baru_belum_sah before insert on berkas
  for each row execute function berkas_baru_belum_sah();

-- 4. Isian formulir disetujui
drop policy if exists hapus on formulir_isian;
create policy hapus on formulir_isian for delete to anon, authenticated
  using ((select peran_sesi()) = 'admin' or ((select peran_sesi()) = 'tim_kinra' and status <> 'disetujui'));

-- 5. Kunci login
create or replace function masuk(p_email text, p_sandi text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare u pengguna; t text; batas int; lama interval;
begin
  delete from sesi where kedaluwarsa < now();
  select * into u from pengguna where email = lower(trim(p_email));
  if u.id is null or not u.aktif then
    return jsonb_build_object('galat', 'Email atau sandi salah.');
  end if;
  if u.terkunci_sampai is not null and u.terkunci_sampai > now() then
    return jsonb_build_object('galat', format('Akun terkunci karena terlalu banyak salah sandi. Coba lagi setelah pukul %s WIB.',
      to_char(u.terkunci_sampai at time zone 'Asia/Jakarta', 'HH24.MI')));
  end if;
  -- Masa kunci sudah lewat: mulai hitungan baru
  if u.terkunci_sampai is not null then
    update pengguna set gagal_masuk = 0, terkunci_sampai = null where id = u.id;
    u.gagal_masuk := 0;
  end if;
  if u.sandi_hash <> crypt(p_sandi, u.sandi_hash) then
    batas := case when u.peran = 'pembaca' then 10 else 5 end;
    lama := case when u.peran = 'pembaca' then interval '1 minute' else interval '15 minutes' end;
    update pengguna set gagal_masuk = gagal_masuk + 1,
      terkunci_sampai = case when gagal_masuk + 1 >= batas then now() + lama end
    where id = u.id;
    return jsonb_build_object('galat', 'Email atau sandi salah.');
  end if;
  t := encode(gen_random_bytes(32), 'hex');
  insert into sesi (token, pengguna_id) values (t, u.id);
  update pengguna set gagal_masuk = 0, terkunci_sampai = null, terakhir_masuk = now() where id = u.id;
  return jsonb_build_object('token', t);
end $$;

-- 6. Minimal satu admin aktif
create or replace function ubah_pengguna(p_id uuid, p_nama text, p_peran text, p_aktif boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform wajib_admin();
  if p_id = (pengguna_sesi()).id and (p_peran <> 'admin' or not p_aktif) then
    raise exception 'Tidak bisa menurunkan peran atau menonaktifkan akun sendiri';
  end if;
  perform 1 from pengguna where peran = 'admin' and aktif for update;
  update pengguna set nama = trim(p_nama), peran = p_peran, aktif = p_aktif where id = p_id;
  if not exists (select 1 from pengguna where peran = 'admin' and aktif) then
    raise exception 'Minimal harus ada satu admin aktif';
  end if;
  if not p_aktif then delete from sesi where pengguna_id = p_id; end if;
end $$;

-- 7. Fungsi internal tidak bisa dipanggil lewat API (tetap dipakai fungsi security definer lain)
revoke execute on function pengguna_sesi(), token_sesi(), wajib_admin() from public, anon, authenticated;
