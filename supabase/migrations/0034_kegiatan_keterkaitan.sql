-- Keterkaitan kegiatan pendampingan dengan klausul & dokumen, serta kendala/tindak lanjut (PICA)
-- untuk bagian "Program pendampingan & jalur kritis" di laporan kesiapan.
--
-- Pemetaan awal di bawah adalah USULAN dari nama kegiatan; periksa dan koreksi di halaman Timeline.
-- Hak ubah mengikuti policy kegiatan (migrasi 0006): admin, konsultan, Tim KINRA.
-- Jalankan setelah 0006. Aman diulang: pemetaan hanya diisi bila masih kosong.

alter table kegiatan add column if not exists klausul text[] not null default '{}';
alter table kegiatan add column if not exists dokumen_kode text[] not null default '{}';
alter table kegiatan add column if not exists kendala text;
alter table kegiatan add column if not exists tindak_lanjut text;
alter table kegiatan add column if not exists tindak_pic text;
alter table kegiatan add column if not exists tindak_tenggat date;

update kegiatan k set klausul = m.klausul, dokumen_kode = m.dokumen
from (values
  (1,  '{4.3,5.3}'::text[],          '{PA-01,PA-02,PA-03,PA-04,PA-05,PA-11,F-4.3-01}'::text[]),
  (2,  '{5.1,5.2,7.3}',              '{MK-02,F-5.2-01,F-7.3-01}'),
  (3,  '{5.3,6.3,6.6}',              '{F-5.3-01,PA-06,PA-07,PA-08,PA-09,PA-10,F-6.3-01,R-6.3-01}'),
  (4,  '{7.2,7.3}',                  '{R-7.2-01,R-7.2-02}'),
  (5,  '{6.1,6.2}',                  '{F-6.1-01,F-6.2-01,SOP-006,SOP-007}'),
  (6,  '{7.2,9.2}',                  '{R-7.2-02,F-5.3-01}'),
  (7,  '{4.4,7.3}',                  '{MK-01,R-4.4-01}'),
  (8,  '{7.3,7.5}',                  '{SOP-002,SOP-003,SOP-004,SOP-005,SOP-006,SOP-007,SOP-008,SOP-009,SOP-010,SOP-011,SOP-012}'),
  (9,  '{7.5,8.1,9.1}',              '{R-8.1-01,R-9.1-01,R-9.1-02,R-9.1-05,SOP-011,SOP-012}'),
  (10, '{9.2}',                      '{R-9.2-01,R-9.2-02}'),
  (11, '{9.3}',                      '{R-9.3-01}'),
  (14, '{10.1}',                     '{R-10.1-01}')
) as m(no, klausul, dokumen)
where k.no = m.no and cardinality(k.klausul) = 0 and cardinality(k.dokumen_kode) = 0;
