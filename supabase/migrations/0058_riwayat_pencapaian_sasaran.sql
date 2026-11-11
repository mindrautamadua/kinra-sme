-- Riwayat pencapaian sasaran per bagian dari setiap sheet "Pencapaian <bulan>" Formulir Objective dan Target (6.2),
-- folder OneDrive "Formulir Sasaran & Target (KINRA)", diunduh 2026-11-11 (10 berkas, 29 sasaran).
-- Teks aktivitas, aspek, tujuan, target, program, batas waktu, dan PIC sudah sama dengan migrasi 0048; yang ditambah hanya riwayat.
--   * Kolom baru sasaran.pencapaian_riwayat (jsonb): [{periode 'YYYY-MM', tanggal 'YYYY-MM-DD', hasil}], urut periode.
--   * Sheet September dan Oktober (30 Sep, 30 Okt): semua "Belum tercapai". Sheet November (30 Nov 2026): semua "Tercapai".
--     Sheet November disimpan apa adanya; aplikasi menandainya "belum jatuh tempo" sampai tanggalnya lewat, dan
--     pencapaian utama (kolom pencapaian/pencapaian_per) tetap dari sheet terakhir yang tanggalnya sudah lewat.
--   * Status sasaran tidak diubah: 'Tercapai' tetap butuh bukti pelaksanaan (pemicu migrasi 0051).
-- Jalankan setelah 0057. Aman diulang: riwayat dari formulir ditimpa ulang.

alter table sasaran add column if not exists pencapaian_riwayat jsonb;

with r(kode, periode, tanggal, hasil, nomor) as (values
  ('SB-01-1', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-01-2', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-01-3', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-01-1', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-01-2', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-01-3', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-01-1', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-01-2', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-01-3', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-02-1', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-02-2', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-02-3', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-02-1', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-02-2', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-02-3', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-02-1', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-02-2', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-02-3', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-03-1', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-03-2', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-03-1', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-03-2', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-03-1', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-03-2', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-04-1', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-04-2', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-04-3', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-04-1', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-04-2', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-04-3', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-04-1', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-04-2', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-04-3', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-05-1', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-05-2', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-05-3', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-05-1', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-05-2', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-05-3', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-05-1', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-05-2', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-05-3', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-06-1', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-06-2', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-06-3', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-06-1', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-06-2', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-06-3', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-06-1', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-06-2', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-06-3', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-07-1', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-07-2', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-07-3', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-07-1', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-07-2', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-07-3', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-07-1', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-07-2', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-07-3', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-08-1', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-08-2', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-08-3', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-08-1', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-08-2', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-08-3', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-08-1', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-08-2', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-08-3', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-09-1', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-09-2', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-09-3', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-09-1', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-09-2', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-09-3', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/X/2026'),
  ('SB-09-1', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-09-2', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-09-3', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/XI/2026'),
  ('SB-10-1', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-10-2', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-10-3', '2026-09', date '2026-09-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-10-1', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-10-2', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-10-3', '2026-10', date '2026-10-30', 'Belum tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-10-1', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-10-2', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/IX/2026'),
  ('SB-10-3', '2026-11', date '2026-11-30', 'Tercapai', '001/SOP-008/KINRA/SMEn/IX/2026')
)
update sasaran s
set pencapaian_riwayat = x.riwayat, diubah_at = now()
from (
  select kode, jsonb_agg(jsonb_build_object('periode', periode, 'tanggal', tanggal, 'hasil', hasil) order by periode) as riwayat
  from r group by kode
) x
where s.kode = x.kode;

-- Pencapaian utama = sheet terakhir yang tanggalnya tidak melewati hari ini (WIB)
with terakhir as (
  select distinct on (s.id) s.id, e->>'hasil' as hasil, (e->>'tanggal')::date as tanggal
  from sasaran s, jsonb_array_elements(s.pencapaian_riwayat) e
  where (e->>'tanggal')::date <= (now() at time zone 'Asia/Jakarta')::date
  order by s.id, (e->>'tanggal')::date desc
)
update sasaran s
set pencapaian = t.hasil, pencapaian_per = t.tanggal, diubah_at = now()
from terakhir t
where s.id = t.id and (s.pencapaian is distinct from t.hasil or s.pencapaian_per is distinct from t.tanggal);
