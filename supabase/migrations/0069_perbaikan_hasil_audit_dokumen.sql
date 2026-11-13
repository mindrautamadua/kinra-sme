-- Perbaikan data aplikasi hasil audit isi dokumen evidence (13 Nov 2026).
-- 1) 18 risiko Formulir Isu Internal & Eksternal (F-4.1-01) belum ada di tabel isu (hanya 5 peluangnya, id 19–23).
-- 2) Isu #68 (SPI): kolom PIC dan target bergeser saat sinkron dari formulir.
-- 3) Kegiatan 4 (Training Pemahaman Implementasi ISO 50001): sesi pertama 26 Okt 2026, bukan 23 Okt
--    (25 sertifikat, daftar hadir 003, dan Google Form menulis 26 & 30 Okt).
-- 4) Pencapaian sasaran periode Nov 2026 dihapus: diisi "Tercapai" sebelum periode berakhir.
-- 5) P-10/RT-05 memakai 443 lampu yang sama dengan P-02/RT-01: estimasi tidak dihitung dua kali.
-- 6) Alasan SEU memakai porsi dari bacaan meter 2025 (bukan inventaris).
-- 7) Berkas template kosong, draf, atau salah unggah tidak lagi bertanda versi sah.
-- Jalankan setelah 0068. Aman diulang.

