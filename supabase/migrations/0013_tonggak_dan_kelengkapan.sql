-- 1) Tonggak audit diambil dari Timeline (tabel kegiatan), bukan ditulis langsung di kode.
--    Menggeser tanggal sesi kegiatan bertonggak otomatis menggeser hitung mundur di aplikasi.
-- 2) Dokumen dan rekaman yang disyaratkan materi pelatihan ISO 50001 / Daftar List Dokumen KINRA Rev.4
--    tetapi belum ada di lembar Kesiapan Audit.
--
-- Jalankan setelah 0012. Aman diulang.

alter table kegiatan add column if not exists tonggak text
  check (tonggak is null or tonggak in ('ia', 'tm', 's1', 's2'));

create unique index if not exists kegiatan_tonggak_unik on kegiatan (tonggak) where tonggak is not null;

update kegiatan set tonggak = case no when 10 then 'ia' when 11 then 'tm' when 12 then 's1' when 13 then 's2' end
where no in (10, 11, 12, 13) and tonggak is null
  and not exists (select 1 from kegiatan k where k.tonggak is not null);

-- Nomor dokumen sesuai Daftar List Dokumen KINRA Rev.4 (01 Nov 2026)
update dokumen_audit set nomor_dokumen = '002/SOP-003/KINRA/SMEn/X/2026'
where kode = 'F-4.2-01' and nomor_dokumen = '002/SOP-004/KINRA/SMEn/X/2026';

insert into dokumen_audit (kode, kelompok, klausul_kode, nama, nomor_dokumen, status, keterangan) values
-- Prosedur yang masih On going di Daftar List Dokumen Rev.4
('SOP-013','sop'::kelompok_dokumen,'6.6','SOP Perencanaan Pengumpulan Data Energi','012/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-014','sop'::kelompok_dokumen,'7.1','SOP Sumber Daya','014/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-015','sop'::kelompok_dokumen,'7.2','SOP Kompetensi dan Pelatihan','015/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-016','sop'::kelompok_dokumen,'7.4','SOP Komunikasi dan Awareness','016/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-017','sop'::kelompok_dokumen,'8.1','SOP Perencanaan & Pengendalian Operasional','017/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-018','sop'::kelompok_dokumen,'8.2','SOP Pertimbangan Energi dalam Desain','018/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-019','sop'::kelompok_dokumen,'8.3','SOP Pengadaan (Procurement)','019/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-020','sop'::kelompok_dokumen,'9.1','SOP Pemantauan, Pengukuran, Analisis & Evaluasi Kinerja Energi','020/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-021','sop'::kelompok_dokumen,'8.1','SOP Manajemen Perubahan','021/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-022','sop'::kelompok_dokumen,'9.2','SOP Audit Internal','022/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-023','sop'::kelompok_dokumen,'9.3','SOP Tinjauan Manajemen','023/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-024','sop'::kelompok_dokumen,'10.1','SOP Ketidaksesuaian & Tindakan Korektif','024/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('SOP-025','sop'::kelompok_dokumen,'10.2','SOP Peningkatan Berkelanjutan','025/MN/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
-- Formulir dan rekaman yang disyaratkan materi tetapi belum tercatat
('GA-01','persiapan'::kelompok_dokumen,'P','Laporan gap analysis awal (dokumen eksisting vs persyaratan ISO 50001)',null,'belum'::status_dokumen,'Dianjurkan Panduan SMEn'),
('F-4.2-02','formulir'::kelompok_dokumen,'4.2','Formulir Daftar Persyaratan Hukum (register regulasi energi)','003/SOP-003/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('F-8.1-01','formulir'::kelompok_dokumen,'8.1','Formulir Pengendalian Perubahan','001/SOP-021/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('F-9.2-01','formulir'::kelompok_dokumen,'9.2','Checklist Audit Internal per klausul','001/SOP-022/KINRA/SMEn/X/2026','belum'::status_dokumen,'On going di Daftar List Dokumen Rev.4'),
('R-6.3-02','rekaman'::kelompok_dokumen,'6.3','Laporan audit energi awal oleh auditor kompeten',null,'belum'::status_dokumen,'Dianjurkan materi Kickoff (baseline kondisi eksisting)'),
('R-7.3-01','rekaman'::kelompok_dokumen,'7.3','Bukti sosialisasi kebijakan energi dan program awareness',null,'belum'::status_dokumen,'Daftar hadir, materi, foto'),
('R-7.5-01','rekaman'::kelompok_dokumen,'7.5','Daftar Induk Rekaman (masa simpan, metode simpan, PIC)',null,'belum'::status_dokumen,'Dianjurkan Panduan SMEn'),
('R-9.1-06','rekaman'::kelompok_dokumen,'9.1','Rencana dan laporan M&V penghematan (IPMVP)',null,'belum'::status_dokumen,'Materi Pengukuran & Verifikasi Kinerja Energi'),
('R-10.1-02','rekaman'::kelompok_dokumen,'10.1','Logbook PTPP (register tindakan perbaikan dan status penutupan)',null,'belum'::status_dokumen,'Dianjurkan Panduan SMEn')
on conflict (kode) do nothing;
