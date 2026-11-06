-- Pisahkan energi lingkup SMEn KINRA dari energi kawasan (termasuk tenant).
--
-- Dasar: Ruang Lingkup & Batasan EnMS (001/MN-002/KINRA/SMEn/X/2026) menyatakan fasilitas dan proses
-- produksi tenant tidak otomatis termasuk lingkup. Data PLN di energi_bulanan adalah total sambungan
-- kawasan termasuk tenant (dikonfirmasi Bagian M/E), sehingga tidak dapat menjadi dasar klaim kinerja SMEn.
--
-- Perubahan:
--   1) enpi.lingkup: 'kinra' (dalam kendali KINRA, dasar klaim kinerja) atau 'kawasan' (konteks, termasuk tenant).
--   2) enpi.meter_kode: EnPI dapat diukur dari bacaan stand meter (tabel pembacaan_meter, migrasi 0022)
--      alih-alih dari energi_bulanan kawasan.
--   3) EnPI-04 listrik pemakaian sendiri KINRA (semua meter aset) dan EnPI-05 intensitas energi WTP (kWh/m³).
--      Baseline keduanya menunggu 12 bulan bacaan meter (Nov 2026 s.d. Okt 2027).
--   4) EnPI-02 dan EnPI-03 ditandai lingkup kawasan; EnPI utama dipindah ke EnPI-04.
--
-- Jalankan setelah 0022 dan 0025. Aman diulang.

alter table enpi add column if not exists lingkup text not null default 'kinra';
alter table enpi drop constraint if exists enpi_lingkup_check;
alter table enpi add constraint enpi_lingkup_check check (lingkup in ('kinra', 'kawasan'));
alter table enpi add column if not exists meter_kode text[] not null default '{}';

-- EnPI berbasis sumber listrik kawasan = konteks kawasan
update enpi set lingkup = 'kawasan'
where sumber_kode && '{pln,pltbg,plts}'::text[] and cardinality(meter_kode) = 0;

update enpi set catatan = concat_ws(' ', nullif(catatan, ''),
  'LINGKUP KAWASAN: data PLN mencakup listrik tenant, sehingga EnPI ini hanya konteks dan bahan koordinasi dengan tenant (peluang P-09), bukan dasar klaim kinerja SMEn KINRA.')
where kode in ('ENPI-02', 'ENPI-03') and coalesce(catatan, '') not like '%LINGKUP KAWASAN%';

update sumber_energi set catatan = 'Total seluruh sambungan PLN kawasan, TERMASUK listrik tenant. Pemakaian sendiri KINRA diukur dari meter aset (halaman Aset & Meter).'
where kode = 'pln';

-- EnPI lingkup KINRA berbasis meter
insert into enpi (kode, nama, sumber_kode, metode, variabel_kode, baseline_mulai, baseline_selesai, alasan_baseline, catatan, aktif, urutan, lingkup, meter_kode) values
  ('ENPI-04', 'Listrik pemakaian sendiri KINRA', '{pln}', 'absolut', '{}', '2026-11-01', '2027-10-01',
   '12 bulan pertama bacaan stand meter aset KINRA. Sebelumnya hanya ada data PLN kawasan yang mencakup tenant.',
   'Jumlah konsumsi semua meter aset KINRA (KINRA-MTR-001 s.d. 007). Bila meter bertambah, tambahkan ke daftar meter dan catat sebagai penyesuaian baseline (6.5).',
   true, 4, 'kinra', '{KINRA-MTR-001,KINRA-MTR-002,KINRA-MTR-003,KINRA-MTR-004,KINRA-MTR-005,KINRA-MTR-006,KINRA-MTR-007}'),
  ('ENPI-05', 'Intensitas energi WTP', '{pln}', 'rasio', '{air_olahan}', '2026-11-01', '2027-10-01',
   '12 bulan pertama bacaan stand meter WTP (KINRA-MTR-005).',
   'kWh meter WTP dibagi volume distribusi air WTP I. Calon SEU: WTP adalah pengguna listrik terbesar di antara aset KINRA. Pastikan meter KINRA-MTR-005 melayani WTP I; bila WTP II ikut dilayani, tambahkan volume WTP II ke variabel.',
   true, 5, 'kinra', '{KINRA-MTR-005}')
on conflict (kode) do nothing;

-- EnPI utama harus lingkup KINRA
update enpi set utama = false where utama and kode <> 'ENPI-04';
update enpi set utama = true where kode = 'ENPI-04';
