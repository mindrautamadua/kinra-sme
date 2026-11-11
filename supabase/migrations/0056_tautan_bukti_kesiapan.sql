-- Tautan bukti pelaksanaan sasaran / rencana aksi ke rekaman di halaman Kesiapan Audit.
--
-- Bukti pelaksanaan (migrasi 0051) dan evidence dokumen memakai tabel `berkas` yang sama, tetapi satu berkas hanya boleh
-- punya satu pemilik. Tanpa tautan, daftar hadir sosialisasi yang sudah diunggah di sasaran SB-xx-1 harus diunggah
-- ulang ke rekaman R-7.3-01 agar Kesiapan tidak menampilkan "belum ada evidence".
--
-- Kolom `dokumen_kode` menunjuk rekaman yang dibuktikan oleh bukti pelaksanaan sasaran/aksi tersebut. Halaman Kesiapan
-- menghitung dan menampilkan bukti ini (hanya baca) di baris rekaman terkait. Penanda versi sah tetap khusus berkas
-- dokumen, jadi skor siap audit tidak berubah: rekaman tetap harus Final dan punya berkas sah.
--
-- Jalankan setelah 0055. Aman diulang: hanya mengisi tautan yang masih kosong.

alter table sasaran add column if not exists dokumen_kode text;
alter table rencana_aksi add column if not exists dokumen_kode text;

alter table sasaran drop constraint if exists sasaran_dokumen_kode_fkey;
alter table sasaran add constraint sasaran_dokumen_kode_fkey
  foreign key (dokumen_kode) references dokumen_audit(kode) on update cascade on delete set null;
alter table rencana_aksi drop constraint if exists rencana_aksi_dokumen_kode_fkey;
alter table rencana_aksi add constraint rencana_aksi_dokumen_kode_fkey
  foreign key (dokumen_kode) references dokumen_audit(kode) on update cascade on delete set null;

create index if not exists sasaran_dokumen_kode_idx on sasaran (dokumen_kode) where dokumen_kode is not null;
create index if not exists rencana_aksi_dokumen_kode_idx on rencana_aksi (dokumen_kode) where dokumen_kode is not null;

-- ---------------------------------------------------------------------------
-- Pemetaan awal (hanya bila rekaman tujuan ada)
-- ---------------------------------------------------------------------------
with peta(kode, dok) as (values
  -- Pola 1: sosialisasi Kebijakan Energi = bukti kesadaran (7.3)
  ('SB-01-1', 'R-7.3-01'), ('SB-02-1', 'R-7.3-01'), ('SB-03-1', 'R-7.3-01'), ('SB-04-1', 'R-7.3-01'), ('SB-05-1', 'R-7.3-01'),
  ('SB-06-1', 'R-7.3-01'), ('SB-07-1', 'R-7.3-01'), ('SB-08-1', 'R-7.3-01'), ('SB-09-1', 'R-7.3-01'), ('SB-10-1', 'R-7.3-01'),
  -- Pola 2: pelatihan SOP + evaluasi = rekaman kompetensi (7.2)
  ('SB-01-2', 'R-7.2-01'), ('SB-02-2', 'R-7.2-01'), ('SB-03-2', 'R-7.2-01'), ('SB-04-2', 'R-7.2-01'), ('SB-05-2', 'R-7.2-01'),
  ('SB-06-2', 'R-7.2-01'), ('SB-07-2', 'R-7.2-01'), ('SB-08-2', 'R-7.2-01'), ('SB-09-2', 'R-7.2-01'), ('SB-10-2', 'R-7.2-01'),
  -- Pola 3: penerapan, mengikuti isi sasaran
  ('SB-01-3', 'R-8.1-01'),  -- inspeksi kepatuhan SOP = pengendalian operasional
  ('SB-02-3', 'R-9.1-02'),  -- rekap dan analisis biaya energi bulanan = pemantauan kinerja energi
  ('SB-04-3', 'F-7.4-02'),  -- komunikasi ke pihak berkepentingan
  ('SB-05-3', 'R-8.3-01'),  -- kriteria energi dalam pengadaan
  ('SB-06-3', 'R-9.1-02'),  -- keandalan data dan pengendalian risiko energi
  ('SB-07-3', 'R-8.2-01'),  -- pertimbangan energi dalam desain
  ('SB-08-3', 'R-8.1-01'),  -- checklist praktik hemat energi kantor
  ('SB-09-3', 'R-8.1-01'),  -- inspeksi SOP operasional kawasan
  ('SB-10-3', 'R-8.1-01')   -- inspeksi berkala fasilitas
)
update sasaran s set dokumen_kode = p.dok
from peta p
where s.kode = p.kode and s.dokumen_kode is null and exists (select 1 from dokumen_audit d where d.kode = p.dok);

-- Sasaran berbasis EnPI: bukti capaian = penilaian kinerja energi (EnPI vs EnB)
update sasaran s set dokumen_kode = 'R-9.1-01'
where s.dokumen_kode is null and s.enpi_kode is not null and exists (select 1 from dokumen_audit d where d.kode = 'R-9.1-01');

with peta(kode, dok) as (values
  ('RT-01', 'R-9.1-06'),  -- LED: M&V penghematan
  ('RT-02', 'R-9.1-06'),  -- jadwal dan zonasi pencahayaan: M&V
  ('RT-03', 'R-9.1-05'),  -- submeter/SCADA: rencana pengukuran dan kalibrasi meter
  ('RT-04', 'R-9.1-06'),  -- peralatan kantor: M&V
  ('RT-05', 'R-9.1-06'),  -- penerangan jalan: M&V
  ('RT-06', 'R-9.1-02'),  -- sistem monitoring berbasis web: pemantauan dan laporan kinerja energi
  ('RT-07', 'R-7.3-01')   -- pelatihan dan kampanye perilaku: bukti kesadaran
)
update rencana_aksi a set dokumen_kode = p.dok
from peta p
where a.kode = p.kode and a.dokumen_kode is null and exists (select 1 from dokumen_audit d where d.kode = p.dok);
