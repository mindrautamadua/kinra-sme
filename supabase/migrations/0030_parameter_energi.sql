-- Parameter konversi energi ke rupiah dan emisi CO2, ditampilkan di Energi, Kinerja, Sasaran, Tinjauan, dan ringkasan direksi.
-- Nilai berstatus 'Asumsi' harus diverifikasi (mis. faktor emisi grid dari KESDM, harga BBM dari tagihan pemasok).
--
-- Hak akses: baca semua peran; ubah admin & konsultan; tambah/hapus admin.
-- Jalankan setelah 0006. Aman diulang: nilai yang sudah diubah dari aplikasi tidak ditimpa.

create table if not exists parameter_energi (
  kode       text primary key check (kode ~ '^[a-z0-9_]+$'),
  nama       text not null,
  nilai      numeric not null check (nilai >= 0),
  satuan     text not null,
  status     text not null default 'Asumsi' check (status in ('Data', 'Asumsi')),
  sumber     text,
  urutan     int not null default 0,
  diubah_at  timestamptz not null default now()
);

alter table parameter_energi enable row level security;
drop policy if exists baca on parameter_energi;
create policy baca on parameter_energi for select to anon, authenticated using ((select peran_sesi()) is not null);
drop policy if exists tambah on parameter_energi;
create policy tambah on parameter_energi for insert to anon, authenticated with check ((select peran_sesi()) = 'admin');
drop policy if exists ubah on parameter_energi;
create policy ubah on parameter_energi for update to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,konsultan}'::text[])) with check ((select peran_sesi()) = any ('{admin,konsultan}'::text[]));
drop policy if exists hapus on parameter_energi;
create policy hapus on parameter_energi for delete to anon, authenticated using ((select peran_sesi()) = 'admin');

insert into parameter_energi (kode, nama, nilai, satuan, status, sumber, urutan) values
  ('tarif_listrik', 'Tarif listrik rata-rata', 1122.08, 'Rp/kWh', 'Data',
   'Rasio biaya listrik terhadap kWh pada data inventaris aset Bagian M/E (sama untuk semua aset). Perbarui bila tarif PLN berubah.', 1),
  ('ef_listrik', 'Faktor emisi listrik grid', 0.85, 'kg CO₂/kWh', 'Asumsi',
   'Perkiraan faktor emisi grid. Ganti dengan faktor emisi grid Sumatera terbaru yang diterbitkan KESDM.', 2),
  ('harga_dexlite', 'Harga BBM Dexlite', 13500, 'Rp/liter', 'Asumsi',
   'Perkiraan harga. Ganti dengan harga rata-rata pada tagihan pemasok.', 3),
  ('ef_dexlite', 'Faktor emisi BBM solar/Dexlite', 2.68, 'kg CO₂/liter', 'Asumsi',
   'Faktor emisi umum pembakaran solar (default IPCC). Verifikasi dengan pedoman inventarisasi GRK yang dipakai perusahaan.', 4)
on conflict (kode) do nothing;
