-- Akun pembaca dipakai bersama oleh seluruh bagian. Jalankan setelah 0029. Aman diulang.
--
-- Peran pembaca (migrasi 0008) sudah hanya bisa melihat data. Karena satu akun dipakai banyak orang,
-- tiga celah ditutup:
--   1) Pembaca tidak bisa mengganti sandi sendiri. Bila bisa, satu orang dapat mengganti sandi
--      lalu semua sesi lain terputus (ganti_sandi menghapus sesi lain). Sandi hanya diatur ulang admin.
--   2) Pembaca tidak pernah diwajibkan ganti sandi saat masuk pertama / setelah diatur ulang admin.
--   3) Pembaca tidak bisa menyimpan hasil simulasi audit (satu-satunya tabel yang masih bisa ditulis
--      oleh semua peran yang login). Latihan simulasi tetap bisa dijalankan, hanya tidak disimpan.

-- 1) Tolak ganti sandi untuk pembaca
create or replace function ganti_sandi(p_lama text, p_baru text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare u pengguna := pengguna_sesi();
begin
  if u.id is null then raise exception 'Sesi tidak valid' using errcode = '28000'; end if;
  if u.peran = 'pembaca' then
    raise exception 'Sandi akun pembaca hanya dapat diatur ulang oleh admin' using errcode = '42501';
  end if;
  if u.sandi_hash <> crypt(p_lama, u.sandi_hash) then raise exception 'Sandi lama salah' using errcode = '28P01'; end if;
  if length(p_baru) < 8 then raise exception 'Sandi baru minimal 8 karakter'; end if;
  update pengguna set sandi_hash = crypt(p_baru, gen_salt('bf')), wajib_ganti_sandi = false where id = u.id;
  delete from sesi where pengguna_id = u.id and token <> token_sesi();
end $$;

-- 2) Pembaca tidak pernah wajib ganti sandi (berlaku untuk tambah, ubah peran, dan atur ulang sandi)
create or replace function pembaca_tanpa_ganti_sandi() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.peran = 'pembaca' then new.wajib_ganti_sandi := false; end if;
  return new;
end $$;
drop trigger if exists pembaca_tanpa_ganti_sandi on pengguna;
create trigger pembaca_tanpa_ganti_sandi before insert or update on pengguna
  for each row execute function pembaca_tanpa_ganti_sandi();

update pengguna set wajib_ganti_sandi = false where peran = 'pembaca' and wajib_ganti_sandi;

-- 3) Simpan hasil simulasi hanya untuk peran yang boleh menulis
drop policy if exists tambah on simulasi_audit;
create policy tambah on simulasi_audit for insert to anon, authenticated
  with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
