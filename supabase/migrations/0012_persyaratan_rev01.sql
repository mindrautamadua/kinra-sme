-- Sinkronkan item Persiapan Awal (PA-01..PA-13) dengan
-- "Checklist Monev Implementasi ISO 50001-KINRA Rev.01 (021126)" dan isi folder `persyaratan/`
-- (unduhan OneDrive "5. Dokumen persyaratan SMEn", 3 Nov 2026).
-- Berkas evidence diunggah terpisah lewat `node scripts/unggah_persyaratan.mjs`.
-- Jalankan setelah 0010. Aman diulang. Status hanya dinaikkan, tidak pernah diturunkan.

-- Item baru di checklist Rev.01
insert into dokumen_audit (kode, kelompok, klausul_kode, nama, pic, status, tenggat, keterangan) values
('PA-12', 'persiapan', 'P', 'Data aset gedung & fasilitas, metering, dan layout', 'Sahala (Kasubag M/E)', 'belum', '2026-11-04', null),
('PA-13', 'persiapan', 'P', 'Data konsumsi energi per metering & variabel relevan', 'Sahala (Kasubag M/E)', 'belum', '2026-11-04', null)
on conflict (kode) do nothing;

-- Pemetaan berkas di folder persyaratan/Point N (path relatif terhadap akar repo)
update dokumen_audit d set sumber_files = v.files
from (values
  ('PA-01', array['persyaratan/Point 1/Data karyawan PT KINRA.pdf']),
  ('PA-02', array['persyaratan/Point 2/sertifikat iso 9001.pdf',
                  'persyaratan/Point 2/Cert_14001_Kawasan Industri Nusantara (KINRA).pdf',
                  'persyaratan/Point 2/Sertifikat PT Kawasan Industri Nusantara ISO 45001.pdf',
                  'persyaratan/Point 2/PT KAWASAN INDUSTRI NUSANTARA_37001_2025_S1.pdf']),
  ('PA-03', array['persyaratan/Point 3/OSS RBA PT KINRA (1).pdf',
                  'persyaratan/Point 3/3. NPWP PT KINRA.pdf']),
  ('PA-04', array['persyaratan/Point 4/SKPTS.16-Perubahan Struktur Organisasi PT KINRA.pdf']),
  ('PA-05', array['persyaratan/Point 5/Final Report Kajian Business Process - Provalindo (Proses Bisnis).pdf']),
  ('PA-06', array['persyaratan/Point 6/6. Data konsumsi energi 2024 Terajoule.pdf',
                  'persyaratan/Point 6/6. Data konsumsi energi 2025 Terajoule.pdf',
                  'persyaratan/Point 6/6. Data konsumsi energi  2026. Terajoule.pdf']),
  ('PA-07', array['persyaratan/Point 7/7. Daftar Type Energy yang digunakan.pdf']),
  ('PA-08', array['persyaratan/Point 8/8. Daya Terpasang Kontrak dan Beban Listrik KEK Sei Mangkei Proyeksi Oktober.pdf',
                  'persyaratan/Point 8/8. Pencahayaan Oktober 2026.pdf',
                  'persyaratan/Point 8/8. Energi Surya.pdf']),
  ('PA-09', array['persyaratan/Point 9/9. Penggunaan Energy Listrik tahun 2024.pdf',
                  'persyaratan/Point 9/9. Penggunaan Energy Listrik tahun 2025..pdf',
                  'persyaratan/Point 9/9. Penggunaan Energy Listrik tahun 2026.pdf',
                  'persyaratan/Point 9/9. REKAP BBM Operasional Tahun 2025.pdf',
                  'persyaratan/Point 9/9. REKAP BBM Operasional Tahun 2026.pdf']),
  ('PA-10', array['persyaratan/Point 10/004_Formulir Peluang Peningkatan Kinerja (271026).xlsx']),
  ('PA-11', array['persyaratan/Point 11/DRAFT SKPTS PEMBENTUKAN TIM SMEn DAN PENETAPAN INTERNAL AUDITOR ISO 50001 (Net).docx']),
  ('PA-12', array['persyaratan/Point 12/Daftar Aset dan Meter Energi.xlsx']),
  ('PA-13', array['persyaratan/Point 13/003_Data Konsumsi Energi (271026).xlsx'])
) as v(kode, files)
where d.kode = v.kode;

-- Status per checklist Rev.01: Point 1–9 "Final", diterima 22 Okt 2026
update dokumen_audit
set status = 'final', tanggal_terima = coalesce(tanggal_terima, '2026-10-22'), diubah_at = now()
where kode in ('PA-01','PA-02','PA-03','PA-04','PA-05','PA-06','PA-07','PA-08','PA-09')
  and status in ('belum', 'draft', 'review');

update dokumen_audit set tanggal_terima = '2026-10-22'
where kode in ('PA-01','PA-02','PA-03','PA-04','PA-05') and tanggal_terima = '2026-10-20';

update dokumen_audit set keterangan = 'SBU dan TDP digantikan NIB (OSS RBA)' where kode = 'PA-03';
update dokumen_audit set keterangan = 'Mencakup daya terpasang/beban listrik, pencahayaan, dan energi surya. HVAC, pompa, genset, dan boiler belum dirinci terpisah.'
where kode = 'PA-08';

-- Point 10–13: dikonfirmasi Final oleh tim (3 Nov 2026)
update dokumen_audit
set status = 'final', tanggal_terima = coalesce(tanggal_terima, '2026-11-03'), diubah_at = now()
where kode in ('PA-10','PA-11','PA-12','PA-13')
  and status in ('belum', 'draft', 'review');

update dokumen_audit set keterangan = 'Formulir Peluang Peningkatan Kinerja (004/SOP-008), 11 peluang' where kode = 'PA-10';
update dokumen_audit set keterangan = 'SKPTS pembentukan Tim SMEn & penetapan Internal Auditor (versi Net)' where kode = 'PA-11';
update dokumen_audit set keterangan = 'Register aset gedung/fasilitas, meter energi, dan layout' where kode = 'PA-12';
update dokumen_audit set keterangan = 'Formulir Data Konsumsi Energi (003/SOP-008) per metering + variabel relevan' where kode = 'PA-13';