-- 1. Risiko klausul 4.1
insert into isu (asal, jenis, uraian, dampak, kemungkinan, tindakan, evaluasi, pic, sumber)
select v.* from (values
  ('Internal', 'Risiko', 'Anggaran operasional untuk program efisiensi energi berkurang.', 3, 2, 'Prioritaskan tindakan tanpa/berbiaya rendah; lakukan pengaturan operasi, pemadaman beban tidak perlu, dan kampanye hemat energi. Usulkan kebutuhan anggaran berbasis potensi penghematan terukur.', 'Pantau biaya energi, realisasi program, dan penghematan aktual.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Internal', 'Risiko', 'Anggaran investasi modal untuk penggantian/perbaikan peralatan hemat energi terbatas.', 3, 2, 'Susun business case berdasarkan biaya siklus hidup, penghematan energi, ROI/payback, dan risiko operasional; kaji pelaksanaan bertahap serta peluang insentif yang sah.', 'Bandingkan penghematan dan biaya aktual terhadap business case.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Internal', 'Risiko', 'Komitmen atau pemahaman pegawai dan unit kerja terhadap pengelolaan energi belum merata.', 3, 2, 'Tetapkan peran dan tanggung jawab; lakukan sosialisasi, pelatihan, komunikasi indikator energi, dan pelibatan unit terkait.', 'Ukur tingkat partisipasi, penyelesaian pelatihan, dan kepatuhan praktik operasi.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Internal', 'Risiko', 'Data konsumsi energi per gedung, fasilitas, atau penggunaan signifikan belum lengkap/terintegrasi.', 3, 2, 'Bangun inventaris meter dan sumber data; tetapkan metode pencatatan, validasi, frekuensi pelaporan, serta penanggung jawab data energi.', 'Periksa kelengkapan, ketepatan waktu, dan konsistensi data.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Internal', 'Risiko', 'Peralatan tata udara (HVAC), pompa, penerangan, dan utilitas beroperasi di luar kebutuhan aktual.', 3, 2, 'Tetapkan jadwal operasi dan set point yang sesuai; lakukan preventive maintenance, pemeriksaan jam operasi, serta pengendalian beban saat area tidak digunakan.', 'Bandingkan konsumsi sebelum/sesudah dan hasil inspeksi operasional.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Internal', 'Risiko', 'Pemeliharaan infrastruktur dan peralatan energi tidak konsisten atau tertunda.', 3, 2, 'Terapkan jadwal pemeliharaan berbasis risiko untuk panel, trafo, pompa, HVAC, penerangan, dan peralatan pendukung; catat gangguan dan tindak lanjut.', 'Pantau kepatuhan jadwal, kerusakan berulang, dan konsumsi energi.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Internal', 'Risiko', 'Perubahan tingkat hunian, aktivitas tenant, atau kebutuhan layanan kawasan menyebabkan pola konsumsi berubah.', 3, 2, 'Pantau perubahan beban dan profil penggunaan; tinjau baseline serta indikator kinerja energi jika perubahan relevan dan terdokumentasi.', 'Tinjau kesesuaian baseline/EnPI terhadap kondisi operasi terkini.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Internal', 'Risiko', 'Pembelian atau penggantian peralatan tidak mempertimbangkan kinerja energi.', 3, 2, 'Masukkan kriteria kinerja energi ke spesifikasi, evaluasi pemasok, desain, pengadaan, dan keputusan penggantian peralatan dalam kendali/pengaruh KINRA.', 'Periksa dokumen pengadaan dan spesifikasi teknis.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Internal', 'Risiko', 'Kompetensi personel pengoperasian dan pemeliharaan terkait energi belum memadai.', 3, 2, 'Identifikasi kompetensi yang diperlukan; berikan pelatihan bagi operator/pemelihara dan verifikasi pemahaman serta penerapan di lapangan.', 'Tinjau matriks kompetensi dan hasil observasi.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Internal', 'Risiko', 'Kebocoran, kerusakan, atau pengaturan tidak tepat pada sistem utilitas meningkatkan konsumsi energi.', 3, 2, 'Lakukan inspeksi rutin, pencatatan anomali, analisis akar masalah, dan tindakan korektif terhadap sistem listrik, pompa, tata udara, serta utilitas lain yang relevan.', 'Verifikasi penutupan temuan dan perubahan konsumsi.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Internal', 'Risiko', 'Kegiatan administrasi dan operasional gedung menggunakan pencahayaan/peralatan saat tidak diperlukan.', 3, 2, 'Terapkan prosedur shutdown, zonasi pencahayaan, pemanfaatan cahaya alami bila sesuai, serta pengingat dan inspeksi akhir jam kerja.', 'Lakukan inspeksi berkala dan bandingkan pemakaian di luar jam operasi.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Internal', 'Risiko', 'Perubahan proses, renovasi, atau pengembangan fasilitas tidak menilai dampak penggunaan energi sejak tahap perencanaan.', 3, 2, 'Integrasikan tinjauan energi ke perencanaan desain, modifikasi, proyek, dan perubahan operasional; dokumentasikan asumsi serta persetujuan teknis.', 'Audit sampel proyek/perubahan dan tindak lanjut rekomendasi energi.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Eksternal', 'Risiko', 'Gangguan pasokan listrik, penurunan kualitas tegangan, atau pemadaman dari jaringan eksternal.', 3, 2, 'Siapkan prosedur respons gangguan, prioritas beban, koordinasi dengan penyedia listrik, serta pemeliharaan sumber daya cadangan jika tersedia dan relevan.', 'Kaji catatan gangguan, durasi, dampak, dan hasil uji kesiapan.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Eksternal', 'Risiko', 'Perubahan tarif energi, biaya beban, atau struktur harga dari penyedia energi.', 3, 2, 'Pantau tagihan dan perubahan tarif; evaluasi pola beban, faktor daya, waktu penggunaan, dan opsi pengendalian yang sesuai ketentuan.', 'Bandingkan biaya per satuan energi dan profil beban.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Eksternal', 'Risiko', 'Cuaca ekstrem, suhu tinggi, curah hujan, atau perubahan iklim meningkatkan kebutuhan pendinginan dan memengaruhi operasi fasilitas.', 3, 2, 'Evaluasi dampak kondisi cuaca terhadap beban HVAC dan fasilitas; sesuaikan jadwal, pemeliharaan, kesiapsiagaan, dan rencana energi berdasarkan data.', 'Analisis tren energi terhadap suhu/cuaca dan gangguan operasional.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Eksternal', 'Risiko', 'Perubahan peraturan, persyaratan pemerintah, atau kewajiban pelaporan energi dan lingkungan.', 3, 2, 'Identifikasi kewajiban yang berlaku, tetapkan pemilik kepatuhan, evaluasi berkala, dan perbarui prosedur serta bukti pemenuhan.', 'Periksa daftar peraturan dan hasil evaluasi kepatuhan.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Eksternal', 'Risiko', 'Ketersediaan atau mutu pasokan energi dan layanan dari penyedia eksternal berubah.', 3, 2, 'Tinjau ketergantungan pada penyedia, ketentuan layanan, dan rencana kontingensi; koordinasikan perubahan yang dapat berdampak pada operasi kawasan.', 'Tinjau catatan layanan dan hasil koordinasi penyedia.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)'),
  ('Eksternal', 'Risiko', 'Keterbatasan ketersediaan air atau sumber daya pendukung memengaruhi sistem utilitas yang menggunakan energi.', 3, 2, 'Identifikasi hubungan penggunaan air dan energi pada fasilitas relevan; evaluasi opsi operasi yang efisien tanpa mengganggu fungsi dan persyaratan layanan.', 'Pantau konsumsi sumber daya dan kinerja fasilitas terkait.', 'Manajemen Risiko & TI', 'Formulir Isu Internal & Eksternal 001/SOP-003/KINRA/SMEn/X/2026 (klausul 4.1)')
) as v(asal, jenis, uraian, dampak, kemungkinan, tindakan, evaluasi, pic, sumber)
where not exists (select 1 from isu i where i.uraian = v.uraian);

