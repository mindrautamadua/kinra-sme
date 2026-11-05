-- Kolom catatan di lembar Kesiapan Audit:
--   posisi_draf  : draf dokumen sedang ada di siapa (mis. Konsultan, Dokumen Kontrol, PIC, menunggu tanda tangan)
--   keterangan   : sudah ada sejak 0001, dipakai sebagai catatan bebas
--   catatan_oleh / catatan_at : siapa dan kapan terakhir mengubah posisi draf atau keterangan (diisi otomatis)
-- Admin, konsultan, dan Tim KINRA sudah boleh mengubah dokumen_audit (policy di 0006), jadi tidak ada policy baru.
--
-- Jalankan setelah 0017. Aman diulang.

alter table dokumen_audit add column if not exists posisi_draf text;
alter table dokumen_audit add column if not exists catatan_oleh text;
alter table dokumen_audit add column if not exists catatan_at timestamptz;

create or replace function cap_catatan_dokumen() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.posisi_draf is not null or new.keterangan is not null then
      new.catatan_at := now();
      new.catatan_oleh := nama_sesi();
    end if;
  elsif new.posisi_draf is distinct from old.posisi_draf or new.keterangan is distinct from old.keterangan then
    new.catatan_at := now();
    new.catatan_oleh := nama_sesi();
  end if;
  return new;
end $$;

drop trigger if exists dokumen_audit_catatan_trg on dokumen_audit;
create trigger dokumen_audit_catatan_trg before insert or update on dokumen_audit
  for each row execute function cap_catatan_dokumen();
