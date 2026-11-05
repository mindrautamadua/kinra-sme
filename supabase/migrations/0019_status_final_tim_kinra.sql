-- Kolom Status (Belum ada / Draft / Final) di lembar Kesiapan Audit bisa diubah Tim KINRA.
-- Sebelumnya trigger 0006 hanya mengizinkan admin & konsultan menetapkan Disetujui atau Final.
-- Sekarang Final boleh ditetapkan admin, konsultan, dan Tim KINRA; Disetujui tetap admin & konsultan.
-- Setiap perubahan status tetap tercatat di riwayat_status (trigger 0001).
--
-- Jalankan setelah 0018. Aman diulang. Sinkron dengan lib/akses.ts.

create or replace function cek_persetujuan_dokumen() returns trigger
language plpgsql set search_path = public as $$
begin
  if (tg_op = 'INSERT' or new.status is distinct from old.status)
     and nullif(current_setting('request.headers', true), '') is not null then
    if new.status = 'disetujui' and coalesce(peran_sesi(), '') not in ('admin', 'konsultan') then
      raise exception 'Hanya admin atau konsultan yang dapat mengubah status menjadi Disetujui' using errcode = '42501';
    end if;
    if new.status = 'final' and coalesce(peran_sesi(), '') not in ('admin', 'konsultan', 'tim_kinra') then
      raise exception 'Peran Anda tidak dapat mengubah status menjadi Final' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
