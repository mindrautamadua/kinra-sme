-- Rapikan tumpang tindih EnPI:
--   1) Penanda "EnPI utama" (satu saja) untuk judul halaman Ringkasan & Kinerja.
--   2) EnPI-01 diubah dari "total energi kawasan" (praktis sama dengan EnPI-02, BBM hanya 0,06% TJ)
--      menjadi EnPI BBM kendaraan operasional.
--   3) EnPI-03 (listrik ternormalisasi distribusi air) ditandai sebagai EnPI utama.
--
-- Jalankan setelah 0023. Aman diulang. EnPI-01 hanya diubah bila definisinya masih bawaan awal.

alter table enpi add column if not exists utama boolean not null default false;

create unique index if not exists enpi_satu_utama on enpi ((true)) where utama;

update enpi set
  nama = 'Konsumsi BBM kendaraan operasional',
  sumber_kode = '{dexlite}',
  alasan_baseline = 'Tahun penuh pertama dengan data BBM lengkap. Lingkup diubah dari total energi kawasan menjadi BBM saja karena porsi BBM hanya sekitar 0,06% dari total TJ, sehingga EnPI lama praktis sama dengan EnPI-02 (penyesuaian 6.5).',
  catatan = 'Dexlite untuk dump truck, sky lift, backhoe loader, road sweeper, dan damkar. Pertimbangkan variabel relevan seperti jam operasi atau km tempuh agar dapat dinormalisasi.',
  diubah_at = now()
where kode = 'ENPI-01' and sumber_kode = '{pln,pltbg,plts,dexlite}';

update enpi set utama = false where utama and kode <> 'ENPI-03';
update enpi set utama = true, aktif = true where kode = 'ENPI-03';
