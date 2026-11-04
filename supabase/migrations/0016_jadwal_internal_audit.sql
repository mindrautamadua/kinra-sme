-- Penyesuaian jadwal Internal Audit (4 Nov 2026): sesi Kamis 5 Nov 13–16 dipindah ke Jumat 6 Nov 09–12.
-- Jumat 6 Nov 13–16 tetap, jadi hari itu ada dua sesi. Sesi lain tidak berubah.
-- Tonggak Internal Audit (hitung mundur di bilah atas) otomatis ikut bergeser ke 6 Nov.
--
-- Jalankan setelah 0015. Aman diulang: hanya mengubah sesi bertanggal 2026-11-05.

update kegiatan k
set sesi = (
  select jsonb_agg(s order by s->>'tanggal', s->>'jam')
  from (
    select case when e->>'tanggal' = '2026-11-05'
                then jsonb_build_object('tanggal', '2026-11-06', 'jam', '09 - 12')
                else e end as s
    from jsonb_array_elements(k.sesi) e
  ) x
)
where (k.tonggak = 'ia' or (k.no = 10 and not exists (select 1 from kegiatan where tonggak = 'ia')))
  and k.sesi @> '[{"tanggal": "2026-11-05"}]'::jsonb;
