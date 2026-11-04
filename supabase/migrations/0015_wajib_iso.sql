-- 1) Penanda "informasi terdokumentasi wajib ISO 50001:2018" pada lembar Kesiapan Audit.
--    Dokumen lain tetap diperiksa auditor, tetapi tidak disyaratkan langsung oleh standar.
-- 2) Rekaman EnB tersendiri (klausul 6.5): nilai EnB, data variabel relevan, dan perubahan EnB.
--
-- Jalankan setelah 0014. Aman diulang. Penanda bisa diubah per dokumen di halaman detail (admin/konsultan).

alter table dokumen_audit add column if not exists wajib_iso boolean not null default false;

insert into dokumen_audit (kode, kelompok, klausul_kode, nama, nomor_dokumen, status, keterangan) values
('R-6.5-01', 'rekaman'::kelompok_dokumen, '6.5', 'Rekaman baseline energi (EnB), data variabel relevan, dan perubahan EnB', null, 'belum'::status_dokumen,
 'Wajib ISO 50001:2018 klausul 6.5')
on conflict (kode) do nothing;

-- Penanda awal: hanya diisi bila belum ada dokumen yang ditandai, agar penyesuaian manual tidak tertimpa saat diulang.
update dokumen_audit set wajib_iso = true
where kode in (
  'F-4.3-01', 'MK-01',                      -- 4.3 ruang lingkup dan batas
  'MK-02', 'F-5.2-01',                      -- 5.2 kebijakan energi
  'F-6.2-01', 'F-6.2-02',                   -- 6.2 tujuan, target, rencana aksi
  'SOP-008', 'R-6.3-01', 'F-6.3-01',        -- 6.3 metode & hasil tinjauan energi
  'SOP-009', 'F-6.4-01',                    -- 6.4 metode EnPI
  'R-6.5-01',                               -- 6.5 rekaman EnB
  'F-6.6-01', 'R-9.1-05',                   -- 6.6 rencana pengumpulan data, akurasi pengukuran
  'R-7.2-01', 'R-7.2-02',                   -- 7.2 bukti kompetensi
  'R-8.1-01',                               -- 8.1 pengendalian operasional
  'R-8.2-01',                               -- 8.2 desain
  'R-9.1-01', 'R-9.1-02', 'R-9.1-03',       -- 9.1.1 hasil pemantauan, penyimpangan signifikan
  'R-9.1-04',                               -- 9.1.2 evaluasi kepatuhan
  'R-9.2-01', 'R-9.2-02',                   -- 9.2 program & hasil audit internal
  'R-9.3-01',                               -- 9.3 hasil tinjauan manajemen
  'R-10.1-01', 'R-10.1-02'                  -- 10.1 ketidaksesuaian & tindakan korektif
)
and not exists (select 1 from dokumen_audit where wajib_iso);

-- R-6.5-01 tetap ditandai walaupun penanda lain sudah disesuaikan sebelumnya
update dokumen_audit set wajib_iso = true where kode = 'R-6.5-01';
