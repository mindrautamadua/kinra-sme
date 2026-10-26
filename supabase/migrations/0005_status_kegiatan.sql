-- Status pelaksanaan kegiatan timeline, ditandai manual dari halaman Timeline.
-- Aman diulang.

alter table kegiatan add column if not exists status text not null default 'belum'
  check (status in ('belum', 'berjalan', 'selesai'));
alter table kegiatan add column if not exists selesai_at timestamptz;
alter table kegiatan add column if not exists catatan text;

-- Nilai awal dari tanggal sesi (hanya untuk baris yang belum pernah diubah):
-- semua sesi sudah lewat = selesai, sebagian lewat = berjalan.
update kegiatan k set
  status = case
    when (select max((s->>'tanggal')::date) from jsonb_array_elements(k.sesi) s) < current_date then 'selesai'
    when (select min((s->>'tanggal')::date) from jsonb_array_elements(k.sesi) s) <= current_date then 'berjalan'
    else 'belum' end,
  selesai_at = case
    when (select max((s->>'tanggal')::date) from jsonb_array_elements(k.sesi) s) < current_date then now() end
where k.status = 'belum' and k.selesai_at is null;
