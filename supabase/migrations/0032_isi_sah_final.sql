-- Pengisian otomatis sekali: item yang sudah berstatus Final/Disetujui sebelum aturan "versi sah" (0031)
-- dianggap sudah dinyatakan sah oleh tim. Tandai berkasnya sebagai versi sah:
--   - bila item punya berkas PDF, hanya PDF yang ditandai;
--   - bila tidak ada PDF, semua berkasnya ditandai.
-- Item yang sudah punya berkas sah tidak diubah. Item Draft tidak diubah.
-- Tinjau item dengan lebih dari satu berkas sah (ditampilkan di halaman Kesiapan) dan lepas tanda pada draf.
--
-- Jalankan setelah 0031. Aman diulang (hanya menyentuh item Final yang belum punya berkas sah).

-- Pencatat: pakai nama sesi bila ada (aplikasi), selain itu nilai yang diberikan (SQL Editor)
create or replace function cap_berkas_sah() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.sah is distinct from old.sah then
    new.sah_oleh := case when new.sah then coalesce(nama_sesi(), new.sah_oleh) else null end;
    new.sah_at := case when new.sah then now() else null end;
  end if;
  return new;
end $$;

with sasaran as (
  select d.id
  from dokumen_audit d
  where d.status in ('final', 'disetujui')
    and not exists (select 1 from berkas x where x.dokumen_id = d.id and x.sah)
),
pdf as (
  select distinct b.dokumen_id from berkas b
  where b.dokumen_id in (select id from sasaran)
    and (lower(b.nama_file) like '%.pdf' or b.mime = 'application/pdf')
)
update berkas b
set sah = true, sah_oleh = 'Otomatis (migrasi 0032)'
where b.dokumen_id in (select id from sasaran)
  and (
    lower(b.nama_file) like '%.pdf' or b.mime = 'application/pdf'
    or b.dokumen_id not in (select dokumen_id from pdf)
  );