-- 2. Isu #68
update isu set
  pic = 'Kepala SPI; Ketua/Koordinator Auditor Internal SMEn; Bagian SDM untuk dukungan pelatihan; Koordinator/Tim SMEn sebagai narasumber teknis.',
  target = 'Sebelum penugasan audit 2026; evaluasi kompetensi minimal setiap tahun dan setiap terjadi perubahan persyaratan atau penugasan.',
  tindakan = split_part(tindakan, E'\nTindak lanjut:', 1)
where id = 68 and pic like 'Sebelum penugasan audit%';

-- 3. Kegiatan 4
update kegiatan set sesi = (
  select jsonb_agg(case when e->>'tanggal' = '2026-10-23' then jsonb_set(e, '{tanggal}', '"2026-10-26"') else e end)
  from jsonb_array_elements(sesi::jsonb) e)
where no = 4 and sesi::text like '%2026-10-23%';

-- 4. Pencapaian November
update sasaran set pencapaian_riwayat = (
  select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements(pencapaian_riwayat) e where e->>'periode' <> '2026-11')
where pencapaian_riwayat::text like '%"2026-11"%';

-- 5. Penerangan: satu program, satu estimasi
update peluang set estimasi_kwh = null,
  deskripsi = concat_ws(' ', nullif(deskripsi, ''), 'Estimasi penghematan digabung ke P-02 (443 lampu yang sama, 164.790 kWh/tahun) agar tidak dihitung dua kali.')
where kode = 'P-10' and estimasi_kwh is not null;
update rencana_aksi set estimasi_hemat_kwh = null,
  catatan = concat_ws(' ', nullif(catatan, ''), 'Estimasi penghematan digabung ke RT-01 (443 lampu yang sama) agar tidak dihitung dua kali.')
where kode = 'RT-05' and estimasi_hemat_kwh is not null;

