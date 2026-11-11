-- Hubungkan rencana aksi RT-01..RT-07 (Formulir Rencana Tindakan 6.2, 003/SOP-008/KINRA/SMEn/X/2026; migrasi 0050)
-- ke sasaran per bagian (Formulir Objective dan Target 6.2, 001/SOP-008/KINRA/SMEn/X/2026; migrasi 0048).
-- Formulir rencana tindakan hanya memuat teks sasaran (kolom sasaran_teks), tidak menyebut kode sasaran, sehingga
-- sasaran_id kosong dan aksi muncul di "Aksi belum terhubung ke sasaran". Pemetaan berdasarkan bagian yang
-- mengendalikan fasilitas/proses dan isi sasarannya:
--   RT-01 LED, RT-02 jadwal/zonasi pencahayaan, RT-05 penerangan jalan, RT-03 submeter pada panel distribusi
--     -> SB-10-3 (Mekanikal & Elektrikal, Fasilitas & Pengamanan: penerapan praktik hemat energi pada peralatan dan fasilitas)
--   RT-06 monitoring SMEn berbasis web
--     -> SB-06-3 (Manajemen Risiko & TI: dukungan TI untuk pemantauan dan keandalan data kinerja energi)
--   RT-04 efisiensi peralatan kantor (lintas bagian, PIC Steering Committee/MR)
--     -> SB-01-3 (Korporasi: konsistensi penerapan SMEn dalam operasional)
--   RT-07 pelatihan dan kampanye perilaku hemat energi
--     -> SB-01-1 (Korporasi: pemahaman personel terhadap Kebijakan Energi)
-- Jalankan setelah 0056. Aman diulang: hanya mengisi aksi yang sasaran_id-nya masih kosong atau menunjuk sasaran
-- yang sudah tidak ada, sehingga tautan yang diatur manual lewat aplikasi tidak ditimpa.

update rencana_aksi a
set sasaran_id = s.id,
    diubah_at = now()
from (values
  ('RT-01', 'SB-10-3'),
  ('RT-02', 'SB-10-3'),
  ('RT-03', 'SB-10-3'),
  ('RT-04', 'SB-01-3'),
  ('RT-05', 'SB-10-3'),
  ('RT-06', 'SB-06-3'),
  ('RT-07', 'SB-01-1')
) as p(aksi_kode, sasaran_kode)
join sasaran s on s.kode = p.sasaran_kode
where a.kode = p.aksi_kode
  and (a.sasaran_id is null or not exists (select 1 from sasaran x where x.id = a.sasaran_id));
