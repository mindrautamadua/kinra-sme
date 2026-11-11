-- Register aset gedung/fasilitas, meter energi, dan bacaan stand meter bulanan KINRA (PA-12; ISO 50001 klausul 6.3, 6.6, 9.1).
-- Sumber: "Daftar Aset dan Meter Energi.xlsx" (sheet Aset2 dan Data Meter).
--
-- Jalankan setelah 0007 (butuh peran_sesi(), nama_sesi(), dan sumber_energi). Aman diulang: data awal tidak menimpa baris yang sudah ada.

-- ---------------------------------------------------------------------------
-- Aset gedung & fasilitas
-- ---------------------------------------------------------------------------

create table if not exists aset (
  kode            text primary key check (kode ~ '^[A-Z0-9-]+$'),   -- 'KINRA-AST-001'
  no_urut         int  not null default 0,
  nama            text not null,
  area            text,                  -- kawasan induk bila berbeda dari nama (mis. 'Tank Farm')
  luas_m2         numeric check (luas_m2 >= 0),
  jumlah_lantai   int check (jumlah_lantai >= 0),
  jumlah_ruangan  int check (jumlah_ruangan >= 0),
  tahun_bangun    int check (tahun_bangun between 1950 and 2100),
  tanggal_bangun  text,                  -- 'YYYY-MM-DD' atau 'YYYY-MM' sesuai ketelitian data sumber
  fungsi          text,
  kondisi         text,
  luas_ac_m2      numeric check (luas_ac_m2 >= 0),
  kwh_bulan       numeric check (kwh_bulan >= 0),     -- konsumsi listrik per bulan (data awal inventaris)
  biaya_bulan     numeric check (biaya_bulan >= 0),   -- biaya listrik per bulan (Rp)
  jam_operasi     text,
  pic             text,
  catatan         text,
  diubah_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Register induk meter energi
-- ---------------------------------------------------------------------------

create table if not exists meter_energi (
  kode                  text primary key check (kode ~ '^[A-Z0-9-]+$'),   -- 'KINRA-MTR-001'
  no_urut               int  not null default 0,
  no_meter              text,                  -- nomor seri/ID meter di lapangan
  jenis                 text,                  -- merek/tipe alat ukur
  sumber_kode           text references sumber_energi(kode) on update cascade,
  lokasi                text,
  area_dilayani         text,
  aset_kode             text references aset(kode) on delete set null on update cascade,
  beban_diukur          text,
  pic_area              text,
  pic_data              text,
  satuan                text not null default 'kWh',
  faktor_kali           numeric not null default 1 check (faktor_kali > 0),   -- konsumsi = (stand akhir - stand awal) x faktor kali (CT/PT)
  kapasitas             text,
  kelas_akurasi         text,
  interval_pembacaan    text,
  frekuensi_pencatatan  text,
  status                text,
  kalibrasi_terakhir    date,
  kalibrasi_berikutnya  date,
  metode_pengiriman     text,
  penyimpanan_data      text,
  kandidat_seu          text,
  bukti_pendukung       text,
  catatan               text,
  diubah_at             timestamptz not null default now()
);

create index if not exists meter_energi_aset_idx on meter_energi (aset_kode);

-- ---------------------------------------------------------------------------
-- Bacaan stand meter bulanan. Konsumsi = (stand_akhir - stand_awal) x faktor_kali meter,
-- dihitung di aplikasi agar perubahan faktor kali langsung berlaku.
-- ---------------------------------------------------------------------------

create table if not exists pembacaan_meter (
  meter_kode   text not null references meter_energi(kode) on delete cascade on update cascade,
  tahun        int  not null check (tahun between 2020 and 2035),
  bulan        int  not null check (bulan between 1 and 12),
  stand_awal   numeric check (stand_awal >= 0),
  stand_akhir  numeric check (stand_akhir >= 0),
  catatan      text,
  diubah_oleh  text,
  diubah_at    timestamptz not null default now(),
  primary key (meter_kode, tahun, bulan)
);

-- Pencatat diisi dari sesi login, bukan dari aplikasi
create or replace function cap_pembacaan_meter() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.diubah_oleh := nama_sesi();
  new.diubah_at := now();
  return new;
end $$;

drop trigger if exists cap_pembacaan_meter on pembacaan_meter;
create trigger cap_pembacaan_meter before insert or update on pembacaan_meter
  for each row execute function cap_pembacaan_meter();

-- ---------------------------------------------------------------------------
-- RLS (baca: semua peran login; ubah: admin, konsultan, Tim KINRA; hapus: admin, Tim KINRA)
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['aset', 'meter_energi', 'pembacaan_meter'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists baca on %I', t);
    execute format('create policy baca on %I for select to anon, authenticated using ((select peran_sesi()) is not null)', t);
    execute format('drop policy if exists tambah on %I', t);
    execute format('create policy tambah on %I for insert to anon, authenticated with check ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[]))', t);
    execute format('drop policy if exists ubah on %I', t);
    execute format('create policy ubah on %I for update to anon, authenticated using ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[])) with check ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[]))', t);
    execute format('drop policy if exists hapus on %I', t);
    execute format('create policy hapus on %I for delete to anon, authenticated using ((select peran_sesi()) = any (''{admin,tim_kinra}''::text[]))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Data awal aset (40 baris, sheet Aset2)
-- ---------------------------------------------------------------------------

insert into aset (kode, no_urut, nama, area, luas_m2, jumlah_lantai, jumlah_ruangan, tahun_bangun, tanggal_bangun, fungsi, kondisi, luas_ac_m2, kwh_bulan, biaya_bulan, jam_operasi, pic) values
('KINRA-AST-001', 1, 'Bangunan Kantor Kawasan', null, 675, 2, 22, 2011, '2011-12-02', 'pusat kendali administrasi , manajemen operasional, pelayanan perizinan terpadu, dan pusat koordinasi tenant di seluruh KEK Sei Mangkei', 'Baik', 632.02, 12488, 14012535.04, '8 jam/hari', 'Bagian M/E'),
('KINRA-AST-002', 2, 'Gedung Kantor Damkar', null, 136.5, 1, 5, 2016, '2016-08-03', 'pos komando kesiapsiagaan bencana, pusat administrasi keselamatan kerja, dan ruang stasioner personel pemadam kebakaran', 'Baik', 128.54, 1487.8, 1669430.62, '8 jam/hari', 'Bagian M/E'),
('KINRA-AST-003', 3, 'Pembangunan Gudang Limbah Uk 8x6 M di PLTBS & WWTP', null, 96, 1, 1, 2018, '2018-10-31', 'Tempat Penampungan Sementara (TPS) penampung sisa operasional Pembangkit Listrik Tenaga Biomassa Sawit dan Instalasi Pengolahan Air Limbah, dirancang khusus untuk mengisolasi limbah sebelum dikelola lebih lanjut', 'Baik', 0, null, null, null, null),
('KINRA-AST-004', 4, 'Pusat Inovasi Kelapa Sawit', null, 96, 1, 1, 2021, '2021-12-31', 'laboratorium riset dan pengembangan teknologi kelapa sawit, sekaligus menyediakan area kantor administrator kawasan serta fasilitas ruang kerja bersama (co-working/temporary office) yang dimanfaatkan oleh beberapa tenan sebagai kantor sementara sebelum operasional penuh', 'Baik', 0, 4475.2, 5021532.41, null, 'Bagian M/E'),
('KINRA-AST-005', 5, 'WTP', null, null, 1, 4, 2007, '2007-12', 'instalasi pemurnian dan pengolahan air baku menjadi air bersih siap pakai sesuai standar spesifikasi industri', 'Baik', 0, 209744, 235349547.52, null, 'Bagian M/E'),
('KINRA-AST-006', 6, 'Garasi Damkar', null, 301.6, 1, 4, 2016, '2016-08', 'hanggar perlindungan armada mobil pemadam kebakaran untuk menjaga kesiapan operasional taktis setiap saat.', 'Baik', 0, null, null, null, null),
('KINRA-AST-007', 7, 'Parkir Roda Dua Damkar', null, 301.6, 1, 3, 2016, '2016-08', 'Area khusus yang dialokasikan untuk penataan kendaraan roda dua untuk mobilitas internal personel pemadam', 'Baik', 0, null, null, null, null),
('KINRA-AST-008', 8, 'Bangunan Gardu Hubung SM1', null, 50, 1, 1, 2016, '2016-07-02', 'Berfungsi sebagai infrastruktur pembagi dan penyalur daya listrik tegangan menengah dari pusat pembangkit ke sub-sektor', 'Baik', 0, null, null, null, null),
('KINRA-AST-009', 9, 'Gardu Hubung Utama 8x18', null, 144, 2, 6, 2017, '2017-05-06', 'Berfungsi sebagai gardu pusat pembagi dan pemutus daya listrik utama yang mendistribusikan energi ke seluruh jaringan distribusi kawasan', 'Baik', 0, null, null, null, null),
('KINRA-AST-010', 10, 'Gardu Hubung (MK2) UK. 10,5 x 5,5 M', null, 57.75, 1, 1, 2020, '2020-11-30', 'Berfungsi sebagai gardu pusat pembagi dan pemutus daya listrik utama yang mendistribusikan energi ke seluruh jaringan distribusi kawasan', 'Baik', 0, null, null, null, null),
('KINRA-AST-011', 11, 'Gardu Transaksi Ukuran 4,25 x 4,5 Untuk PT. Aice', null, 19.125, 1, 1, 2020, '2020-11-30', 'Berfungsi sebagai gardu pusat pembagi dan pemutus daya listrik utama yang mendistribusikan energi ke tenant', 'Baik', 0, null, null, null, null),
('KINRA-AST-012', 12, 'Gardu Hubung MK-5 Uk. 10,5 x 5,5 m', null, 57.75, 1, 1, 2022, '2022-06-30', 'Berfungsi sebagai gardu pusat pembagi dan pemutus daya listrik utama yang mendistribusikan energi ke tenant', 'Baik', 0, null, null, null, null),
('KINRA-AST-013', 13, 'Gardu Transaksi PT Alliance Uk 4,25 x 4,5 m', null, 19.125, 1, 1, 2022, '2022-06-30', 'Berfungsi sebagai gardu pusat pembagi dan pemutus daya listrik utama yang mendistribusikan energi ke tenant', 'Baik', 0, null, null, null, null),
('KINRA-AST-014', 14, 'Pos Jaga Kawasan', null, 9, 1, 1, 2011, '2011-12-02', 'Mengontrol dan memeriksa keluar-masuknya orang, tamu, kendaraan, serta barang di Kawasan', 'Baik', 0, null, null, null, null),
('KINRA-AST-015', 15, 'Pos Satpam', null, 16, 1, 2, 2012, '2012-10-01', 'Menjadi titik kontak pertama bagi tamu yang ingin bertanya arah, keperluan, atau mendata identitas pengunjung', 'Baik', 0, null, null, null, null),
('KINRA-AST-016', 16, 'Gardu Jaga/Pos Satpam Damkar', null, 26.7, 1, 2, 2016, '2016-08-02', 'Mengawasi situasi sekitar melalui pantauan langsung untuk mencegah tindak kejahatan atau gangguan ketertiban', 'Baik', 0, null, null, null, null),
('KINRA-AST-017', 17, 'Bangunan Kantor WWTP', null, 180, 1, 9, 2016, '2016-12', 'sebagai pusat administrasi, pengawasan, dan pengendalian operasional sistem pengolahan air limbah', 'Baik', 112.11, null, null, null, null),
('KINRA-AST-018', 18, 'Bangunan Gedung Genset', null, 120, 1, 1, 2016, '2016-12', 'sebagai sumber listrik cadangan yang aman dan andal saat suplai listrik utama padam', 'Baik', 0, null, null, null, null),
('KINRA-AST-019', 19, 'WWTP', null, 15, 1, 2, 2016, '2016-12', 'mengolah air limbah industri agar aman saat dialirkan kembali ke lingkungan', 'Baik', 0, 171552, 192495068.16, '24 jam/hari', 'Bagian M/E'),
('KINRA-AST-020', 20, 'Penggunaan TPS (Gudang ) Limbah B3', null, 48, 1, 1, 2018, '2018-08-31', 'sebagai lokasi penampungan aman bagi limbah B3 sebelum diserahkan kepada pihak pengolah, pemanfaat, atau penimbun berizin', 'Baik', 0, null, null, null, null),
('KINRA-AST-021', 21, 'Pembangunan Baru Gudang Limbah Uk. 8 x 6 M', null, 48, 1, 1, 2018, '2018-09-30', 'sebagai lokasi penampungan aman bagi limbah B3 sebelum diserahkan kepada pihak pengolah, pemanfaat, atau penimbun berizin', 'Baik', 0, null, null, null, null),
('KINRA-AST-022', 22, 'Power House', null, 336, 1, 1, 2011, '2011-12', null, 'Baik', 0, null, null, null, null),
('KINRA-AST-023', 23, 'Ruang Kontrol', null, 100, 1, 1, 2011, '2011-12', null, 'Baik', 0, null, null, null, null),
('KINRA-AST-024', 24, 'Bangunan Kantor PLTBS', null, 1174, 2, 0, 2011, '2011-12', null, 'Baik', 0, null, null, null, null),
('KINRA-AST-025', 25, 'Gudang Material', null, 144, 1, 1, 2012, '2012-12', null, 'Baik', 0, null, null, null, null),
('KINRA-AST-026', 26, 'Gedung Bengkel', null, 266, 1, 1, 2011, '2011-12', null, 'Baik', 0, null, null, null, null),
('KINRA-AST-027', 27, 'Bangunan Mushollah Uk. 4 x 4 m', null, 16, 1, 1, 2014, '2014-12', null, 'Baik', 0, null, null, null, null),
('KINRA-AST-028', 28, 'Pos Satpam Uk. 3 x 3 Mtr', null, 9, 1, 2, 2012, '2012-12', null, 'Baik', 0, null, null, null, null),
('KINRA-AST-029', 29, 'Gardu Transaksi PT Sheel Oil Indonesia UK.4,25x4,5 M', null, 19.125, 1, 1, 2023, '2023-04-30', null, 'Baik', 0, null, null, null, null),
('KINRA-AST-030', 30, 'Gardu Transaksi PT All Cosmos Biotek UK.4,25x4,5 M', null, 19.125, 1, 1, 2023, '2023-04-30', null, 'Baik', 0, null, null, null, null),
('KINRA-AST-031', 31, 'Gardu Transaksi PT Sime Darby Oils UK.4,25x4,5 M', null, 19.125, 1, 1, 2023, '2023-04-30', null, 'Baik', 0, null, null, null, null),
('KINRA-AST-032', 32, 'Pos Pelayanan Bea Cukai sisi timur', null, 47.55, 1, 2, 2023, '2023-12-31', 'Tempat penyerahan, pengecekan, dan pemrosesan dokumen kepabeanan (seperti Customs Declaration) bagi penumpang, kru, atau barang yang masuk/keluar melalui terminal atau jalur logistik sisi timur', 'Baik', 47.55, 58.9, 66090.51, null, 'Bagian M/E'),
('KINRA-AST-033', 33, 'Pembangunan Baru Gardu Pengukuran PLN', null, 0, 1, 1, 2024, '2024-09-30', null, 'Baik', 0, null, null, null, null),
('KINRA-AST-034', 34, 'Pos Pelayanan Bea Cukai Sisi Barat', null, 47.55, 1, 2, 2025, '2025-10-31', 'Tempat penyerahan, pengecekan, dan pemrosesan dokumen kepabeanan (seperti Customs Declaration) bagi penumpang, kru, atau barang yang masuk/keluar melalui terminal atau jalur logistik sisi barat', 'Baik', 47.55, 138.6, 155856.91, null, 'Bagian M/E'),
('KINRA-AST-035', 35, 'Kantor Tank Farm', 'Tank Farm', 275, 2, 14, null, null, 'sebagai pusat kendali administrasi, pengawasan operasional untuk seluruh aktivitas penyimpanan di area tank farm', 'Baik', 0, null, null, null, null),
('KINRA-AST-036', 36, 'Pos Security 1', 'Tank Farm', 53, 1, 1, null, null, 'sebagai pusat pengawasan, pengendalian akses, dan perlindungan aset di Tank Farm', 'Baik', 0, null, null, null, null),
('KINRA-AST-037', 37, 'Pos Security 2', 'Tank Farm', 53, 1, 1, null, null, 'sebagai pusat pengawasan, pengendalian akses, dan perlindungan aset di Tank Farm', 'Baik', 0, null, null, null, null),
('KINRA-AST-038', 38, 'Ruang Tunggu Depan', 'Tank Farm', 112, 1, 1, null, null, 'sebagai area penerima, penyaring, dan transisi sebelum tamu atau pengunjung memasuki kantor Tank Farm', 'Baik', 0, null, null, null, null),
('KINRA-AST-039', 39, 'Ruang Tunggu Belakang', 'Tank Farm', 36, 1, 1, null, null, 'sebagai area penerima, penyaring, dan transisi sebelum tamu atau pengunjung memasuki kantor Tank Farm', 'Baik', 0, null, null, null, null),
('KINRA-AST-040', 40, 'Ruang Boiler', 'Tank Farm', 895, 1, 2, null, null, 'sebagai pusat produksi uap (steam) dengan menggunakan energi panas dari pembakaran bahan bakar', 'Baik', 0, null, null, null, null)
on conflict (kode) do nothing;

-- ---------------------------------------------------------------------------
-- Data awal meter (sheet Data Meter; baris contoh template KINRA-MTR-001 "Diisi aktual" tidak dimuat).
-- Faktor kali dihitung dari sheet Layout Data Energi: konsumsi / (stand akhir - stand awal).
-- Bea Cukai 1 = sisi timur dan Bea Cukai 2 = sisi barat, dicocokkan dari besaran kWh di sheet Aset2.
-- ---------------------------------------------------------------------------

insert into meter_energi (kode, no_urut, no_meter, jenis, sumber_kode, lokasi, area_dilayani, aset_kode, satuan, faktor_kali, kelas_akurasi, frekuensi_pencatatan, metode_pengiriman) values
('KINRA-MTR-001', 1, '215267015',  'Edmi MK10E', 'pln', 'Graha',         'Kantor Graha',  'KINRA-AST-001', 'kWh', 80,  '0,5 S, 3 phasa', 'Bulanan', 'Manual'),
('KINRA-MTR-002', 2, '213396492',  'Edmi MK10E', 'pln', 'Damkar',        'Damkar',        'KINRA-AST-002', 'kWh', 20,  '1 S, 3 phasa',   'Bulanan', 'Manual'),
('KINRA-MTR-003', 3, '213397227',  'Edmi MK10E', 'pln', 'Pusat Inovasi', 'Pusat Inovasi', 'KINRA-AST-004', 'kWh', 80,  '1 S, 3 phasa',   'Bulanan', 'Manual'),
('KINRA-MTR-004', 4, '2115268991', 'Edmi MK10E', 'pln', 'WWTP',          'WWTP',          'KINRA-AST-019', 'kWh', 120, '0,5 S, 3 phasa', 'Bulanan', 'Manual'),
('KINRA-MTR-005', 5, '250392323',  'Edmi MK10E', 'pln', 'WTP',           'WTP',           'KINRA-AST-005', 'kWh', 200, 'Kelas 1, 3 phasa', 'Bulanan', 'Manual'),
('KINRA-MTR-006', 6, '6870',       'iMeter 310', 'pln', 'Bea Cukai 1',   'Bea Cukai 1',   'KINRA-AST-032', 'kWh', 1,   null,             'Bulanan', 'Manual'),
('KINRA-MTR-007', 7, 'Sn9887335',  'iMeter 310', 'pln', 'Bea Cukai 2',   'Bea Cukai 2',   'KINRA-AST-034', 'kWh', 1,   null,             'Bulanan', 'Manual')
on conflict (kode) do nothing;