-- 6. Alasan SEU dari bacaan meter 2025 (9 meter = 5.168.210,8 kWh)
update seu set alasan = 'Sekitar 55% listrik KINRA 2025 (meter KINRA-MTR-005 + KINRA-MTR-008: 2.829.970 kWh dari 5.168.211 kWh). Beban pompa bervariasi dengan volume air, sehingga ada potensi penghematan melalui pengaturan operasi, VSD, dan penggantian pompa intake (110 kW ke 37 kW, Okt 2026).'
where kode = 'SEU-01';
update seu set alasan = 'Sekitar 39% listrik KINRA 2025 (meter KINRA-MTR-004: 2.001.848 kWh dari 5.168.211 kWh), beroperasi 24 jam. Variabel relevan: debit air limbah masuk IPAL I (air_ipal_inlet; data 2024 – Okt 2026; IPAL II tidak dikelola KINRA sehingga tidak termasuk). Kinerja dipantau dengan ENPI-06 (rasio kWh/m³ air limbah masuk IPAL I, baseline 2025).'
where kode = 'SEU-02';

-- 7. Berkas yang bukan versi sah
update berkas set sah = false, sah_oleh = null, sah_at = null
where sah and id in (
  'd58a2a33-ba93-43d8-a1de-449426a47a6a', -- SOP-005 Formulir Tim Energi: template kosong
  '4daa85b4-be2f-46c2-bde7-f045d0f54fe2', -- SOP-006 Formulir Risiko: hanya baris contoh
  '9489b801-b67b-4b27-ae51-6a1ff2c5d277', -- SOP-006 Formulir Peluang: kosong
  'e7cae358-9b1a-4c05-af2c-72fa84aeeb0a', -- R-9.1-01 Pemantauan: template, ambang "____"
  'ec7198ec-293d-4b81-ae48-ba7141f06d8e', -- R-6.5-01 Formulir EnPI & Baseline: salinan template
  'cecabf09-2c3d-4404-aa77-362d99946608', -- R-6.5-01 Formulir Pengumpulan Data: template
  'e9bb3125-1e60-4b7a-8651-a8f8e7b6a8e9', -- R-6.5-01 PDF template
  '6a1974f7-77e8-497a-97e0-a6d218618c3c', -- R-9.3-01 Notulen RTM: agenda generik, tanpa keputusan
  'cc7cb6cc-3dd9-439f-a50c-47f9d68ec686', -- R-9.3-01 Slide RTM: "[data aktual]"
  '73159c77-4478-4468-9294-877966bd0d2d', -- R-7.2-01 Matriks kompetensi: Actual = Target
  '28185cdd-3b7c-4533-b9d3-7f4b9d545344', -- S.K 7.2 Matriks kompetensi: Actual = Target
  '3e8a3ed4-5589-4c61-9b28-2e979d37eb7f', -- R-6.3-02: identik dengan R-6.3-01 (salah unggah)
  '0cf3df76-35a7-4ce8-93cb-d3cb358f12e9', -- F-8.1-01: berisi Formulir Pengendalian Operasional (salah unggah)
  'f83495e0-663a-4e65-a499-84f15066a50b', -- SOP-010: berisi SOP EnPI, bukan SOP Baseline
  '4f99494f-7163-46be-92b6-440dcbf59e7d', -- F-7.5-11: formulir SOP-013, bukan formulir SMM&LK3
  '67b17e3c-c4f3-4485-bff6-8bfa24b10886', -- F-7.5-14: idem
  'ab09ba0d-778e-4972-b36b-aa5dd962c240', -- F-7.5-15: idem
  '0b213735-a9dc-4d43-886d-df782bfa0f1d', -- F-7.5-15: idem
  '4b95c4c8-4bc6-4c45-be02-152db0b06d5b', -- F-7.5-15: idem
  '882ef8fd-b038-4496-8752-d27dffd94c6d', -- F-7.5-16: idem
  '490889fa-8f9a-420d-b360-7ecfbdadac90', -- F-7.5-02: Daftar Dokumen Eksternal (salah unggah)
  '2b071e1c-4a24-4f3d-9896-7f95cc0a586b'  -- F-4.3-01: teks masih "draf", tanpa lampiran meter
);
